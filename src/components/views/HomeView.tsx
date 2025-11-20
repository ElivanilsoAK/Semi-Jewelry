import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package2, Users, ShoppingBag, DollarSign, AlertCircle, TrendingUp, Award } from 'lucide-react';

interface Stats {
  totalClientes: number;
  panosAtivos: number;
  vendasMes: number;
  valorVendasMes: number;
  pagamentosPendentes: number;
  comissaoTotal: number;
}

interface ClienteRanking {
  id: string;
  nome: string;
  total: number;
}

export default function HomeView() {
  const [stats, setStats] = useState<Stats>({
    totalClientes: 0,
    panosAtivos: 0,
    vendasMes: 0,
    valorVendasMes: 0,
    pagamentosPendentes: 0,
    comissaoTotal: 0,
  });
  const [topCompradores, setTopCompradores] = useState<ClienteRanking[]>([]);
  const [topPagadores, setTopPagadores] = useState<ClienteRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientes, panos, vendas, pagamentos, comissoes, allClientes, allVendas, allPagamentos] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('panos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('vendas').select('valor_total').gte('data_venda', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('comissoes').select('valor_comissao'),
        supabase.from('clientes').select('*'),
        supabase.from('vendas').select('*'),
        supabase.from('pagamentos').select('*'),
      ]);

      const valorTotal = vendas.data?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0;
      const comissaoTotal = comissoes.data?.reduce((sum, c) => sum + Number(c.valor_comissao), 0) || 0;

      const clientesMap = new Map();
      (allClientes.data || []).forEach(c => {
        const clienteVendas = (allVendas.data || []).filter(v => v.cliente_id === c.id);
        const totalCompras = clienteVendas.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);
        const clientePagamentos = clienteVendas.flatMap(v => (allPagamentos.data || []).filter(p => p.venda_id === v.id));
        const pagamentosPontuais = clientePagamentos.filter(p => p.status === 'pago' && (!p.data_pagamento || new Date(p.data_pagamento) <= new Date(p.data_vencimento))).length;
        clientesMap.set(c.id, { id: c.id, nome: c.nome, totalCompras, pagamentosPontuais });
      });

      const rankingCompras = Array.from(clientesMap.values()).sort((a, b) => b.totalCompras - a.totalCompras).slice(0, 5).map(c => ({ id: c.id, nome: c.nome, total: c.totalCompras }));
      const rankingPagamentos = Array.from(clientesMap.values()).sort((a, b) => b.pagamentosPontuais - a.pagamentosPontuais).slice(0, 5).map(c => ({ id: c.id, nome: c.nome, total: c.pagamentosPontuais }));

      setStats({
        totalClientes: clientes.count || 0,
        panosAtivos: panos.count || 0,
        vendasMes: vendas.data?.length || 0,
        valorVendasMes: valorTotal,
        pagamentosPendentes: pagamentos.count || 0,
        comissaoTotal,
      });
      setTopCompradores(rankingCompras);
      setTopPagadores(rankingPagamentos);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total de Clientes', value: stats.totalClientes, icon: Users, color: 'bg-blue-500' },
    { title: 'Panos Ativos', value: stats.panosAtivos, icon: Package2, color: 'bg-emerald-500' },
    { title: 'Vendas Este Mês', value: stats.vendasMes, icon: ShoppingBag, color: 'bg-amber-500' },
    { title: 'Valor Vendas Mês', value: `R$ ${stats.valorVendasMes.toFixed(2)}`, icon: DollarSign, color: 'bg-green-500' },
    { title: 'Comissão Total', value: `R$ ${stats.comissaoTotal.toFixed(2)}`, icon: TrendingUp, color: 'bg-purple-500' },
    { title: 'Pagamentos Pendentes', value: stats.pagamentosPendentes, icon: AlertCircle, color: 'bg-red-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-medium">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-charcoal mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-line p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-charcoal">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-gold-ak" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Top 5 - Quem Compra Mais</h2>
          </div>
          <div className="space-y-3">
            {topCompradores.map((cliente, idx) => (
              <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-medium text-charcoal">{cliente.nome}</span>
                </div>
                <span className="font-bold text-gold-ak">R$ {cliente.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Top 5 - Quem Paga Bem</h2>
          </div>
          <div className="space-y-3">
            {topPagadores.map((cliente, idx) => (
              <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-medium text-charcoal">{cliente.nome}</span>
                </div>
                <span className="font-bold text-blue-600">{cliente.total} pagamentos</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

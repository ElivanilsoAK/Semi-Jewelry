import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package2, Users, ShoppingBag, DollarSign, AlertCircle } from 'lucide-react';

interface Stats {
  totalClientes: number;
  panosAtivos: number;
  vendasMes: number;
  valorVendasMes: number;
  pagamentosPendentes: number;
}

export default function HomeView() {
  const [stats, setStats] = useState<Stats>({
    totalClientes: 0,
    panosAtivos: 0,
    vendasMes: 0,
    valorVendasMes: 0,
    pagamentosPendentes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientes, panos, vendas, pagamentos] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('panos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('vendas').select('valor_total').gte('data_venda', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      ]);

      const valorTotal = vendas.data?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0;

      setStats({
        totalClientes: clientes.count || 0,
        panosAtivos: panos.count || 0,
        vendasMes: vendas.data?.length || 0,
        valorVendasMes: valorTotal,
        pagamentosPendentes: pagamentos.count || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Clientes',
      value: stats.totalClientes,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Panos Ativos',
      value: stats.panosAtivos,
      icon: Package2,
      color: 'bg-emerald-500',
    },
    {
      title: 'Vendas Este Mês',
      value: stats.vendasMes,
      icon: ShoppingBag,
      color: 'bg-amber-500',
    },
    {
      title: 'Valor Vendas Mês',
      value: `R$ ${stats.valorVendasMes.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Pagamentos Pendentes',
      value: stats.pagamentosPendentes,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
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

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Bem-vindo ao Sistema de Semi-Joias
        </h2>
        <div className="space-y-3 text-gray-600">
          <p>
            Este sistema permite gerenciar suas vendas de semi-joias de forma completa:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Cadastro e gerenciamento de clientes</li>
            <li>Controle de panos com datas de retirada e devolução</li>
            <li>Registro de vendas com controle de estoque automático</li>
            <li>Gestão de pagamentos parcelados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

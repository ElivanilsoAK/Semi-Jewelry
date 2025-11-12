import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Award, DollarSign } from 'lucide-react';

interface ClienteStats {
  id: string;
  nome: string;
  total_compras: number;
  total_vendas: number;
  pagamentos_pontuais: number;
  categoria: string;
}

export default function ClientesAnalyticsView() {
  const [clientesStats, setClientesStats] = useState<ClienteStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: clientes } = await supabase.from('clientes').select('*');
      const { data: vendas } = await supabase.from('vendas').select('*');
      const { data: pagamentos } = await supabase.from('pagamentos').select('*');

      const stats = (clientes || []).map(cliente => {
        const clienteVendas = vendas?.filter(v => v.cliente_id === cliente.id) || [];
        const totalCompras = clienteVendas.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);

        const clientePagamentos = clienteVendas.flatMap(v =>
          pagamentos?.filter(p => p.venda_id === v.id) || []
        );
        const pagamentosPontuais = clientePagamentos.filter(
          p => p.status === 'pago' && (!p.data_pagamento || new Date(p.data_pagamento) <= new Date(p.data_vencimento))
        ).length;

        let categoria = 'bronze';
        if (totalCompras >= 10000) categoria = 'platina';
        else if (totalCompras >= 5000) categoria = 'ouro';
        else if (totalCompras >= 2000) categoria = 'prata';

        return {
          id: cliente.id,
          nome: cliente.nome,
          total_compras: totalCompras,
          total_vendas: clienteVendas.length,
          pagamentos_pontuais: pagamentosPontuais,
          categoria
        };
      });

      setClientesStats(stats);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const topCompradores = [...clientesStats].sort((a, b) => b.total_compras - a.total_compras).slice(0, 10);
  const melhoresPagadores = [...clientesStats].sort((a, b) => b.pagamentos_pontuais - a.pagamentos_pontuais).slice(0, 10);

  const getCategoryColor = (cat: string) => {
    const colors = { platina: 'bg-gradient-to-r from-gray-400 to-gray-600', ouro: 'bg-gradient-to-r from-yellow-400 to-yellow-600', prata: 'bg-gradient-to-r from-gray-300 to-gray-500', bronze: 'bg-gradient-to-r from-orange-400 to-orange-600' };
    return colors[cat as keyof typeof colors];
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Análise de Clientes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Top 10 Compradores</h2>
          </div>
          <div className="space-y-3">
            {topCompradores.map((cliente, idx) => (
              <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">#{idx + 1}</span>
                  <div>
                    <p className="font-medium text-gray-800">{cliente.nome}</p>
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getCategoryColor(cliente.categoria)}`}>
                      {cliente.categoria.toUpperCase()}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-emerald-600">R$ {cliente.total_compras.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Melhores Pagadores</h2>
          </div>
          <div className="space-y-3">
            {melhoresPagadores.map((cliente, idx) => (
              <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">#{idx + 1}</span>
                  <p className="font-medium text-gray-800">{cliente.nome}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{cliente.pagamentos_pontuais} pagamentos</p>
                  <p className="text-xs text-gray-500">no prazo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100 p-3 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Todos os Clientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cliente</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoria</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Compras</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Nº Vendas</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pagamentos OK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientesStats.map(cliente => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{cliente.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getCategoryColor(cliente.categoria)}`}>
                      {cliente.categoria.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">
                    R$ {cliente.total_compras.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{cliente.total_vendas}</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600">{cliente.pagamentos_pontuais}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

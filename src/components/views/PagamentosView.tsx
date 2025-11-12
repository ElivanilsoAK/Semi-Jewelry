import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Pagamento {
  id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  venda: {
    cliente: {
      nome: string;
    };
  };
}

export default function PagamentosView() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'pago' | 'atrasado'>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPagamentos();
  }, []);

  const loadPagamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('pagamentos')
        .select(`
          *,
          venda:vendas(
            cliente:clientes(nome)
          )
        `)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setPagamentos(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPago = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pagamentos')
        .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
      await loadPagamentos();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar pagamento');
    }
  };

  const getStatusInfo = (pagamento: Pagamento) => {
    if (pagamento.status === 'pago') {
      return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Pago' };
    }
    const hoje = new Date();
    const vencimento = new Date(pagamento.data_vencimento);
    if (vencimento < hoje) {
      return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Atrasado' };
    }
    return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pendente' };
  };

  const filteredPagamentos = pagamentos.filter(p => {
    if (filter === 'todos') return true;
    if (filter === 'pago') return p.status === 'pago';
    if (filter === 'pendente') return p.status === 'pendente' && new Date(p.data_vencimento) >= new Date();
    if (filter === 'atrasado') return p.status === 'pendente' && new Date(p.data_vencimento) < new Date();
    return true;
  });

  const totals = {
    todos: pagamentos.length,
    pendente: pagamentos.filter(p => p.status === 'pendente' && new Date(p.data_vencimento) >= new Date()).length,
    pago: pagamentos.filter(p => p.status === 'pago').length,
    atrasado: pagamentos.filter(p => p.status === 'pendente' && new Date(p.data_vencimento) < new Date()).length,
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Acompanhamento de Pagamentos</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['todos', 'pendente', 'atrasado', 'pago'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`p-4 rounded-xl border-2 transition-all ${
              filter === status
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-800">{totals[status]}</p>
            <p className="text-sm text-gray-600 capitalize">{status}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cliente</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Parcela</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vencimento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPagamentos.map(pagamento => {
                const statusInfo = getStatusInfo(pagamento);
                const Icon = statusInfo.icon;

                return (
                  <tr key={pagamento.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {pagamento.venda?.cliente?.nome || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Parcela {pagamento.numero_parcela}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                      R$ {parseFloat(pagamento.valor_parcela).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(pagamento.data_vencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 ${statusInfo.color}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{statusInfo.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pagamento.status === 'pendente' && (
                        <button
                          onClick={() => handleMarcarPago(pagamento.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                        >
                          Marcar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase, Venda, Cliente, ItemVenda, ItemPano, Pagamento } from '../../lib/supabase';
import { X, CheckCircle } from 'lucide-react';

interface VendaComCliente extends Venda {
  cliente: Cliente;
}

interface ItemVendaCompleto extends ItemVenda {
  item_pano: ItemPano;
}

interface DetalhesVendaModalProps {
  venda: VendaComCliente;
  onClose: () => void;
}

export default function DetalhesVendaModal({ venda, onClose }: DetalhesVendaModalProps) {
  const [itensVenda, setItensVenda] = useState<ItemVendaCompleto[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetalhes();
  }, [venda.id]);

  const loadDetalhes = async () => {
    try {
      const [itensData, pagamentosData] = await Promise.all([
        supabase
          .from('itens_venda')
          .select(`
            *,
            item_pano:itens_pano(*)
          `)
          .eq('venda_id', venda.id),
        supabase
          .from('pagamentos')
          .select('*')
          .eq('venda_id', venda.id)
          .order('numero_parcela'),
      ]);

      if (itensData.data) setItensVenda(itensData.data);
      if (pagamentosData.data) setPagamentos(pagamentosData.data);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPagamento = async (pagamentoId: string, pago: boolean) => {
    try {
      const { error } = await supabase
        .from('pagamentos')
        .update({
          status: pago ? 'pago' : 'pendente',
          data_pagamento: pago ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', pagamentoId);

      if (error) throw error;

      await loadDetalhes();
      await atualizarStatusVenda();
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      alert('Erro ao atualizar pagamento');
    }
  };

  const atualizarStatusVenda = async () => {
    const { data: pagamentosAtualizados } = await supabase
      .from('pagamentos')
      .select('status')
      .eq('venda_id', venda.id);

    if (!pagamentosAtualizados) return;

    const todosOsPagamentosPagos = pagamentosAtualizados.every(p => p.status === 'pago');
    const algumPagamentoPago = pagamentosAtualizados.some(p => p.status === 'pago');

    let novoStatus: 'pago' | 'parcial' | 'pendente' = 'pendente';
    if (todosOsPagamentosPagos) {
      novoStatus = 'pago';
    } else if (algumPagamentoPago) {
      novoStatus = 'parcial';
    }

    await supabase
      .from('vendas')
      .update({ status_pagamento: novoStatus })
      .eq('id', venda.id);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    return status === 'pago' ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Detalhes da Venda</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Informações da Venda</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Cliente:</span> {venda.cliente.nome}
              </p>
              <p>
                <span className="font-medium">Data:</span> {formatDate(venda.data_venda)}
              </p>
              <p>
                <span className="font-medium">Valor Total:</span> R$ {Number(venda.valor_total).toFixed(2)}
              </p>
              {venda.observacoes && (
                <p>
                  <span className="font-medium">Observações:</span> {venda.observacoes}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Itens Vendidos</h3>
            <div className="space-y-2">
              {itensVenda.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 p-3 rounded-lg">
                  <p className="font-medium text-gray-800">{item.item_pano.descricao}</p>
                  <p className="text-sm text-gray-600">
                    {item.quantidade}x R$ {Number(item.valor_unitario).toFixed(2)} = R$ {Number(item.valor_total).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Pagamentos</h3>
            <div className="space-y-2">
              {pagamentos.map((pagamento) => (
                <div
                  key={pagamento.id}
                  className="bg-white border border-gray-200 p-4 rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      Parcela {pagamento.numero_parcela} de {pagamentos.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      Valor: R$ {Number(pagamento.valor_parcela).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Vencimento: {formatDate(pagamento.data_vencimento)}
                    </p>
                    {pagamento.data_pagamento && (
                      <p className="text-sm text-green-600">
                        Pago em: {formatDate(pagamento.data_pagamento)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${getStatusColor(pagamento.status)}`}>
                      {pagamento.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                    <button
                      onClick={() => handleMarcarPagamento(pagamento.id, pagamento.status === 'pendente')}
                      className={`p-2 rounded-lg transition-colors ${
                        pagamento.status === 'pago'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                      }`}
                      title={pagamento.status === 'pago' ? 'Marcar como pendente' : 'Marcar como pago'}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

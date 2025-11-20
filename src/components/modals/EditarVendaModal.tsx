import { useState, useEffect } from 'react';
import { supabase, Venda, ItemVenda } from '../../lib/supabase';
import { X, Save, Trash2, Plus, AlertTriangle } from 'lucide-react';

interface EditarVendaModalProps {
  venda: Venda;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

interface ItemEdit extends ItemVenda {
  deleted?: boolean;
}

export default function EditarVendaModal({ venda, onClose, onSave, onDelete }: EditarVendaModalProps) {
  const [formData, setFormData] = useState({
    cliente_nome: '',
    data_venda: '',
    observacoes: '',
    valor_total: 0,
  });
  const [itens, setItens] = useState<ItemEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setFormData({
      cliente_nome: venda.cliente_nome,
      data_venda: venda.data_venda,
      observacoes: venda.observacoes || '',
      valor_total: venda.valor_total,
    });
    loadItens();
  }, [venda]);

  async function loadItens() {
    const { data, error } = await supabase
      .from('itens_venda')
      .select('*')
      .eq('venda_id', venda.id);

    if (!error && data) {
      setItens(data);
    }
    setLoading(false);
  }

  function updateItem(index: number, field: keyof ItemVenda, value: any) {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };

    if (field === 'quantidade' || field === 'valor_unitario') {
      newItens[index].valor_total = newItens[index].quantidade * newItens[index].valor_unitario;
    }

    setItens(newItens);
    recalcularTotal(newItens);
  }

  function markItemAsDeleted(index: number) {
    const newItens = [...itens];
    newItens[index].deleted = true;
    setItens(newItens);
    recalcularTotal(newItens);
  }

  function recalcularTotal(items: ItemEdit[]) {
    const total = items
      .filter(item => !item.deleted)
      .reduce((sum, item) => sum + (item.valor_unitario * item.quantidade), 0);
    setFormData(prev => ({ ...prev, valor_total: total }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { error: vendaError } = await supabase
        .from('vendas')
        .update({
          cliente_nome: formData.cliente_nome,
          data_venda: formData.data_venda,
          observacoes: formData.observacoes,
          valor_total: formData.valor_total,
        })
        .eq('id', venda.id);

      if (vendaError) throw vendaError;

      const { data: itensOriginais } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', venda.id);

      for (const item of itens) {
        if (item.deleted && item.item_pano_id) {
          const itemOriginal = itensOriginais?.find(i => i.id === item.id);
          if (itemOriginal) {
            await supabase.rpc('increment_stock', {
              item_id: item.item_pano_id,
              amount: itemOriginal.quantidade
            });
          }

          await supabase
            .from('itens_venda')
            .delete()
            .eq('id', item.id);
        } else if (item.id && item.item_pano_id) {
          const itemOriginal = itensOriginais?.find(i => i.id === item.id);
          if (itemOriginal && itemOriginal.quantidade !== item.quantidade) {
            const diferenca = itemOriginal.quantidade - item.quantidade;

            if (diferenca > 0) {
              await supabase.rpc('increment_stock', {
                item_id: item.item_pano_id,
                amount: diferenca
              });
            } else if (diferenca < 0) {
              await supabase.rpc('decrement_stock', {
                item_id: item.item_pano_id,
                amount: Math.abs(diferenca)
              });
            }
          }

          await supabase
            .from('itens_venda')
            .update({
              descricao: item.descricao,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
            })
            .eq('id', item.id);
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;

    setSaving(true);
    try {
      const { data: itensVenda } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', venda.id);

      if (itensVenda) {
        for (const item of itensVenda) {
          if (item.item_pano_id) {
            await supabase.rpc('increment_stock', {
              item_id: item.item_pano_id,
              amount: item.quantidade
            });
          }
        }
      }

      await supabase.from('itens_venda').delete().eq('venda_id', venda.id);
      await supabase.from('pagamentos').delete().eq('venda_id', venda.id);
      const { error } = await supabase.from('vendas').delete().eq('id', venda.id);

      if (error) throw error;

      onDelete();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir venda');
    } finally {
      setSaving(false);
    }
  }

  const itensAtivos = itens.filter(item => !item.deleted);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Editar Venda</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data da Venda
                </label>
                <input
                  type="date"
                  value={formData.data_venda}
                  onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
                className="input-field"
                placeholder="Observações sobre a venda..."
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Itens da Venda</h4>
                <div className="text-lg font-bold text-green-600">
                  Total: R$ {formData.valor_total.toFixed(2)}
                </div>
              </div>

              <div className="space-y-3">
                {itensAtivos.map((item, index) => {
                  const realIndex = itens.indexOf(item);
                  return (
                    <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-5">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Descrição
                          </label>
                          <input
                            type="text"
                            value={item.descricao}
                            onChange={(e) => updateItem(realIndex, 'descricao', e.target.value)}
                            className="input-field text-sm"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => updateItem(realIndex, 'quantidade', parseInt(e.target.value))}
                            className="input-field text-sm"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Valor Unit. (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor_unitario}
                            onChange={(e) => updateItem(realIndex, 'valor_unitario', parseFloat(e.target.value))}
                            className="input-field text-sm"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Total
                          </label>
                          <div className="input-field text-sm font-semibold bg-gray-100">
                            R$ {item.valor_total.toFixed(2)}
                          </div>
                        </div>

                        <div className="md:col-span-1 flex items-end">
                          <button
                            type="button"
                            onClick={() => markItemAsDeleted(realIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {itensAtivos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum item na venda</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        )}

        <div className="p-6 border-t border-gray-200 flex gap-3">
          {onDelete && (
            <>
              {showDeleteConfirm ? (
                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusão
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-secondary text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Venda
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="btn-primary flex-1"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

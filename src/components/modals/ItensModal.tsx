import { useState, useEffect } from 'react';
import { supabase, Pano, ItemPano, withUserId } from '../../lib/supabase';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

interface ItensModalProps {
  pano: Pano;
  onClose: () => void;
}

const CATEGORIAS = [
  'argola',
  'infantil',
  'pulseira',
  'colar',
  'brinco',
  'anel',
  'tornozeleira',
  'pingente',
  'conjunto',
  'outro',
] as const;

export default function ItensModal({ pano, onClose }: ItensModalProps) {
  const [itens, setItens] = useState<ItemPano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPano | null>(null);

  const [formData, setFormData] = useState({
    categoria: 'argola' as typeof CATEGORIAS[number],
    descricao: '',
    quantidade_inicial: 0,
    valor_unitario: 0,
  });

  useEffect(() => {
    loadItens();
  }, [pano.id]);

  const loadItens = async () => {
    try {
      const { data, error } = await supabase
        .from('itens_pano')
        .select('*')
        .eq('pano_id', pano.id)
        .order('categoria');

      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('itens_pano')
          .update({
            categoria: formData.categoria,
            descricao: formData.descricao,
            valor_unitario: formData.valor_unitario,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const dataWithUserId = await withUserId({
            pano_id: pano.id,
            ...formData,
            quantidade_disponivel: formData.quantidade_inicial,
          });
        const { error } = await supabase
          .from('itens_pano')
          .insert([dataWithUserId]);

        if (error) throw error;
      }

      resetForm();
      loadItens();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      alert('Erro ao salvar item');
    }
  };

  const handleEdit = (item: ItemPano) => {
    setEditingItem(item);
    setFormData({
      categoria: item.categoria,
      descricao: item.descricao,
      quantidade_inicial: item.quantidade_inicial,
      valor_unitario: Number(item.valor_unitario),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('itens_pano')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadItens();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      alert('Erro ao excluir item');
    }
  };

  const resetForm = () => {
    setFormData({
      categoria: 'argola',
      descricao: '',
      quantidade_inicial: 0,
      valor_unitario: 0,
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const totalItens = itens.reduce((sum, item) => sum + item.quantidade_disponivel, 0);
  const valorTotal = itens.reduce((sum, item) => sum + (item.quantidade_disponivel * Number(item.valor_unitario)), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Itens do Pano: {pano.nome}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Total: {totalItens} itens | Valor: R$ {valorTotal.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mb-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Adicionar Item
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as typeof CATEGORIAS[number] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent capitalize"
                    required
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat} className="capitalize">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingItem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      value={formData.quantidade_inicial}
                      onChange={(e) => setFormData({ ...formData, quantidade_inicial: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                      min="0"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Unitário *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_unitario}
                    onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                  placeholder="Ex: Argola dourada 3cm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : itens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum item cadastrado neste pano
            </div>
          ) : (
            <div className="space-y-3">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded capitalize">
                          {item.categoria}
                        </span>
                        <h4 className="font-medium text-gray-800">{item.descricao}</h4>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          Quantidade: {item.quantidade_disponivel} / {item.quantidade_inicial}
                        </p>
                        <p>Valor unitário: R$ {Number(item.valor_unitario).toFixed(2)}</p>
                        <p className="font-medium">
                          Valor total: R$ {(item.quantidade_disponivel * Number(item.valor_unitario)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-emerald-600 hover:text-emerald-900 p-2"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

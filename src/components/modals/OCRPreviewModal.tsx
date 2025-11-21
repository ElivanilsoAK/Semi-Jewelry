import { useState, useEffect } from 'react';
import { X, Check, Trash2, Plus } from 'lucide-react';
import { ExtractedItem } from '../../services/ocrService';
import { supabase } from '../../lib/supabase';

interface ItemComCategoria extends ExtractedItem {
  categoria: string;
  descricao: string;
}

interface OCRPreviewModalProps {
  items: ExtractedItem[];
  imageUrl: string;
  onConfirm: (items: ItemComCategoria[]) => void;
  onCancel: () => void;
}

export default function OCRPreviewModal({ items: initialItems, imageUrl, onConfirm, onCancel }: OCRPreviewModalProps) {
  const [items, setItems] = useState<ItemComCategoria[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategorias();
  }, []);

  useEffect(() => {
    if (categorias.length > 0 && items.length === 0) {
      const itemsComCategoria = initialItems.map(item => {
        // Se o item já vem com categoria do OCR, usa ela
        // Senão, usa a primeira categoria disponível
        const categoriaItem = (item as any).categoria || categorias[0] || '';

        return {
          ...item,
          categoria: categoriaItem,
          descricao: `${categoriaItem} - R$ ${item.valor.toFixed(2)}`
        };
      });
      setItems(itemsComCategoria);
    }
  }, [categorias, initialItems]);

  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('nome')
        .order('nome');

      if (error) throw error;

      const categoriasNomes = data?.map(c => c.nome) || [];

      if (categoriasNomes.length === 0) {
        setCategorias(['Pulseira', 'Anel', 'Brinco', 'Corrente', 'Pingente', 'Outro']);
      } else {
        setCategorias(categoriasNomes);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategorias(['Pulseira', 'Anel', 'Brinco', 'Corrente', 'Pingente', 'Outro']);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index: number, field: keyof ItemComCategoria, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'categoria' || field === 'valor') {
      updated[index].descricao = `${updated[index].categoria} - ${updated[index].valor}`;
    }

    setItems(updated);
  };

  const handleDelete = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (categorias.length > 0) {
      setItems([...items, {
        valor: 0,
        quantidade: 1,
        categoria: categorias[0],
        descricao: `${categorias[0]} - 0`
      }]);
    }
  };

  const handleConfirm = () => {
    const validItems = items.filter(item =>
      item.valor > 0 &&
      item.quantidade > 0 &&
      item.categoria.trim() !== ''
    );

    if (validItems.length === 0) {
      alert('Adicione pelo menos um item válido!');
      return;
    }

    onConfirm(validItems);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <p>Carregando categorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Definir Categorias dos Itens
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                O OCR detectou {initialItems.length} {initialItems.length === 1 ? 'valor' : 'valores'}.
                Defina a categoria para cada item.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-3">Imagem Original</h3>
            <img
              src={imageUrl}
              alt="Documento original"
              className="w-full rounded-lg border border-gray-300"
            />
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 text-sm mb-2">📋 Itens Detectados pelo OCR:</h4>
              <div className="text-xs text-blue-800 space-y-1 max-h-64 overflow-y-auto">
                {initialItems.map((item, i) => {
                  const cat = (item as any).categoria;
                  return (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-blue-200 last:border-0">
                      {cat && <span className="font-semibold text-emerald-700">{cat}</span>}
                      <span>R$ {item.valor.toFixed(2)}</span>
                      <span className="text-blue-600">Qtd: {item.quantidade}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-sm font-bold text-blue-900">
                  Total: {initialItems.length} {initialItems.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
            </div>
          </div>

          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Categorias dos Itens</h3>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar Item
              </button>
            </div>

            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                <strong>✅ OCR Completo!</strong> O sistema identificou automaticamente as categorias, valores e quantidades.
                Revise os itens abaixo e ajuste se necessário antes de confirmar.
              </p>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum item para categorizar.</p>
                <button
                  onClick={handleAdd}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Adicionar Item Manualmente
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Categoria *
                        </label>
                        <select
                          value={item.categoria}
                          onChange={(e) => handleEdit(index, 'categoria', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          {categorias.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Valor (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.valor}
                          onChange={(e) => handleEdit(index, 'valor', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantidade *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => handleEdit(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => handleDelete(index)}
                          className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Descrição:</strong> {item.descricao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={items.length === 0}
            >
              <Check className="w-5 h-5" />
              Confirmar e Salvar {items.length} {items.length === 1 ? 'Item' : 'Itens'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

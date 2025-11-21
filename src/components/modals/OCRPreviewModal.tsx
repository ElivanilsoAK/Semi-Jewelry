import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // ✅ Agora vai funcionar com a v11
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
    if (categorias.length > 0 && initialItems.length > 0 && items.length === 0) {
      const itemsComCategoria = initialItems.map(item => {
        const categoriaDoOCR = (item as any).categoria || '';

        const categoriaEncontrada = categorias.find(cat =>
          cat.toLowerCase() === categoriaDoOCR.toLowerCase() ||
          cat.toLowerCase().includes(categoriaDoOCR.toLowerCase()) ||
          categoriaDoOCR.toLowerCase().includes(cat.toLowerCase())
        );

        const categoriaFinal = categoriaEncontrada || categorias[0];

        return {
          ...item,
          categoria: categoriaFinal,
          descricao: `${categoriaFinal} - R$ ${item.valor.toFixed(2)}`
        };
      });
      setItems(itemsComCategoria);
    }
  }, [categorias, initialItems, items.length]);

  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('nome')
        .order('nome');

      if (error) throw error;
      const categoriasNomes = data?.map(c => c.nome) || [];
      setCategorias(categoriasNomes.length > 0 ? categoriasNomes : ['Pulseiras', 'Correntes', 'Pingentes', 'Anéis', 'Brincos G', 'Brincos I', 'Brincos M', 'Argolas']);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategorias(['Pulseiras', 'Correntes', 'Pingentes', 'Anéis', 'Brincos G', 'Brincos I', 'Brincos M', 'Argolas']);
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
    const validItems = items.filter(item => item.valor > 0 && item.quantidade > 0 && item.categoria.trim() !== '');
    if (validItems.length === 0) {
      alert('Adicione pelo menos um item válido!');
      return;
    }
    onConfirm(validItems);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-pulse">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Analisando Imagem...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Overlay Animado */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        />

        {/* Modal Animado */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8 relative z-10 shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Definir Categorias</h2>
              <p className="text-sm text-gray-500 mt-1">
                A IA detectou {initialItems.length} itens. Confirme os dados abaixo.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row">
              {/* Coluna Imagem */}
              <div className="w-full lg:w-1/2 p-6 bg-gray-50 border-r border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-3">Comprovante Original</h3>
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="w-full max-h-96 object-contain rounded"
                  />
                </div>
                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Itens Brutos</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto text-xs text-blue-900">
                    {initialItems.map((item, i) => (
                      <div key={i} className="flex justify-between border-b border-blue-200 last:border-0 py-1">
                        <span>{item.categoria || '---'}</span>
                        <span className="font-mono">R$ {item.valor.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna Edição */}
              <div className="w-full lg:w-1/2 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">Itens para Importar</h3>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                    <p>Nenhum item na lista.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {items.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-5">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                            <select
                              value={item.categoria}
                              onChange={(e) => handleEdit(index, 'categoria', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.valor}
                              onChange={(e) => handleEdit(index, 'valor', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Qtd</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) => handleEdit(index, 'quantidade', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <button onClick={() => handleDelete(index)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
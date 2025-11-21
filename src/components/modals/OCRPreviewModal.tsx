import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Plus, Calculator, DollarSign, Package } from 'lucide-react';
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

  // Cálculos de Totais em Tempo Real
  const totalQuantidade = items.reduce((acc, item) => acc + (item.quantidade || 0), 0);
  const totalValor = items.reduce((acc, item) => acc + (item.valor * (item.quantidade || 1)), 0);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8 relative z-10 shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-emerald-600" />
                Conferência do Pano
              </h2>
              <p className="text-sm text-gray-500">
                Verifique os totais abaixo antes de confirmar a entrada.
              </p>
            </div>
            
            {/* RESUMO DE TOTAIS NO TOPO (NOVIDADE) */}
            <div className="hidden md:flex gap-4">
              <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-end">
                <span className="text-xs text-gray-500 uppercase font-bold">Qtd. Itens</span>
                <span className="text-lg font-bold text-blue-600">{totalQuantidade}</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-end">
                <span className="text-xs text-gray-500 uppercase font-bold">Valor Total</span>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalValor)}</span>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="md:hidden text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row h-full">
              {/* Coluna Imagem */}
              <div className="w-full lg:w-1/2 p-6 bg-gray-100/50 border-r border-gray-200 overflow-y-auto">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Imagem Original
                </h3>
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm mb-4">
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="w-full max-h-[400px] object-contain rounded"
                  />
                </div>
                
                {/* Resumo Mobile dos Totais */}
                <div className="md:hidden grid grid-cols-2 gap-3 mb-4">
                   <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                      <span className="block text-xs text-blue-500 font-bold uppercase">Quantidade</span>
                      <span className="block text-xl font-bold text-blue-700">{totalQuantidade}</span>
                   </div>
                   <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm">
                      <span className="block text-xs text-emerald-500 font-bold uppercase">Total</span>
                      <span className="block text-xl font-bold text-emerald-700">{formatCurrency(totalValor)}</span>
                   </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Detectado pela IA</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto text-xs text-gray-600">
                    {initialItems.map((item, i) => (
                      <div key={i} className="flex justify-between border-b border-gray-100 last:border-0 py-1">
                        <span>{item.categoria || '---'}</span>
                        <span className="font-mono">R$ {item.valor.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna Edição */}
              <div className="w-full lg:w-1/2 p-6 overflow-y-auto bg-white">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 py-2 border-b border-gray-100">
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group relative"
                      >
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoria</label>
                            <select
                              value={item.categoria}
                              onChange={(e) => handleEdit(index, 'categoria', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                            >
                              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </div>
                          <div className="col-span-4">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.valor}
                                onChange={(e) => handleEdit(index, 'valor', parseFloat(e.target.value) || 0)}
                                className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                              />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) => handleEdit(index, 'quantidade', parseInt(e.target.value) || 1)}
                              className="w-full px-1 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 text-center font-medium"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end pb-1">
                            <button 
                              onClick={() => handleDelete(index)} 
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Remover"
                            >
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

          {/* Footer com Totais e Ação */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-xl">
            <div className="flex gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase font-bold">Itens</span>
                <span className="font-bold text-gray-800 text-lg">{totalQuantidade}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase font-bold">Total Geral</span>
                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(totalValor)}</span>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={onCancel} className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={items.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200 transition-all transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                Confirmar Importação
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import { useState, useEffect } from 'react';
import { X, Check, Trash2, Plus, Loader2 } from 'lucide-react';
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
        
        // Lógica robusta de match de categoria
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

  // Renderização Simples e Segura (Sem animações complexas)
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <div className="text-center">
            <p className="font-bold text-gray-800 text-lg">Analisando Tabela...</p>
            <p className="text-sm text-gray-500">Identificando colunas e valores.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8 shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-start gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Definir Categorias dos Itens</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              O OCR detectou {initialItems.length} {initialItems.length === 1 ? 'valor' : 'valores'}.
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row">
            {/* Esquerda: Imagem */}
            <div className="w-full lg:w-1/2 p-4 md:p-6 lg:border-r border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-3">Imagem Original</h3>
              <div className="relative border border-gray-300 rounded-lg bg-white overflow-hidden">
                <img src={imageUrl} alt="Documento" className="w-full max-h-96 object-contain" />
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                  📋 Dados Brutos:
                </h4>
                <div className="max-h-32 overflow-y-auto text-xs text-blue-800 space-y-1">
                  {initialItems.map((item, i) => (
                    <div key={i} className="flex justify-between border-b border-blue-200 last:border-0 py-1">
                      <span>{item.categoria}</span>
                      <span className="font-mono">R$ {item.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Direita: Edição */}
            <div className="w-full lg:w-1/2 p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Itens Identificados</h3>
                <button onClick={handleAdd} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-50">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed">
                  <p>Nenhum item válido encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {items.map((item, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                          <select
                            value={item.categoria}
                            onChange={(e) => handleEdit(index, 'categoria', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          >
                            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.valor}
                            onChange={(e) => handleEdit(index, 'valor', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Qtd:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => handleEdit(index, 'quantidade', parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <button onClick={() => handleDelete(index)} className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded">
                          <Trash2 className="w-3 h-3" /> Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
            Cancelar
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Check className="w-5 h-5" /> Confirmar {items.length} Itens
          </button>
        </div>
      </div>
    </div>
  );
}
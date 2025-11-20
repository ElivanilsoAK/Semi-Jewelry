import { useState, useEffect } from 'react';
import { supabase, Pano, ItemPano } from '../../lib/supabase';
import { X, Package, ChevronDown, ChevronUp, Edit2, Image as ImageIcon } from 'lucide-react';

interface ItensModalProps {
  pano: Pano;
  onClose: () => void;
}

interface ItemPorCategoria {
  categoria: string;
  itens: ItemPano[];
  total: number;
  quantidade: number;
}

export default function ItensModal({ pano, onClose }: ItensModalProps) {
  const [itens, setItens] = useState<ItemPano[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    loadItens();
  }, [pano.id]);

  const loadItens = async () => {
    try {
      const { data, error } = await supabase
        .from('itens_pano')
        .select('*')
        .eq('pano_id', pano.id)
        .order('categoria')
        .order('descricao');

      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  const itensPorCategoria: ItemPorCategoria[] = itens
    .filter(item =>
      busca === '' ||
      item.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      item.categoria.toLowerCase().includes(busca.toLowerCase())
    )
    .reduce((acc, item) => {
      const categoria = item.categoria || 'Sem Categoria';
      const existing = acc.find(c => c.categoria === categoria);

      if (existing) {
        existing.itens.push(item);
        existing.total += item.valor_unitario * item.quantidade_disponivel;
        existing.quantidade += item.quantidade_disponivel;
      } else {
        acc.push({
          categoria,
          itens: [item],
          total: item.valor_unitario * item.quantidade_disponivel,
          quantidade: item.quantidade_disponivel,
        });
      }

      return acc;
    }, [] as ItemPorCategoria[])
    .sort((a, b) => a.categoria.localeCompare(b.categoria));

  const toggleCategoria = (categoria: string) => {
    setCategoriaExpandida(categoriaExpandida === categoria ? null : categoria);
  };

  const totalGeral = itensPorCategoria.reduce((sum, cat) => sum + cat.total, 0);
  const quantidadeTotal = itensPorCategoria.reduce((sum, cat) => sum + cat.quantidade, 0);

  const cores = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Itens do Pano</h3>
                <p className="text-sm text-gray-600">{pano.nome}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar itens..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-field"
          />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : itens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum item cadastrado</p>
            <p className="text-sm">Use o OCR ou cadastre manualmente</p>
          </div>
        ) : (
          <>
            <div className="p-6 grid grid-cols-3 gap-4 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="text-center">
                <p className="text-sm text-blue-700 font-medium">Categorias</p>
                <p className="text-2xl font-bold text-blue-900">{itensPorCategoria.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-700 font-medium">Total Itens</p>
                <p className="text-2xl font-bold text-blue-900">{quantidadeTotal}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-700 font-medium">Valor Total</p>
                <p className="text-2xl font-bold text-blue-900">R$ {totalGeral.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-3">
              {itensPorCategoria.map((cat, index) => {
                const isExpanded = categoriaExpandida === cat.categoria;
                const cor = cores[index % cores.length];

                return (
                  <div
                    key={cat.categoria}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <button
                      onClick={() => toggleCategoria(cat.categoria)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${cor} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                          {cat.quantidade}
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900 text-lg">{cat.categoria}</h4>
                          <p className="text-sm text-gray-600">
                            {cat.itens.length} {cat.itens.length === 1 ? 'item' : 'itens'} · R$ {cat.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        <div className="divide-y divide-gray-200">
                          {cat.itens.map((item) => (
                            <div
                              key={item.id}
                              className="p-4 flex items-center gap-4 hover:bg-white transition-colors"
                            >
                              {item.foto_url ? (
                                <img
                                  src={item.foto_url}
                                  alt={item.descricao}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}

                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.descricao}</p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                  <span>Qtd: {item.quantidade_disponivel}</span>
                                  <span>Valor: R$ {item.valor_unitario.toFixed(2)}</span>
                                  <span className="font-medium text-green-600">
                                    Total: R$ {(item.valor_unitario * item.quantidade_disponivel).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <button
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar item"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="p-6 border-t border-gray-200">
          <button onClick={onClose} className="btn-primary w-full">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

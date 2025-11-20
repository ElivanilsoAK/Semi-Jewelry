import { useEffect, useState } from 'react';
import { supabase, Pano, ItemPano } from '../../lib/supabase';
import { Plus, Package2, Calendar, AlertCircle, Eye } from 'lucide-react';
import PanoModal from '../modals/PanoModal';
import ItensModal from '../modals/ItensModal';

export default function PanosView() {
  const [panos, setPanos] = useState<Pano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanoModal, setShowPanoModal] = useState(false);
  const [showItensModal, setShowItensModal] = useState(false);
  const [selectedPano, setSelectedPano] = useState<Pano | null>(null);
  const [editingPano, setEditingPano] = useState<Pano | null>(null);

  useEffect(() => {
    loadPanos();
  }, []);

  const loadPanos = async () => {
    try {
      const { data, error } = await supabase
        .from('panos')
        .select('*')
        .order('data_retirada', { ascending: false });

      if (error) throw error;
      setPanos(data || []);
    } catch (error) {
      console.error('Erro ao carregar panos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewItens = (pano: Pano) => {
    setSelectedPano(pano);
    setShowItensModal(true);
  };

  const handleEditPano = (pano: Pano) => {
    setEditingPano(pano);
    setShowPanoModal(true);
  };

  const handleClosePanoModal = () => {
    setShowPanoModal(false);
    setEditingPano(null);
    loadPanos();
  };

  const handleCloseItensModal = () => {
    setShowItensModal(false);
    setSelectedPano(null);
  };

  const isOverdue = (dataDevolucao: string, status: string) => {
    return status === 'ativo' && new Date(dataDevolucao) < new Date();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Panos</h1>
        <button
          onClick={() => setShowPanoModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Pano
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : panos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum pano cadastrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {panos.map((pano) => {
            const overdue = isOverdue(pano.data_devolucao, pano.status);

            return (
              <div
                key={pano.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <Package2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{pano.nome}</h3>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                            pano.status === 'ativo'
                              ? overdue
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pano.status === 'ativo' ? (overdue ? 'Atrasado' : 'Ativo') : 'Devolvido'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Retirada: {formatDate(pano.data_retirada)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Devolução: {formatDate(pano.data_devolucao)}</span>
                    </div>
                    {overdue && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>Prazo vencido!</span>
                      </div>
                    )}
                  </div>

                  {pano.observacoes && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {pano.observacoes}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewItens(pano)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Itens
                    </button>
                    <button
                      onClick={() => handleEditPano(pano)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPanoModal && (
        <PanoModal
          pano={editingPano}
          onClose={handleClosePanoModal}
        />
      )}

      {showItensModal && selectedPano && (
        <ItensModal
          pano={selectedPano}
          onClose={handleCloseItensModal}
        />
      )}
    </div>
  );
}

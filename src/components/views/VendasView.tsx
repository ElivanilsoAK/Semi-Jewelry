import { useEffect, useState } from 'react';
import { supabase, Venda, Cliente } from '../../lib/supabase';
import { Plus, Search, Eye, Edit2 } from 'lucide-react';
import NovaVendaModal from '../modals/NovaVendaModal';
import DetalhesVendaModal from '../modals/DetalhesVendaModal';
import EditarVendaModal from '../modals/EditarVendaModal';

interface VendaComCliente extends Venda {
  cliente: Cliente;
}

export default function VendasView() {
  const [vendas, setVendas] = useState<VendaComCliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNovaVenda, setShowNovaVenda] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<VendaComCliente | null>(null);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);

  useEffect(() => {
    loadVendas();
  }, []);

  const loadVendas = async () => {
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .order('data_venda', { ascending: false });

      if (error) throw error;
      setVendas(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNovaVenda = () => {
    setShowNovaVenda(false);
    loadVendas();
  };

  const handleCloseDetalhes = () => {
    setSelectedVenda(null);
    loadVendas();
  };

  const filteredVendas = vendas.filter((venda) =>
    venda.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-green-100 text-green-700';
      case 'parcial':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'parcial':
        return 'Parcial';
      default:
        return 'Pendente';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Vendas</h1>
        <button
          onClick={() => setShowNovaVenda(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Venda
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredVendas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda cadastrada'}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVendas.map((venda) => (
                <tr key={venda.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(venda.data_venda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {venda.cliente.nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(venda.valor_total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(venda.status_pagamento)}`}>
                      {getStatusLabel(venda.status_pagamento)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingVenda(venda)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                        title="Editar venda"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedVenda(venda)}
                        className="text-emerald-600 hover:text-emerald-900 inline-flex items-center gap-1 px-2 py-1 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNovaVenda && (
        <NovaVendaModal onClose={handleCloseNovaVenda} />
      )}

      {selectedVenda && (
        <DetalhesVendaModal
          venda={selectedVenda}
          onClose={handleCloseDetalhes}
        />
      )}

      {editingVenda && (
        <EditarVendaModal
          venda={editingVenda}
          onClose={() => setEditingVenda(null)}
          onSave={() => {
            setEditingVenda(null);
            loadVendas();
          }}
          onDelete={() => {
            setEditingVenda(null);
            loadVendas();
          }}
        />
      )}
    </div>
  );
}

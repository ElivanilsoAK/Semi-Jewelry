import { useEffect, useState } from 'react';
import { supabase, Venda, Cliente } from '../../lib/supabase';
import {
  Plus, Search, Eye, Edit2, Filter, Calendar, DollarSign,
  CheckCircle, Clock, XCircle, AlertTriangle, CreditCard, Wallet,
  TrendingDown, RefreshCw, Download
} from 'lucide-react';
import NovaVendaModal from '../modals/NovaVendaModal';
import DetalhesVendaModal from '../modals/DetalhesVendaModal';
import EditarVendaModal from '../modals/EditarVendaModal';

interface VendaComCliente extends Venda {
  cliente: Cliente;
  cliente_nome?: string;
  total_parcelas?: number;
  parcelas_pagas?: number;
  parcelas_pendentes?: number;
  parcelas_atrasadas?: number;
  valor_total_devolvido?: number;
  numero_devolucoes?: number;
}

type FilterStatus = 'todos' | 'pago' | 'pendente' | 'parcial' | 'atrasado';
type FilterVendaStatus = 'todos' | 'ativa' | 'cancelada' | 'devolvida';
type FilterPayment = 'todos' | 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito';

export default function VendasView() {
  const [vendas, setVendas] = useState<VendaComCliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNovaVenda, setShowNovaVenda] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<VendaComCliente | null>(null);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [filterVendaStatus, setFilterVendaStatus] = useState<FilterVendaStatus>('todos');
  const [filterPayment, setFilterPayment] = useState<FilterPayment>('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadVendas();

    const channel = supabase
      .channel('vendas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadVendas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcelas_venda' }, loadVendas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, loadVendas)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadVendas = async () => {
    try {
      const { data, error } = await supabase
        .from('vendas_detalhadas')
        .select('*')
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

  const filteredVendas = vendas.filter((venda) => {
    const matchesSearch =
      venda.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venda.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'todos' || venda.status_pagamento === filterStatus;
    const matchesVendaStatus = filterVendaStatus === 'todos' || venda.status_venda === filterVendaStatus;
    const matchesPayment = filterPayment === 'todos' || venda.forma_pagamento === filterPayment;

    let matchesDate = true;
    if (dateFrom && dateTo) {
      const vendaDate = new Date(venda.data_venda);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      matchesDate = vendaDate >= fromDate && vendaDate <= toDate;
    }

    return matchesSearch && matchesStatus && matchesVendaStatus && matchesPayment && matchesDate;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pago':
        return {
          bg: 'bg-green-500',
          text: 'text-white',
          label: 'PAGO',
          icon: CheckCircle
        };
      case 'parcial':
        return {
          bg: 'bg-yellow-500',
          text: 'text-white',
          label: 'PARCIAL',
          icon: Clock
        };
      case 'atrasado':
        return {
          bg: 'bg-red-500',
          text: 'text-white',
          label: 'ATRASADO',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'bg-orange-500',
          text: 'text-white',
          label: 'PENDENTE',
          icon: Clock
        };
    }
  };

  const getVendaStatusConfig = (status: string) => {
    switch (status) {
      case 'cancelada':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          label: 'CANCELADA',
          icon: XCircle
        };
      case 'devolvida_parcial':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-700',
          label: 'DEV. PARCIAL',
          icon: TrendingDown
        };
      case 'devolvida_total':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          label: 'DEVOLVIDA',
          icon: RefreshCw
        };
      default:
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          label: 'ATIVA',
          icon: CheckCircle
        };
    }
  };

  const getPaymentIcon = (forma: string) => {
    switch (forma) {
      case 'pix':
        return '💰';
      case 'cartao_credito':
        return '💳';
      case 'cartao_debito':
        return '💳';
      case 'dinheiro':
        return '💵';
      default:
        return '💰';
    }
  };

  const getPaymentLabel = (forma: string) => {
    switch (forma) {
      case 'pix':
        return 'PIX';
      case 'cartao_credito':
        return 'Cartão Crédito';
      case 'cartao_debito':
        return 'Cartão Débito';
      case 'dinheiro':
        return 'Dinheiro';
      default:
        return forma;
    }
  };

  const totalVendas = filteredVendas.length;
  const totalValor = filteredVendas.reduce((sum, v) => sum + Number(v.valor_total), 0);
  const vendasPagas = filteredVendas.filter(v => v.status_pagamento === 'pago').length;
  const vendasAtrasadas = filteredVendas.filter(v => v.status_pagamento === 'atrasado').length;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-charcoal">Vendas</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                showFilters
                  ? 'bg-silk border-gold-ak text-gold-ak'
                  : 'bg-white border-line text-charcoal hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            <button
              onClick={() => setShowNovaVenda(true)}
              className="flex items-center gap-2 bg-gold-ak hover:bg-amber-warning text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Nova Venda
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-line p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Vendas</p>
                <p className="text-2xl font-bold text-charcoal">{totalVendas}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-line p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                <p className="text-xl font-bold text-charcoal">{formatCurrency(totalValor)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-line p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pagas</p>
                <p className="text-2xl font-bold text-green-600">{vendasPagas}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-sm border p-4 ${
            vendasAtrasadas > 0 ? 'border-red-500 ring-2 ring-red-500' : 'border-line'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{vendasAtrasadas}</p>
              </div>
              <div className={`p-3 rounded-lg ${vendasAtrasadas > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${vendasAtrasadas > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-line p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Pagamento
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                >
                  <option value="todos">Todos</option>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="parcial">Parcial</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Venda
                </label>
                <select
                  value={filterVendaStatus}
                  onChange={(e) => setFilterVendaStatus(e.target.value as FilterVendaStatus)}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                >
                  <option value="todos">Todos</option>
                  <option value="ativa">Ativa</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="devolvida">Devolvida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma Pagamento
                </label>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value as FilterPayment)}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                >
                  <option value="todos">Todos</option>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão Crédito</option>
                  <option value="cartao_debito">Cartão Débito</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data De → Até
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent text-sm"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilterStatus('todos');
                  setFilterVendaStatus('todos');
                  setFilterPayment('todos');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-charcoal transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent bg-white shadow-sm"
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
        <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-line">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status Pag.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status Venda
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredVendas.map((venda) => {
                  const statusConfig = getStatusConfig(venda.status_pagamento);
                  const vendaStatusConfig = getVendaStatusConfig(venda.status_venda || 'ativa');
                  const StatusIcon = statusConfig.icon;
                  const VendaStatusIcon = vendaStatusConfig.icon;

                  return (
                    <tr key={venda.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-charcoal">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(venda.data_venda)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-charcoal">
                          {venda.cliente_nome}
                        </div>
                        {venda.desconto_valor && venda.desconto_valor > 0 && (
                          <div className="text-xs text-green-600 font-medium">
                            Desconto: {formatCurrency(venda.desconto_valor)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getPaymentIcon(venda.forma_pagamento || 'dinheiro')}</span>
                          <div>
                            <div className="text-sm font-medium text-charcoal">
                              {getPaymentLabel(venda.forma_pagamento || 'dinheiro')}
                            </div>
                            {venda.numero_parcelas && venda.numero_parcelas > 1 && (
                              <div className="text-xs text-gray-500">
                                {venda.numero_parcelas}x de {formatCurrency(Number(venda.valor_total) / venda.numero_parcelas)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-charcoal">
                          {formatCurrency(Number(venda.valor_total))}
                        </div>
                        {venda.valor_total_devolvido && venda.valor_total_devolvido > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            Dev: {formatCurrency(venda.valor_total_devolvido)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs ${statusConfig.bg} ${statusConfig.text}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs ${vendaStatusConfig.bg} ${vendaStatusConfig.text}`}>
                          <VendaStatusIcon className="w-3.5 h-3.5" />
                          {vendaStatusConfig.label}
                        </div>
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
                            className="text-gold-ak hover:text-amber-warning inline-flex items-center gap-1 px-2 py-1 hover:bg-silk rounded transition-colors font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

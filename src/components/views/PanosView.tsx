import { useEffect, useState } from 'react';
import { supabase, Pano } from '../../lib/supabase';
import {
  Plus, Package2, Calendar, AlertCircle, Eye, Copy, Clock,
  User, DollarSign, TrendingUp, History, Filter, X, CheckCircle,
  AlertTriangle, Trash2
} from 'lucide-react';
import PanoModal from '../modals/PanoModal';
import ItensModal from '../modals/ItensModal';

interface PanoDetalhado extends Pano {
  cliente_nome?: string;
  cliente_telefone?: string;
  dias_circulacao?: number;
  retorno_atrasado?: boolean;
  total_itens?: number;
  valor_calculado?: number;
}

interface LucratividadePano {
  valor_total_itens: number;
  valor_vendido: number;
  quantidade_vendida: number;
  percentual_vendido: number;
  comissao_gerada: number;
  lucro_liquido: number;
}

type FilterStatus = 'todos' | 'ativo' | 'devolvido' | 'encerrado';

export default function PanosView() {
  const [panos, setPanos] = useState<PanoDetalhado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanoModal, setShowPanoModal] = useState(false);
  const [showItensModal, setShowItensModal] = useState(false);
  const [selectedPano, setSelectedPano] = useState<PanoDetalhado | null>(null);
  const [editingPano, setEditingPano] = useState<PanoDetalhado | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [showHistory, setShowHistory] = useState(false);
  const [lucratividade, setLucratividade] = useState<Record<string, LucratividadePano>>({});
  const [showLucratividade, setShowLucratividade] = useState<string | null>(null);

  useEffect(() => {
    loadPanos();

    const channel = supabase
      .channel('panos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panos' }, loadPanos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_pano' }, loadPanos)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus, showHistory]);

  const loadPanos = async () => {
    try {
      const { data, error } = await supabase
        .from('panos_detalhados')
        .select('*')
        .order('data_retirada', { ascending: false });

      if (error) throw error;

      let filteredData = data || [];

      if (!showHistory) {
        filteredData = filteredData.filter(p => p.status !== 'encerrado' && p.status !== 'devolvido');
      }

      if (filterStatus !== 'todos') {
        filteredData = filteredData.filter(p => p.status === filterStatus);
      }

      setPanos(filteredData);
    } catch (error) {
      console.error('Erro ao carregar panos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLucratividade = async (panoId: string) => {
    try {
      const { data, error } = await supabase.rpc('calcular_lucratividade_pano', {
        pano_id_param: panoId
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setLucratividade(prev => ({ ...prev, [panoId]: data[0] }));
        setShowLucratividade(panoId);
      }
    } catch (error) {
      console.error('Erro ao carregar lucratividade:', error);
    }
  };

  const handleViewItens = (pano: PanoDetalhado) => {
    setSelectedPano(pano);
    setShowItensModal(true);
  };

  const handleEditPano = (pano: PanoDetalhado) => {
    setEditingPano(pano);
    setShowPanoModal(true);
  };

  const handleDuplicatePano = async (pano: PanoDetalhado) => {
    try {
      const { data: newPano, error: panoError } = await supabase
        .from('panos')
        .insert({
          nome: `${pano.nome} (Cópia)`,
          data_retirada: new Date().toISOString(),
          data_devolucao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'ativo',
          observacoes: pano.observacoes,
          cliente_id: pano.cliente_id,
          percentual_comissao: pano.percentual_comissao,
          data_prevista_retorno: pano.data_prevista_retorno
        })
        .select()
        .single();

      if (panoError) throw panoError;

      const { data: itens, error: itensError } = await supabase
        .from('itens_pano')
        .select('*')
        .eq('pano_id', pano.id);

      if (itensError) throw itensError;

      if (itens && itens.length > 0) {
        const itensParaCopiar = itens.map(item => ({
          pano_id: newPano.id,
          categoria: item.categoria,
          descricao: item.descricao,
          quantidade_inicial: item.quantidade_inicial,
          quantidade_disponivel: item.quantidade_inicial,
          valor_unitario: item.valor_unitario,
          categoria_custom: item.categoria_custom
        }));

        const { error: insertError } = await supabase
          .from('itens_pano')
          .insert(itensParaCopiar);

        if (insertError) throw insertError;
      }

      loadPanos();
      alert('Pano duplicado com sucesso!');
    } catch (error) {
      console.error('Erro ao duplicar pano:', error);
      alert('Erro ao duplicar pano');
    }
  };

  const handleDeletePano = async (pano: PanoDetalhado) => {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir o pano "${pano.nome}"?\n\n` +
      `Isso irá remover:\n` +
      `- O pano\n` +
      `- ${pano.total_itens || 0} itens associados\n` +
      `- Todas as comissões relacionadas\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    );

    if (!confirmacao) return;

    try {
      const { error } = await supabase
        .from('panos')
        .delete()
        .eq('id', pano.id);

      if (error) throw error;

      alert('Pano excluído com sucesso!');
      loadPanos();
    } catch (error) {
      console.error('Erro ao excluir pano:', error);
      alert('Erro ao excluir pano: ' + (error as Error).message);
    }
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

  const getDaysMessage = (dias: number, status: string) => {
    if (status !== 'ativo') return null;

    if (dias === 0) return 'Retirado hoje';
    if (dias === 1) return 'Há 1 dia na rua';
    return `Há ${dias} dias na rua`;
  };

  const getStatusBadge = (status: string, overdue: boolean) => {
    if (status === 'ativo') {
      if (overdue) {
        return {
          bg: 'bg-red-500',
          text: 'text-white',
          label: 'ATRASADO',
          icon: AlertTriangle
        };
      }
      return {
        bg: 'bg-green-500',
        text: 'text-white',
        label: 'ATIVO',
        icon: CheckCircle
      };
    }
    if (status === 'devolvido') {
      return {
        bg: 'bg-blue-500',
        text: 'text-white',
        label: 'DEVOLVIDO',
        icon: Package2
      };
    }
    return {
      bg: 'bg-gray-500',
      text: 'text-white',
      label: 'ENCERRADO',
      icon: X
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const filteredPanos = panos;
  const panosAtivos = panos.filter(p => p.status === 'ativo').length;
  const panosAtrasados = panos.filter(p => p.retorno_atrasado).length;
  const valorTotalCirculacao = panos
    .filter(p => p.status === 'ativo')
    .reduce((sum, p) => sum + (p.valor_calculado || 0), 0);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-charcoal">Panos</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                showHistory
                  ? 'bg-silk border-gold-ak text-gold-ak'
                  : 'bg-white border-line text-charcoal hover:bg-gray-50'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">Histórico</span>
            </button>
            <button
              onClick={() => setShowPanoModal(true)}
              className="flex items-center gap-2 bg-gold-ak hover:bg-amber-warning text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Novo Pano
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-line p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Panos Ativos</p>
                <p className="text-2xl font-bold text-charcoal">{panosAtivos}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Package2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-sm border p-4 ${
            panosAtrasados > 0 ? 'border-red-500 ring-2 ring-red-500' : 'border-line'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Atrasados</p>
                <p className="text-2xl font-bold text-red-600">{panosAtrasados}</p>
              </div>
              <div className={`p-3 rounded-lg ${panosAtrasados > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertCircle className={`w-6 h-6 ${panosAtrasados > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-line p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Em Circulação</p>
                <p className="text-2xl font-bold text-charcoal">{formatCurrency(valorTotalCirculacao)}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-line p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Panos</p>
                <p className="text-2xl font-bold text-charcoal">{panos.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
          {(['todos', 'ativo', 'devolvido', 'encerrado'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-gold-ak text-white font-medium'
                  : 'bg-white text-charcoal border border-line hover:bg-gray-50'
              }`}
            >
              {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredPanos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum pano encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPanos.map((pano) => {
            const overdue = pano.retorno_atrasado || false;
            const statusBadge = getStatusBadge(pano.status, overdue);
            const StatusIcon = statusBadge.icon;
            const daysMessage = getDaysMessage(pano.dias_circulacao || 0, pano.status);
            const lucro = lucratividade[pano.id];

            return (
              <div
                key={pano.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${
                  overdue ? 'border-red-500 ring-2 ring-red-500 animate-pulse-slow' : 'border-line'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-charcoal mb-2">{pano.nome}</h3>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm ${statusBadge.bg} ${statusBadge.text}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusBadge.label}
                      </div>
                    </div>
                    <div className="bg-silk p-3 rounded-lg">
                      <Package2 className="w-6 h-6 text-gold-ak" />
                    </div>
                  </div>

                  {pano.cliente_nome && (
                    <div className="flex items-center gap-2 text-sm text-charcoal mb-3 bg-blue-50 p-2 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{pano.cliente_nome}</span>
                    </div>
                  )}

                  {pano.valor_calculado !== undefined && pano.valor_calculado > 0 && (
                    <div className="flex items-center gap-2 text-sm mb-3 bg-green-50 p-2 rounded-lg">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-bold text-green-700">
                        {formatCurrency(pano.valor_calculado)}
                      </span>
                      <span className="text-gray-500">({pano.total_itens || 0} itens)</span>
                    </div>
                  )}

                  {pano.percentual_comissao && (
                    <div className="flex items-center gap-2 text-sm mb-3 bg-purple-50 p-2 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-purple-700">Comissão: {pano.percentual_comissao}%</span>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Retirada: {formatDate(pano.data_retirada)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Devolução: {formatDate(pano.data_devolucao)}</span>
                    </div>
                    {daysMessage && (
                      <div className={`flex items-center gap-2 text-sm font-medium ${
                        overdue ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                        <span>{daysMessage}</span>
                      </div>
                    )}
                    {overdue && (
                      <div className="flex items-center gap-2 text-sm text-red-600 font-bold bg-red-50 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        <span>Retorno atrasado!</span>
                      </div>
                    )}
                  </div>

                  {pano.observacoes && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 italic">
                      {pano.observacoes}
                    </p>
                  )}

                  {showLucratividade === pano.id && lucro && (
                    <div className="bg-gradient-to-br from-gold-ak/10 to-amber-warning/10 border border-gold-ak/30 rounded-lg p-3 mb-4">
                      <h4 className="text-sm font-bold text-charcoal mb-2">📊 Lucratividade</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vendido:</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(lucro.valor_vendido)} ({lucro.percentual_vendido.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Comissão:</span>
                          <span className="font-bold text-purple-600">{formatCurrency(lucro.comissao_gerada)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gold-ak/30 pt-1">
                          <span className="text-gray-700 font-medium">Lucro:</span>
                          <span className="font-bold text-gold-ak">{formatCurrency(lucro.lucro_liquido)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleViewItens(pano)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gold-ak/10 text-gold-ak rounded-lg hover:bg-gold-ak/20 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Itens
                    </button>
                    <button
                      onClick={() => loadLucratividade(pano.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Lucro
                    </button>
                    <button
                      onClick={() => handleEditPano(pano)}
                      className="px-3 py-2 border border-line text-charcoal rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDuplicatePano(pano)}
                      className="flex items-center justify-center gap-2 px-3 py-2 border border-line text-charcoal rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar
                    </button>
                    <button
                      onClick={() => handleDeletePano(pano)}
                      className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Pano
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

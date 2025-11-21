import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle2, Clock, AlertCircle, DollarSign, Calendar,
  TrendingUp, Users, Filter, Search, ChevronRight, ChevronDown,
  Receipt, Bell, CalendarDays, BarChart3, X
} from 'lucide-react';

interface Pagamento {
  id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  valor_juros?: number;
  valor_multa?: number;
  valor_pago?: number;
  dias_atraso?: number;
  dias_para_vencer?: number;
  cliente_id?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  venda_id?: string;
  valor_negociado?: number;
  data_negociacao?: string;
  observacao_negociacao?: string;
}

interface PagamentoPorCliente {
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  total_pendentes: number;
  total_pagos: number;
  total_atrasados: number;
  valor_pendente: number;
  valor_pago: number;
  valor_atrasado: number;
  proximo_vencimento: string | null;
}

interface ProjecaoRecebimento {
  data: string;
  valor_previsto: number;
  quantidade_pagamentos: number;
}

type ViewMode = 'lista' | 'timeline' | 'calendario' | 'agrupado' | 'projecao';
type FilterStatus = 'todos' | 'pendente' | 'pago' | 'atrasado' | 'vence_hoje' | 'vence_semana';

export default function PagamentosView() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [pagamentosPorCliente, setPagamentosPorCliente] = useState<PagamentoPorCliente[]>([]);
  const [projecao, setProjecao] = useState<ProjecaoRecebimento[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('todos');
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showNegociacaoModal, setShowNegociacaoModal] = useState(false);
  const [pagamentoNegociando, setPagamentoNegociando] = useState<Pagamento | null>(null);
  const [valorNegociado, setValorNegociado] = useState('');
  const [dataNegociacao, setDataNegociacao] = useState('');
  const [observacaoNegociacao, setObservacaoNegociacao] = useState('');

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('pagamentos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_pagamentos' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewMode]);

  const loadData = async () => {
    try {
      if (viewMode === 'agrupado') {
        const { data, error } = await supabase
          .from('pagamentos_por_cliente')
          .select('*')
          .order('valor_atrasado', { ascending: false });

        if (error) throw error;
        setPagamentosPorCliente(data || []);
      } else if (viewMode === 'projecao') {
        await loadProjecao();
      } else {
        const { data, error } = await supabase
          .from('pagamentos_detalhados')
          .select('*')
          .order('data_vencimento', { ascending: true });

        if (error) throw error;
        setPagamentos(data || []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjecao = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dataInicio = new Date();
      dataInicio.setDate(1);
      const dataFim = new Date();
      dataFim.setMonth(dataFim.getMonth() + 3);
      dataFim.setDate(0);

      const { data, error } = await supabase.rpc('projecao_recebimentos', {
        data_inicio: dataInicio.toISOString().split('T')[0],
        data_fim: dataFim.toISOString().split('T')[0],
        user_id_param: user.id
      });

      if (error) throw error;
      setProjecao(data || []);
    } catch (error) {
      console.error('Erro ao carregar projeção:', error);
    }
  };

  const handleMarcarPago = async (id: string, valorParcela: number) => {
    try {
      const { error } = await supabase
        .from('pagamentos')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString(),
          valor_pago: valorParcela
        })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar pagamento');
    }
  };

  const abrirNegociacao = (pagamento: Pagamento) => {
    setPagamentoNegociando(pagamento);
    setValorNegociado(pagamento.valor_negociado?.toString() || pagamento.valor_parcela.toString());
    setDataNegociacao(pagamento.data_negociacao || new Date().toISOString().split('T')[0]);
    setObservacaoNegociacao(pagamento.observacao_negociacao || '');
    setShowNegociacaoModal(true);
  };

  const salvarNegociacao = async () => {
    if (!pagamentoNegociando || !valorNegociado || !dataNegociacao) {
      alert('❌ Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const { error } = await supabase
        .from('pagamentos')
        .update({
          valor_negociado: parseFloat(valorNegociado),
          data_negociacao: dataNegociacao,
          observacao_negociacao: observacaoNegociacao || null
        })
        .eq('id', pagamentoNegociando.id);

      if (error) throw error;

      alert('✅ Negociação salva com sucesso!');
      setShowNegociacaoModal(false);
      setPagamentoNegociando(null);
      await loadData();
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao salvar negociação');
    }
  };

  const getStatusInfo = (pagamento: Pagamento) => {
    if (pagamento.status === 'pago') {
      return {
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-500',
        label: 'PAGO'
      };
    }

    const diasParaVencer = pagamento.dias_para_vencer || 0;
    const diasAtraso = pagamento.dias_atraso || 0;

    if (diasAtraso > 0) {
      return {
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-500',
        label: 'ATRASADO'
      };
    }

    if (diasParaVencer === 0) {
      return {
        icon: Bell,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-500',
        label: 'VENCE HOJE'
      };
    }

    if (diasParaVencer <= 3) {
      return {
        icon: Clock,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        label: 'VENCE EM BREVE'
      };
    }

    return {
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      label: 'PENDENTE'
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

  const filteredPagamentos = pagamentos.filter(p => {
    const matchesSearch = p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'todos') return true;
    if (filter === 'pago') return p.status === 'pago';
    if (filter === 'pendente') return p.status === 'pendente' && (p.dias_para_vencer || 0) > 3;
    if (filter === 'atrasado') return (p.dias_atraso || 0) > 0;
    if (filter === 'vence_hoje') return (p.dias_para_vencer || 0) === 0 && p.status !== 'pago';
    if (filter === 'vence_semana') return (p.dias_para_vencer || 0) <= 7 && (p.dias_para_vencer || 0) > 0 && p.status !== 'pago';
    return true;
  });

  const calcularTotais = () => {
    return {
      todos: pagamentos.length,
      pendente: pagamentos.filter(p => p.status === 'pendente' && (p.dias_para_vencer || 0) > 3).length,
      pago: pagamentos.filter(p => p.status === 'pago').length,
      atrasado: pagamentos.filter(p => (p.dias_atraso || 0) > 0).length,
      vence_hoje: pagamentos.filter(p => (p.dias_para_vencer || 0) === 0 && p.status !== 'pago').length,
      vence_semana: pagamentos.filter(p => (p.dias_para_vencer || 0) <= 7 && (p.dias_para_vencer || 0) > 0 && p.status !== 'pago').length,
      valor_pendente: pagamentos
        .filter(p => p.status !== 'pago')
        .reduce((sum, p) => sum + (p.valor_parcela || 0) + (p.valor_juros || 0) + (p.valor_multa || 0), 0),
      valor_recebido: pagamentos
        .filter(p => p.status === 'pago')
        .reduce((sum, p) => sum + (p.valor_pago || 0), 0)
    };
  };

  const totais = calcularTotais();

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const renderTimeline = () => (
    <div className="space-y-4">
      {filteredPagamentos.map((pagamento, index) => {
        const statusInfo = getStatusInfo(pagamento);
        const StatusIcon = statusInfo.icon;
        const isLast = index === filteredPagamentos.length - 1;

        return (
          <div key={pagamento.id} className="relative pl-8">
            <div className={`absolute left-0 top-2 w-4 h-4 rounded-full ${statusInfo.bg} border-2 ${statusInfo.border}`}>
              <StatusIcon className={`w-2.5 h-2.5 absolute inset-0.5 ${statusInfo.color}`} />
            </div>
            {!isLast && (
              <div className="absolute left-1.5 top-6 w-0.5 h-full bg-gray-200"></div>
            )}
            <div className={`bg-white rounded-lg shadow-sm border p-4 ${statusInfo.border} border-l-4`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-charcoal">{pagamento.cliente_nome}</h3>
                  <p className="text-sm text-gray-600">Parcela {pagamento.numero_parcela}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-charcoal">{formatCurrency(pagamento.valor_parcela)}</p>
                  {(pagamento.valor_juros || 0) + (pagamento.valor_multa || 0) > 0 && (
                    <p className="text-xs text-red-600">
                      + {formatCurrency((pagamento.valor_juros || 0) + (pagamento.valor_multa || 0))}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Vencimento: {formatDate(pagamento.data_vencimento)}</span>
                {pagamento.status !== 'pago' && (
                  <button
                    onClick={() => handleMarcarPago(pagamento.id, pagamento.valor_parcela)}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                  >
                    Marcar Pago
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCalendario = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const pagamentosPorDia: Record<number, Pagamento[]> = {};
    filteredPagamentos.forEach(p => {
      const pagDate = new Date(p.data_vencimento);
      if (pagDate.getMonth() === month - 1 && pagDate.getFullYear() === year) {
        const dia = pagDate.getDate();
        if (!pagamentosPorDia[dia]) pagamentosPorDia[dia] = [];
        pagamentosPorDia[dia].push(p);
      }
    });

    const weeks = [];
    let currentWeek = new Array(7).fill(null);
    let dayCounter = 1;

    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek[i] = null;
    }

    for (let i = startingDayOfWeek; i < 7 && dayCounter <= daysInMonth; i++) {
      currentWeek[i] = dayCounter++;
    }
    weeks.push([...currentWeek]);

    while (dayCounter <= daysInMonth) {
      currentWeek = new Array(7).fill(null);
      for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
        currentWeek[i] = dayCounter++;
      }
      weeks.push([...currentWeek]);
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-line p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-charcoal">Calendário de Pagamentos</h3>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIndex) => {
                const pagamentosNoDia = day ? pagamentosPorDia[day] || [] : [];
                const temPagamento = pagamentosNoDia.length > 0;
                const valorTotal = pagamentosNoDia.reduce((sum, p) => sum + p.valor_parcela, 0);

                return (
                  <div
                    key={dayIndex}
                    className={`min-h-20 border rounded-lg p-2 ${
                      day ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                    } ${temPagamento ? 'border-gold-ak' : 'border-line'}`}
                  >
                    {day && (
                      <>
                        <div className="text-sm font-semibold text-charcoal mb-1">{day}</div>
                        {temPagamento && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-gold-ak">
                              {formatCurrency(valorTotal)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {pagamentosNoDia.length} pag.
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAgrupado = () => (
    <div className="space-y-4">
      {pagamentosPorCliente
        .filter(pc => pc.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(cliente => {
          const isExpanded = expandedClients.has(cliente.cliente_id);
          const temAtrasado = cliente.total_atrasados > 0;

          return (
            <div
              key={cliente.cliente_id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                temAtrasado ? 'border-red-500 ring-2 ring-red-500' : 'border-line'
              }`}
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleClientExpansion(cliente.cliente_id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                    <div>
                      <h3 className="font-bold text-charcoal">{cliente.cliente_nome}</h3>
                      <p className="text-sm text-gray-600">{cliente.cliente_telefone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-charcoal">
                      {formatCurrency(cliente.valor_pendente + cliente.valor_atrasado)}
                    </p>
                    <p className="text-xs text-gray-600">Total devido</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  {cliente.total_pendentes > 0 && (
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-gray-600">Pendentes</p>
                      <p className="text-sm font-bold text-blue-600">{cliente.total_pendentes}</p>
                      <p className="text-xs text-blue-600">{formatCurrency(cliente.valor_pendente)}</p>
                    </div>
                  )}
                  {cliente.total_atrasados > 0 && (
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-xs text-gray-600">Atrasados</p>
                      <p className="text-sm font-bold text-red-600">{cliente.total_atrasados}</p>
                      <p className="text-xs text-red-600">{formatCurrency(cliente.valor_atrasado)}</p>
                    </div>
                  )}
                  {cliente.total_pagos > 0 && (
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-gray-600">Pagos</p>
                      <p className="text-sm font-bold text-green-600">{cliente.total_pagos}</p>
                      <p className="text-xs text-green-600">{formatCurrency(cliente.valor_pago)}</p>
                    </div>
                  )}
                </div>

                {cliente.proximo_vencimento && (
                  <div className="mt-3 text-sm text-gray-600">
                    Próximo vencimento: {formatDate(cliente.proximo_vencimento)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );

  const renderProjecao = () => {
    const valorTotal = projecao.reduce((sum, p) => sum + Number(p.valor_previsto), 0);
    const maxValor = Math.max(...projecao.map(p => Number(p.valor_previsto)), 1);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-line p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-charcoal mb-2">Projeção de Recebimentos</h3>
          <p className="text-3xl font-bold text-gold-ak">{formatCurrency(valorTotal)}</p>
          <p className="text-sm text-gray-600">Total previsto nos próximos 90 dias</p>
        </div>

        <div className="space-y-3">
          {projecao.map(proj => {
            const percentual = (Number(proj.valor_previsto) / maxValor) * 100;

            return (
              <div key={proj.data} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{formatDate(proj.data)}</span>
                  <span className="font-bold text-charcoal">{formatCurrency(Number(proj.valor_previsto))}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-gold-ak to-amber-warning h-2.5 rounded-full transition-all"
                    style={{ width: `${percentual}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {proj.quantidade_pagamentos} pagamento{Number(proj.quantidade_pagamentos) > 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-charcoal">Pagamentos</h1>
        <div className="flex flex-wrap gap-2">
          {(['lista', 'timeline', 'calendario', 'agrupado', 'projecao'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                viewMode === mode
                  ? 'bg-gold-ak text-white'
                  : 'bg-white text-charcoal border border-line hover:bg-gray-50'
              }`}
            >
              {mode === 'lista' && 'Lista'}
              {mode === 'timeline' && 'Timeline'}
              {mode === 'calendario' && 'Calendário'}
              {mode === 'agrupado' && 'Por Cliente'}
              {mode === 'projecao' && 'Projeção'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {(['todos', 'vence_hoje', 'vence_semana', 'pendente', 'atrasado', 'pago'] as FilterStatus[]).map(status => {
          const count = totais[status as keyof typeof totais];
          const isActive = filter === status;
          const isAlert = (status === 'atrasado' || status === 'vence_hoje') && count > 0;

          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? 'border-gold-ak bg-silk'
                  : isAlert
                  ? 'border-red-500 bg-red-50 animate-pulse'
                  : 'border-line bg-white hover:border-gray-300'
              }`}
            >
              <p className={`text-2xl font-bold ${isAlert ? 'text-red-600' : 'text-charcoal'}`}>
                {typeof count === 'number' ? count : 0}
              </p>
              <p className="text-xs text-gray-600">
                {status === 'todos' && 'Todos'}
                {status === 'vence_hoje' && 'Vence Hoje'}
                {status === 'vence_semana' && 'Vence Semana'}
                {status === 'pendente' && 'Pendente'}
                {status === 'atrasado' && 'Atrasado'}
                {status === 'pago' && 'Pago'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">A Receber</p>
              <p className="text-2xl font-bold text-charcoal">{formatCurrency(totais.valor_pendente)}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Recebido</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totais.valor_recebido)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {viewMode !== 'calendario' && viewMode !== 'projecao' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent bg-white shadow-sm"
          />
        </div>
      )}

      {viewMode === 'lista' && (
        <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Parcela</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Vencimento</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPagamentos.map((pagamento) => {
                  const statusInfo = getStatusInfo(pagamento);
                  const StatusIcon = statusInfo.icon;
                  const valorTotal = pagamento.valor_parcela + (pagamento.valor_juros || 0) + (pagamento.valor_multa || 0);

                  return (
                    <tr key={pagamento.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-charcoal">{pagamento.cliente_nome}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{pagamento.numero_parcela}ª</td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-charcoal">{formatCurrency(valorTotal)}</div>
                        {((pagamento.valor_juros || 0) + (pagamento.valor_multa || 0)) > 0 && (
                          <div className="text-xs text-red-600">
                            + {formatCurrency((pagamento.valor_juros || 0) + (pagamento.valor_multa || 0))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{formatDate(pagamento.data_vencimento)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {pagamento.status !== 'pago' && (
                            <>
                              <button
                                onClick={() => abrirNegociacao(pagamento)}
                                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                              >
                                Negociar
                              </button>
                              <button
                                onClick={() => handleMarcarPago(pagamento.id, pagamento.valor_parcela)}
                                className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                              >
                                Marcar Pago
                              </button>
                            </>
                          )}
                          {pagamento.valor_negociado && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg font-medium">
                              Negociado
                            </span>
                          )}
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

      {viewMode === 'timeline' && renderTimeline()}
      {viewMode === 'calendario' && renderCalendario()}
      {viewMode === 'agrupado' && renderAgrupado()}
      {viewMode === 'projecao' && renderProjecao()}

      {/* Modal de Negociação */}
      {showNegociacaoModal && pagamentoNegociando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-line bg-gradient-to-r from-gold-ak to-amber-warning">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Negociar Pagamento</h2>
                <button
                  onClick={() => {
                    setShowNegociacaoModal(false);
                    setPagamentoNegociando(null);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-bold text-charcoal">{pagamentoNegociando.cliente_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Parcela:</span>
                  <span className="font-bold text-charcoal">{pagamentoNegociando.numero_parcela}ª</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Original:</span>
                  <span className="font-bold text-charcoal">{formatCurrency(pagamentoNegociando.valor_parcela)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vencimento:</span>
                  <span className="font-bold text-charcoal">{formatDate(pagamentoNegociando.data_vencimento)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Valor Negociado *</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorNegociado}
                  onChange={(e) => setValorNegociado(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Data da Negociação *</label>
                <input
                  type="date"
                  value={dataNegociacao}
                  onChange={(e) => setDataNegociacao(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Observações</label>
                <textarea
                  value={observacaoNegociacao}
                  onChange={(e) => setObservacaoNegociacao(e.target.value)}
                  placeholder="Detalhes sobre a negociação..."
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNegociacaoModal(false);
                    setPagamentoNegociando(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-line text-charcoal rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarNegociacao}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gold-ak to-amber-warning text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  Salvar Negociação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package2, Users, ShoppingBag, DollarSign, AlertCircle, TrendingUp, Award, TrendingDown, Calendar, ChevronDown, Receipt, Target, Activity } from 'lucide-react';

interface Stats {
  totalClientes: number;
  panosAtivos: number;
  vendasMes: number;
  valorVendasMes: number;
  pagamentosPendentes: number;
  comissaoTotal: number;
  pagamentosAtrasados: number;
  ticketMedio: number;
  produtosMaisVendidos: { nome: string; quantidade: number }[];
}

interface StatsComparison {
  current: Stats;
  previous: Stats;
}

interface ClienteRanking {
  id: string;
  nome: string;
  total: number;
}

type DateRange = 'today' | 'week' | 'month' | 'year' | 'all';

const dateRangeLabels = {
  today: 'Hoje',
  week: 'Esta Semana',
  month: 'Este Mês',
  year: 'Este Ano',
  all: 'Tudo'
};

interface HomeViewProps {
  onNavigate?: (view: string) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [statsComparison, setStatsComparison] = useState<StatsComparison>({
    current: {
      totalClientes: 0,
      panosAtivos: 0,
      vendasMes: 0,
      valorVendasMes: 0,
      pagamentosPendentes: 0,
      comissaoTotal: 0,
      pagamentosAtrasados: 0,
      ticketMedio: 0,
      produtosMaisVendidos: [],
    },
    previous: {
      totalClientes: 0,
      panosAtivos: 0,
      vendasMes: 0,
      valorVendasMes: 0,
      pagamentosPendentes: 0,
      comissaoTotal: 0,
      pagamentosAtrasados: 0,
      ticketMedio: 0,
      produtosMaisVendidos: [],
    }
  });
  const [topCompradores, setTopCompradores] = useState<ClienteRanking[]>([]);
  const [topPagadores, setTopPagadores] = useState<ClienteRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panos' }, loadStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const getDateRanges = () => {
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date = now;
    let previousStart: Date;
    let previousEnd: Date;

    switch (dateRange) {
      case 'all':
        currentStart = new Date(2000, 0, 1);
        previousStart = new Date(2000, 0, 1);
        previousEnd = new Date(2000, 0, 1);
        break;
      case 'today':
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - dayOfWeek);
        currentStart.setHours(0, 0, 0, 0);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        break;
      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'month':
      default:
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  };

  const loadStats = async () => {
    try {
      const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges();
      const isAll = dateRange === 'all';

      let currentVendasQuery = supabase.from('vendas').select('*');
      let previousVendasQuery = supabase.from('vendas').select('*');
      let itensVendidosQuery = supabase.from('vendas').select('itens_vendidos');

      if (!isAll) {
        currentVendasQuery = currentVendasQuery
          .gte('data_venda', currentStart.toISOString())
          .lte('data_venda', currentEnd.toISOString());

        previousVendasQuery = previousVendasQuery
          .gte('data_venda', previousStart.toISOString())
          .lte('data_venda', previousEnd.toISOString());

        itensVendidosQuery = itensVendidosQuery
          .gte('data_venda', currentStart.toISOString())
          .lte('data_venda', currentEnd.toISOString());
      }

      const [
        currentVendas,
        previousVendas,
        currentPagamentos,
        previousPagamentos,
        clientes,
        panos,
        comissoes,
        allClientes,
        allVendas,
        allPagamentos,
        pagamentosAtrasados,
        itensVendidos
      ] = await Promise.all([
        currentVendasQuery,
        previousVendasQuery,
        supabase.from('pagamentos').select('*').eq('status', 'pendente'),
        supabase.from('pagamentos').select('*').eq('status', 'pendente'),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('panos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('comissoes').select('valor_comissao'),
        supabase.from('clientes').select('*'),
        supabase.from('vendas').select('*'),
        supabase.from('pagamentos').select('*'),
        supabase.from('pagamentos').select('*').eq('status', 'pendente').lt('data_vencimento', new Date().toISOString()),
        itensVendidosQuery
      ]);

      const currentValorTotal = currentVendas.data?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0;
      const previousValorTotal = previousVendas.data?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0;
      const comissaoTotal = comissoes.data?.reduce((sum, c) => sum + Number(c.valor_comissao), 0) || 0;
      const currentTicketMedio = currentVendas.data?.length ? currentValorTotal / currentVendas.data.length : 0;
      const previousTicketMedio = previousVendas.data?.length ? previousValorTotal / previousVendas.data.length : 0;

      const produtosMap = new Map<string, number>();
      itensVendidos.data?.forEach(venda => {
        if (venda.itens_vendidos && Array.isArray(venda.itens_vendidos)) {
          venda.itens_vendidos.forEach((item: any) => {
            const nome = item.nome || 'Sem nome';
            produtosMap.set(nome, (produtosMap.get(nome) || 0) + (item.quantidade || 1));
          });
        }
      });

      const produtosMaisVendidos = Array.from(produtosMap.entries())
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      const clientesMap = new Map();
      (allClientes.data || []).forEach(c => {
        const clienteVendas = (allVendas.data || []).filter(v => v.cliente_id === c.id);
        const totalCompras = clienteVendas.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);
        const clientePagamentos = clienteVendas.flatMap(v => (allPagamentos.data || []).filter(p => p.venda_id === v.id));
        const pagamentosPontuais = clientePagamentos.filter(p => p.status === 'pago' && (!p.data_pagamento || new Date(p.data_pagamento) <= new Date(p.data_vencimento))).length;
        clientesMap.set(c.id, { id: c.id, nome: c.nome, totalCompras, pagamentosPontuais });
      });

      const rankingCompras = Array.from(clientesMap.values()).sort((a, b) => b.totalCompras - a.totalCompras).slice(0, 5).map(c => ({ id: c.id, nome: c.nome, total: c.totalCompras }));
      const rankingPagamentos = Array.from(clientesMap.values()).sort((a, b) => b.pagamentosPontuais - a.pagamentosPontuais).slice(0, 5).map(c => ({ id: c.id, nome: c.nome, total: c.pagamentosPontuais }));

      setStatsComparison({
        current: {
          totalClientes: clientes.count || 0,
          panosAtivos: panos.count || 0,
          vendasMes: currentVendas.data?.length || 0,
          valorVendasMes: currentValorTotal,
          pagamentosPendentes: currentPagamentos.data?.length || 0,
          comissaoTotal,
          pagamentosAtrasados: pagamentosAtrasados.count || 0,
          ticketMedio: currentTicketMedio,
          produtosMaisVendidos,
        },
        previous: {
          totalClientes: clientes.count || 0,
          panosAtivos: panos.count || 0,
          vendasMes: previousVendas.data?.length || 0,
          valorVendasMes: previousValorTotal,
          pagamentosPendentes: previousPagamentos.data?.length || 0,
          comissaoTotal,
          pagamentosAtrasados: 0,
          ticketMedio: previousTicketMedio,
          produtosMaisVendidos: [],
        }
      });
      setTopCompradores(rankingCompras);
      setTopPagadores(rankingPagamentos);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percent: 0, isPositive: true };
    const percent = ((current - previous) / previous) * 100;
    return { percent: Math.abs(percent), isPositive: percent >= 0 };
  };

  const handleCardClick = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const statCards = [
    {
      title: 'Total de Clientes',
      value: statsComparison.current.totalClientes,
      icon: Users,
      color: 'bg-blue-500',
      trend: calculateTrend(statsComparison.current.totalClientes, statsComparison.previous.totalClientes),
      view: 'clientes',
      clickable: true
    },
    {
      title: 'Panos Ativos',
      value: statsComparison.current.panosAtivos,
      icon: Package2,
      color: 'bg-emerald-500',
      trend: calculateTrend(statsComparison.current.panosAtivos, statsComparison.previous.panosAtivos),
      view: 'panos',
      clickable: true
    },
    {
      title: 'Vendas no Período',
      value: statsComparison.current.vendasMes,
      icon: ShoppingBag,
      color: 'bg-amber-500',
      trend: calculateTrend(statsComparison.current.vendasMes, statsComparison.previous.vendasMes),
      view: 'vendas',
      clickable: true
    },
    {
      title: 'Valor Vendas',
      value: `R$ ${statsComparison.current.valorVendasMes.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      trend: calculateTrend(statsComparison.current.valorVendasMes, statsComparison.previous.valorVendasMes),
      view: 'vendas',
      clickable: true
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${statsComparison.current.ticketMedio.toFixed(2)}`,
      icon: Receipt,
      color: 'bg-indigo-500',
      trend: calculateTrend(statsComparison.current.ticketMedio, statsComparison.previous.ticketMedio),
      view: 'vendas',
      clickable: true
    },
    {
      title: 'Comissão Total',
      value: `R$ ${statsComparison.current.comissaoTotal.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      trend: { percent: 0, isPositive: true },
      view: 'vendas',
      clickable: true
    },
    {
      title: 'Pagamentos Pendentes',
      value: statsComparison.current.pagamentosPendentes,
      icon: AlertCircle,
      color: 'bg-orange-500',
      trend: calculateTrend(statsComparison.current.pagamentosPendentes, statsComparison.previous.pagamentosPendentes),
      view: 'pagamentos',
      clickable: true
    },
    {
      title: 'Pagamentos Atrasados',
      value: statsComparison.current.pagamentosAtrasados,
      icon: AlertCircle,
      color: statsComparison.current.pagamentosAtrasados > 0 ? 'bg-red-500' : 'bg-gray-400',
      alert: statsComparison.current.pagamentosAtrasados > 0,
      trend: { percent: 0, isPositive: false },
      view: 'pagamentos',
      clickable: true
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-medium">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Carregando estatísticas...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-charcoal">Dashboard</h1>

        <div className="relative">
          <button
            onClick={() => setShowDateMenu(!showDateMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-line rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-charcoal">{dateRangeLabels[dateRange]}</span>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>

          {showDateMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-line z-50">
              {Object.entries(dateRangeLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setDateRange(key as DateRange);
                    setShowDateMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    dateRange === key ? 'bg-silk text-gold-ak font-medium' : 'text-charcoal'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const showTrend = card.trend.percent > 0;

          return (
            <div
              key={card.title}
              onClick={() => card.clickable && handleCardClick(card.view)}
              className={`bg-white rounded-xl shadow-sm border border-line p-4 sm:p-6 transition-all active:scale-95 ${
                card.clickable ? 'hover:shadow-md cursor-pointer' : ''
              } ${card.alert ? 'ring-2 ring-red-500 animate-pulse-slow' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">
                    {card.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal break-words">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-2.5 sm:p-3 rounded-lg flex-shrink-0`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>

              {showTrend && (
                <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${
                  card.trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.trend.isPositive ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span>
                    {card.trend.isPositive ? '+' : '-'}{card.trend.percent.toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1 hidden sm:inline">vs período anterior</span>
                </div>
              )}

              {card.alert && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  ⚠️ Atenção necessária!
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-gold-ak" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Top 5 - Quem Compra Mais</h2>
          </div>
          <div className="space-y-3">
            {topCompradores.length > 0 ? (
              topCompradores.map((cliente, idx) => (
                <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400">#{idx + 1}</span>
                    <span className="font-medium text-charcoal">{cliente.nome}</span>
                  </div>
                  <span className="font-bold text-gold-ak">R$ {cliente.total.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum cliente ainda</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Top 5 - Quem Paga Bem</h2>
          </div>
          <div className="space-y-3">
            {topPagadores.length > 0 ? (
              topPagadores.map((cliente, idx) => (
                <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400">#{idx + 1}</span>
                    <span className="font-medium text-charcoal">{cliente.nome}</span>
                  </div>
                  <span className="font-bold text-blue-600">{cliente.total} pag.</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum pagamento ainda</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-3 rounded-lg">
              <Target className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Top 5 - Produtos</h2>
          </div>
          <div className="space-y-3">
            {statsComparison.current.produtosMaisVendidos.length > 0 ? (
              statsComparison.current.produtosMaisVendidos.map((produto, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400">#{idx + 1}</span>
                    <span className="font-medium text-charcoal truncate">{produto.nome}</span>
                  </div>
                  <span className="font-bold text-amber-600">{produto.quantidade}x</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhuma venda ainda</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

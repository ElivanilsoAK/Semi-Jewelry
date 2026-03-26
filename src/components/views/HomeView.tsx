import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Package2, Users, ShoppingBag, DollarSign, AlertCircle, TrendingUp, TrendingDown, Calendar, ChevronDown, Receipt, Target, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stats {
  totalClientes: number;
  panosAtivos: number;
  vendasMes: number;
  valorVendasMes: number;
  pagamentosPendentes: number;
  comissaoTotal: number;
  pagamentosAtrasados: number;
  prestacaoContas: number;
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
  all: 'Todo Período'
};

const CHART_COLORS = ['#CBA052', '#3B82F6', '#059669', '#D48806', '#7C3AED'];
const PIE_COLORS = ['#059669', '#CBA052', '#DC2626']; // Pago, Pendente, Atrasado

interface HomeViewProps {
  onNavigate?: (view: string) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rawVendas, setRawVendas] = useState<any[]>([]);
  const [rawPagamentos, setRawPagamentos] = useState<any[]>([]);
  
  const [statsComparison, setStatsComparison] = useState<StatsComparison>({
    current: { totalClientes: 0, panosAtivos: 0, vendasMes: 0, valorVendasMes: 0, pagamentosPendentes: 0, comissaoTotal: 0, pagamentosAtrasados: 0, prestacaoContas: 0, produtosMaisVendidos: [] },
    previous: { totalClientes: 0, panosAtivos: 0, vendasMes: 0, valorVendasMes: 0, pagamentosPendentes: 0, comissaoTotal: 0, pagamentosAtrasados: 0, prestacaoContas: 0, produtosMaisVendidos: [] }
  });
  const [topCompradores, setTopCompradores] = useState<ClienteRanking[]>([]);

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
    let currentStart: Date, currentEnd: Date = now, previousStart: Date, previousEnd: Date;

    switch (dateRange) {
      case 'all':
        currentStart = new Date(2000, 0, 1);
        previousStart = new Date(2000, 0, 1);
        previousEnd = new Date(2000, 0, 1);
        break;
      case 'today':
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousEnd = new Date(currentStart); previousEnd.setDate(previousEnd.getDate() - 1);
        previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate());
        break;
      case 'week':
        currentStart = new Date(now); currentStart.setDate(now.getDate() - now.getDay()); currentStart.setHours(0, 0, 0, 0);
        previousStart = new Date(currentStart); previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart); previousEnd.setDate(previousEnd.getDate() - 1);
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
      setLoading(true);
      const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges();
      const isAll = dateRange === 'all';

      let currentVendasQuery = supabase.from('vendas').select('*');
      let previousVendasQuery = supabase.from('vendas').select('*');
      let itensVendidosQuery = supabase.from('itens_venda').select('quantidade, venda_id, itens_pano!inner(descricao)');

      if (!isAll) {
        currentVendasQuery = currentVendasQuery.gte('data_venda', currentStart.toISOString()).lte('data_venda', currentEnd.toISOString());
        previousVendasQuery = previousVendasQuery.gte('data_venda', previousStart.toISOString()).lte('data_venda', previousEnd.toISOString());
        const { data: vendasIdsData } = await supabase.from('vendas').select('id').gte('data_venda', currentStart.toISOString()).lte('data_venda', currentEnd.toISOString());
        if (vendasIdsData?.length) {
          itensVendidosQuery = itensVendidosQuery.in('venda_id', vendasIdsData.map(v => v.id));
        }
      }

      const [
        currentVendas, previousVendas,
        clientesCount, panosCount, configSistema,
        allClientes, allVendas, allPagamentos, itensVendidos
      ] = await Promise.all([
        currentVendasQuery, previousVendasQuery,
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('panos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('configuracoes_sistema').select('*').maybeSingle(),
        supabase.from('clientes').select('*'),
        supabase.from('vendas').select('*'), // Pegamos todo para o grÃ¡fico
        supabase.from('pagamentos').select('*'), // Todo para donutchart
        itensVendidosQuery
      ]);

      setRawVendas(allVendas.data || []);
      setRawPagamentos(allPagamentos.data || []);

      const percentComissao = configSistema.data?.percentual_comissao ?? 10;
      const percentPrestacao = configSistema.data?.percentual_prestacao_contas ?? 60;

      const currentValorTotal = (currentVendas.data || []).reduce((sum, v) => sum + Number(v.valor_total), 0);
      const previousValorTotal = (previousVendas.data || []).reduce((sum, v) => sum + Number(v.valor_total), 0);
      const comissaoTotal = (currentValorTotal * percentComissao) / 100;
      const currentPrestacao = (currentValorTotal * percentPrestacao) / 100;
      const previousPrestacao = (previousValorTotal * percentPrestacao) / 100;

      // Pegar pendentes e atrasados baseado em allPagamentos + current dates limit? 
      // Simplified for KPIs: just global pending vs delayed to matching date range
      let filteredPagamentos = allPagamentos.data || [];
      if (!isAll) {
         filteredPagamentos = filteredPagamentos.filter(p => new Date(p.data_vencimento) >= currentStart && new Date(p.data_vencimento) <= currentEnd);
      }
      const pendingCount = filteredPagamentos.filter(p => p.status === 'pendente').length;
      const delayedCount = filteredPagamentos.filter(p => p.status === 'pendente' && new Date(p.data_vencimento) < new Date()).length;

      const produtosMap = new Map<string, number>();
      (itensVendidos.data || []).forEach(item => {
        const nome = item.itens_pano?.descricao || 'Sem nome';
        produtosMap.set(nome, (produtosMap.get(nome) || 0) + (item.quantidade || 1));
      });
      const topProdutos = Array.from(produtosMap.entries()).map(([nome, quantidade]) => ({ nome, quantidade })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

      const clientesMap = new Map();
      (allClientes.data || []).forEach(c => {
        const cTotal = (allVendas.data || []).filter(v => v.cliente_id === c.id).reduce((s, v) => s + Number(v.valor_total), 0);
        clientesMap.set(c.id, { id: c.id, nome: c.nome, total: cTotal });
      });
      setTopCompradores(Array.from(clientesMap.values()).sort((a, b) => b.total - a.total).slice(0, 5));

      setStatsComparison({
        current: {
          totalClientes: clientesCount.count || 0,
          panosAtivos: panosCount.count || 0,
          vendasMes: currentVendas.data?.length || 0,
          valorVendasMes: currentValorTotal,
          pagamentosPendentes: pendingCount,
          comissaoTotal,
          pagamentosAtrasados: delayedCount,
          prestacaoContas: currentPrestacao,
          produtosMaisVendidos: topProdutos,
        },
        previous: {
          totalClientes: clientesCount.count || 0,
          panosAtivos: panosCount.count || 0,
          vendasMes: previousVendas.data?.length || 0,
          valorVendasMes: previousValorTotal,
          pagamentosPendentes: 0,
          comissaoTotal,
          pagamentosAtrasados: 0,
          prestacaoContas: previousPrestacao,
          produtosMaisVendidos: [],
        }
      });
    } catch (error) {
      console.error('Home stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percent: 0, isPositive: true };
    const percent = ((current - previous) / previous) * 100;
    return { percent: Math.abs(percent), isPositive: percent >= 0 };
  };

  // ----- Chart Data Aggregators -----
  const chartData6Months = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      const monthName = format(monthStart, 'MMM', { locale: ptBR });
      
      const total = rawVendas
        .filter(v => parseISO(v.data_venda) >= monthStart && parseISO(v.data_venda) <= monthEnd)
        .reduce((sum, v) => sum + Number(v.valor_total), 0);
        
      data.push({ name: monthName.toUpperCase(), Vendas: total });
    }
    return data;
  }, [rawVendas]);

  const pieDataPagamentos = useMemo(() => {
    const pagos = rawPagamentos.filter(p => p.status === 'pago').length;
    const pendentes = rawPagamentos.filter(p => p.status === 'pendente' && new Date(p.data_vencimento) >= new Date()).length;
    const atrasados = rawPagamentos.filter(p => p.status === 'pendente' && new Date(p.data_vencimento) < new Date()).length;
    
    return [
      { name: 'Pagos', value: pagos },
      { name: 'Pendentes', value: pendentes },
      { name: 'Atrasados', value: atrasados },
    ].filter(d => d.value > 0);
  }, [rawPagamentos]);

  // ----------------------------------

  const cards = [
    { title: 'Valor Vendas', value: `R$ ${statsComparison.current.valorVendasMes.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-success', bg: 'bg-emerald-light', trend: calculateTrend(statsComparison.current.valorVendasMes, statsComparison.previous.valorVendasMes), view: 'vendas' },
    { title: 'Comissão', value: `R$ ${statsComparison.current.comissaoTotal.toFixed(2)}`, icon: TrendingUp, color: 'text-gold-ak', bg: 'bg-amber-light', trend: { percent: 0, isPositive: true }, view: 'vendas' },
    { title: 'Pedidos', value: statsComparison.current.vendasMes, icon: ShoppingBag, color: 'text-sapphire-info', bg: 'bg-sapphire-light', trend: calculateTrend(statsComparison.current.vendasMes, statsComparison.previous.vendasMes), view: 'vendas' },
    { title: 'Atrasados', value: statsComparison.current.pagamentosAtrasados, icon: AlertCircle, color: 'text-ruby-critical', bg: 'bg-ruby-light', trend: { percent: 0, isPositive: false }, view: 'pagamentos', alert: statsComparison.current.pagamentosAtrasados > 0 },
  ];

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col justify-center items-center py-32 opacity-70">
        <div className="w-12 h-12 border-4 border-gold-ak/30 border-t-gold-ak rounded-full animate-spin shadow-[0_0_15px_#CBA052_inset]"></div>
        <p className="mt-4 text-charcoal font-semibold animate-pulse tracking-widest text-sm uppercase">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-line">
        <div>
          <h1 className="text-2xl font-black text-charcoal">Resumo do Sistema</h1>
          <p className="text-gray-500 text-sm font-medium">Acompanhe seus resultados e estatísticas</p>
        </div>

        <div className="relative z-10">
          <button onClick={() => setShowDateMenu(!showDateMenu)} className="flex items-center gap-2 px-5 py-2.5 bg-ice hover:bg-gray-200 text-charcoal rounded-xl transition-colors font-semibold shadow-inner border border-line">
            <Calendar className="w-4 h-4 text-gold-ak" />
            {dateRangeLabels[dateRange]}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showDateMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-line overflow-hidden animate-slide-up origin-top">
              {Object.entries(dateRangeLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setDateRange(key as DateRange); setShowDateMenu(false); }}
                  className={`w-full text-left px-5 py-3 text-sm transition-colors ${
                    dateRange === key ? 'bg-gold-ak text-white font-bold' : 'text-gray-700 hover:bg-ice font-medium'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} onClick={() => onNavigate?.(c.view)} className={`card-stat cursor-pointer flex flex-col justify-between h-[140px] relative overflow-hidden group ${c.alert ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20' : ''}`}>
              <div className="flex justify-between items-start z-10 w-full">
                <div className={`p-3 rounded-xl ${c.bg} ${c.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                {c.trend.percent > 0 && (
                  <span className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded-full ${c.trend.isPositive ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                    {c.trend.isPositive ? '+' : '-'}{c.trend.percent.toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="z-10 mt-auto">
                <p className="text-sm font-semibold text-gray-500">{c.title}</p>
                <h3 className="text-2xl font-black text-charcoal truncate">{c.value}</h3>
              </div>
              
              {/* Decorative background element sparkline placeholder */}
              <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-10 flex items-end">
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                  <path d={c.trend.isPositive ? "M0,30 L20,15 L40,20 L60,5 L80,10 L100,0 V30 Z" : "M0,0 L20,10 L40,5 L60,20 L80,15 L100,30 V30 Z"} fill={c.color.replace('text-', '')} />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Área (Vendas 6 meses) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-line p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-charcoal">Receita de Vendas (6 meses)</h2>
            <div className="bg-silk text-gold-ak px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest">Evolução</div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData6Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CBA052" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#CBA052" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                />
                <Area type="monotone" dataKey="Vendas" stroke="#CBA052" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Donut (Pagamentos) */}
        <div className="bg-white rounded-2xl shadow-sm border border-line p-6 flex flex-col">
          <h2 className="text-lg font-bold text-charcoal mb-2">Status de Pagamentos</h2>
          <p className="text-xs text-gray-500 mb-6 font-medium">Visão global dos recebimentos ativos</p>
          
          <div className="h-48 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieDataPagamentos.length ? pieDataPagamentos : [{name: 'Sem dados', value: 1}]}
                  cx="50%" cy="50%" 
                  innerRadius={60} outerRadius={80} 
                  paddingAngle={5} dataKey="value"
                  stroke="none"
                >
                  {pieDataPagamentos.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: number) => [value, 'Títulos']}
                   contentStyle={{borderRadius: '8px', border: 'none', fontWeight: 'bold'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {pieDataPagamentos.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[i]}}></div>
                <span className="text-xs font-bold text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rankings Row (Top Buyers, Products) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Compradores - Grafico de Barras Horizontais */}
        <div className="bg-white rounded-2xl shadow-sm border border-line p-6">
           <h2 className="text-lg font-bold text-charcoal mb-6 flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-sapphire-light text-sapphire-info flex items-center justify-center">
               <Target className="w-4 h-4" />
             </div>
             Top 5 Melhores Clientes
           </h2>
           
           <div className="space-y-4">
             {topCompradores.length > 0 ? topCompradores.map((c, i) => {
                const max = topCompradores[0].total;
                const percent = (c.total / max) * 100;
                
                return (
                  <div key={i} className="relative">
                    <div className="flex justify-between text-sm font-semibold text-charcoal mb-1">
                      <span>{i+1}. {c.nome}</span>
                      <span className="text-sapphire-info">R$ {c.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-ice rounded-full h-2.5 overflow-hidden">
                       <div 
                         className="bg-gradient-to-r from-sapphire-info to-blue-400 h-full rounded-full animate-bar-grow" 
                         style={{width: `${percent}%`}}
                       ></div>
                    </div>
                  </div>
                );
             }) : (
               <div className="text-center py-10 text-gray-400 font-medium">Sem dados no período.</div>
             )}
           </div>
        </div>

        {/* Top 5 Produtos - Lista Estilizada */}
        <div className="bg-white rounded-2xl shadow-sm border border-line p-6">
           <h2 className="text-lg font-bold text-charcoal mb-6 flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-amber-light text-gold-ak flex items-center justify-center">
               <Package2 className="w-4 h-4" />
             </div>
             Produtos Mais Vendidos
           </h2>

           <div className="space-y-3">
             {statsComparison.current.produtosMaisVendidos.length > 0 ? (
               statsComparison.current.produtosMaisVendidos.map((prod, i) => (
                 <div key={i} className="flex items-center p-3 rounded-xl bg-ice border border-transparent hover:border-gold-ak/30 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gold-ak font-black mr-4 group-hover:bg-gold-ak group-hover:text-white transition-colors">
                      {i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-charcoal truncate text-sm">{prod.nome}</p>
                    </div>
                    <div className="badge-gold">
                      {prod.quantidade} un
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-10 text-gray-400 font-medium">Sem vendas de itens no período.</div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}

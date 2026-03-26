import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Printer, Calendar, TrendingUp, Package,
  BookOpen, BarChart3, PieChart, Settings, Plus, Trash2, DollarSign, Wallet
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CatalogoService } from '../../services/catalogoService';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ItemEstoque {
  id: string;
  descricao: string;
  categoria: string;
  valor_unitario: number;
  quantidade_disponivel: number;
  foto_url?: string;
}

interface Venda {
  id: string;
  data_venda: string;
  valor_total: number;
  status_pagamento: string;
  clientes: { nome: string };
}

interface RelatorioCustomizado {
  id?: string;
  nome: string;
  tipo: string;
  colunas: string[];
  filtros: any;
}

export default function RelatoriosView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'financeiro' | 'catalogo' | 'vendas' | 'customizado'>('financeiro');
  
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [todasVendas, setTodasVendas] = useState<Venda[]>([]);
  const [configSistema, setConfigSistema] = useState<any>(null);
  
  const [relatoriosSalvos, setRelatoriosSalvos] = useState<RelatorioCustomizado[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [nomeConsultora, setNomeConsultora] = useState('');

  const [novoRelatorio, setNovoRelatorio] = useState<RelatorioCustomizado>({
    nome: '',
    tipo: 'vendas',
    colunas: [],
    filtros: {}
  });

  useEffect(() => {
    if (!user?.id) return;
    carregarNomeConsultora();
    carregarConfiguracoes();
    
    if (activeTab === 'catalogo') carregarItensEstoque();
    if (activeTab === 'vendas') carregarVendas();
    if (activeTab === 'customizado') carregarRelatoriosSalvos();
    if (activeTab === 'financeiro') carregarTodasVendas();
  }, [activeTab, user]);

  async function carregarConfiguracoes() {
    const { data } = await supabase.from('configuracoes_sistema').select('*').maybeSingle();
    setConfigSistema(data);
  }

  async function carregarTodasVendas() {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase.from('vendas').select('id, data_venda, valor_total').order('data_venda', { ascending: false });
    if (data) setTodasVendas(data);
    setLoading(false);
  }

  async function carregarNomeConsultora() {
    const { data } = await supabase.from('configuracoes_loja').select('nome_loja').eq('user_id', user?.id).maybeSingle();
    if (data?.nome_loja) setNomeConsultora(data.nome_loja);
  }

  async function carregarItensEstoque() {
    setLoading(true);
    const { data, error } = await supabase.from('itens_pano').select('*').gt('quantidade_disponivel', 0).order('categoria', { ascending: true });
    if (error) toast.error('Erro ao carregar estoque');
    else if (data) setItensEstoque(data);
    setLoading(false);
  }

  async function carregarVendas() {
    setLoading(true);
    let query = supabase.from('vendas_detalhadas').select('*').order('data_venda', { ascending: false });
    if (dataInicio) query = query.gte('data_venda', dataInicio);
    if (dataFim)    query = query.lte('data_venda', dataFim);

    const { data, error } = await query;
    if (error) toast.error('Erro ao carregar vendas');
    else if (data) {
      setVendas(data.map((v: any) => ({
        id: v.id, data_venda: v.data_venda, valor_total: v.valor_total, status_pagamento: v.status_pagamento, clientes: { nome: v.cliente_nome }
      })));
    }
    setLoading(false);
  }

  async function carregarRelatoriosSalvos() {
    const { data } = await supabase.from('relatorios_salvos').select('*').order('created_at', { ascending: false });
    if (data) setRelatoriosSalvos(data);
  }

  async function salvarRelatorio() {
    if (!novoRelatorio.nome) return toast.error('Digite um nome');
    if (novoRelatorio.colunas.length === 0) return toast.error('Selecione colunas');

    const { error } = await supabase.from('relatorios_salvos').insert([{
      user_id: user?.id, nome: novoRelatorio.nome, tipo: novoRelatorio.tipo, filtros: novoRelatorio.filtros, configuracoes: { colunas: novoRelatorio.colunas }
    }]);

    if (!error) {
      toast.success('Relatório salvo com sucesso!');
      setNovoRelatorio({ nome: '', tipo: 'vendas', colunas: [], filtros: {} });
      carregarRelatoriosSalvos();
    } else toast.error('Falha ao salvar relatório');
  }

  async function excluirRelatorio(id: string) {
    // Custom simple confirmation instead of noisy blocked native confirm
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold">Apagar relatório?</p>
        <div className="flex gap-2">
          <button className="bg-red-500 text-white px-3 py-1 rounded text-sm" onClick={async () => {
             toast.dismiss(t.id);
             await supabase.from('relatorios_salvos').delete().eq('id', id);
             toast.success('Excluído.');
             carregarRelatoriosSalvos();
          }}>Sim, apagar</button>
          <button className="bg-gray-200 text-charcoal px-3 py-1 rounded text-sm" onClick={() => toast.dismiss(t.id)}>Cancelar</button>
        </div>
      </div>
    ), { duration: 5000 });
  }

  async function gerarCatalogoPDF() {
    if(itensEstoque.length === 0) return toast.error('Nenhum item em estoque.');
    
    setLoading(true);
    const toastId = toast.loading('Gerando catálogo PDF (alta qualidade)...');
    try {
      await CatalogoService.gerarCatalogoPDF(itensEstoque, nomeConsultora || 'SPHERE');
      toast.success('Catálogo gerado e baixado!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao gerar catálogo.', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  function exportarVendasExcel() {
    const csv = [['Data', 'Cliente', 'Valor Total', 'Status Pagamento'],
      ...vendas.map(v => [new Date(v.data_venda).toLocaleDateString('pt-BR'), v.clientes.nome, v.valor_total.toFixed(2), v.status_pagamento])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Planilha gerada!');
  }

  async function exportarVendasPDF() {
    setLoading(true);
    const toastId = toast.loading('Montando PDF...');
    try {
      await CatalogoService.gerarRelatorioVendasPDF(vendas, nomeConsultora || 'SPHERE', dataInicio, dataFim);
      toast.success('Relatório de Vendas gerado!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao gerar PDF.', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  // --- Processamento GrÃ¡fico Financeiro --- //
  const financeiroData = useMemo(() => {
    if(!todasVendas.length || !configSistema) return [];
    
    const pctComissao = configSistema.percentual_comissao ?? 10;
    const pctPrestacao = configSistema.percentual_prestacao_contas ?? 60;
    
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const start = startOfMonth(subMonths(new Date(), i));
      const end = endOfMonth(subMonths(new Date(), i));
      const mName = format(start, 'MMM', { locale: ptBR }).toUpperCase();
      
      const mesVendas = todasVendas.filter(v => parseISO(v.data_venda) >= start && parseISO(v.data_venda) <= end);
      const receita = mesVendas.reduce((sum, v) => sum + Number(v.valor_total), 0);
      
      const comissao = (receita * pctComissao) / 100;
      const prestacao = (receita * pctPrestacao) / 100;
      const lucro = receita - comissao - prestacao;

      data.push({
        mes: mName,
        Receita: receita,
        Prestacao: prestacao,
        Comissao: comissao,
        Lucro: lucro > 0 ? lucro : 0
      });
    }
    return data;
  }, [todasVendas, configSistema]);

  const kpisFinanceiro = useMemo(() => {
    if(financeiroData.length === 0) return { r: 0, p: 0, c: 0, l: 0 };
    // Ultimo mÃªs Ã© o array[-1]
    const atual = financeiroData[financeiroData.length - 1];
    return { r: atual.Receita, p: atual.Prestacao, c: atual.Comissao, l: atual.Lucro };
  }, [financeiroData]);

  const tabs = [
    { id: 'financeiro', label: 'DRE Financeiro', icon: DollarSign },
    { id: 'catalogo', label: 'Catálogo Visual', icon: BookOpen },
    { id: 'vendas', label: 'Extrato Vendas', icon: BarChart3 },
    { id: 'customizado', label: 'Rel. Customizados', icon: Settings }
  ] as const;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-line">
        <div>
          <h1 className="text-2xl font-black text-charcoal">Centro de Relatórios</h1>
          <p className="text-gray-500 font-medium">Extração de dados analíticos e confecção de catálogos</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 p-1 bg-white border border-line rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 text-sm whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gold-ak text-white shadow-md scale-[1.02]'
                : 'text-gray-500 hover:bg-ice hover:text-charcoal'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'financeiro' && (
        <div className="space-y-6 animate-slide-up">
           <div className="bg-dark-sidebar rounded-2xl p-6 text-white bg-cover relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-gold-gradient opacity-10"></div>
             <h2 className="text-xl font-bold flex items-center gap-2 relative z-10"><Wallet className="text-gold-ak"/> Resultado Mês Atual</h2>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6 relative z-10">
                <div>
                   <p className="text-gray-400 text-sm font-medium mb-1">Receita Total</p>
                   <p className="text-2xl font-black text-white">R$ {kpisFinanceiro.r.toFixed(2)}</p>
                </div>
                <div>
                   <p className="text-gray-400 text-sm font-medium mb-1">Custo Mercadoria</p>
                   <p className="text-2xl font-black text-ruby-400">R$ {kpisFinanceiro.p.toFixed(2)}</p>
                </div>
                <div>
                   <p className="text-gray-400 text-sm font-medium mb-1">Comissões</p>
                   <p className="text-2xl font-black text-amber-warning">R$ {kpisFinanceiro.c.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                   <p className="text-white text-sm font-medium mb-1">Lucro Estimado</p>
                   <p className="text-2xl font-black text-emerald-400">R$ {kpisFinanceiro.l.toFixed(2)}</p>
                </div>
             </div>
           </div>

           <div className="bg-white rounded-2xl shadow-sm border border-line p-6">
              <h3 className="font-bold text-charcoal mb-6 text-lg">Projeção DRE (Últimos 6 meses)</h3>
              <div className="h-80 w-full">
                {financeiroData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financeiroData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#888', fontWeight: 600}} dy={10} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'10px', border:'none', boxShadow:'0 10px 25px rgba(0,0,0,0.1)', fontWeight:'bold'}} formatter={(v:number) => `R$ ${v.toFixed(2)}`} />
                      <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                      <Bar dataKey="Prestacao" name="Custos" stackId="a" fill="#DC2626" radius={[0,0,4,4]} />
                      <Bar dataKey="Comissao" name="Comissões" stackId="a" fill="#D48806" />
                      <Bar dataKey="Lucro" name="Lucro Bruto" stackId="a" fill="#059669" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 font-medium">Carregando gráfico...</div>
                )}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'catalogo' && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-gradient-to-r from-gold-ak to-amber-warning rounded-2xl p-6 text-white shadow-glow-sm">
            <h2 className="text-2xl font-bold mb-1">Catálogo Inteligente</h2>
            <p className="opacity-90 font-medium text-sm">Organiza as fotos em 3 colunas e aplica branco puro de fundo. Apenas itens com estoque &gt; 0 aparecem.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={gerarCatalogoPDF}
              disabled={loading || itensEstoque.length === 0}
              className="btn-primary"
            >
              <Printer className="w-5 h-5" />
              {loading ? 'Processando (aguarde)...' : 'Baixar Catálogo PDF'}
            </button>
            <div className="px-4 py-2 border border-line rounded-lg bg-white font-medium text-sm flex items-center gap-2 text-charcoal">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               {itensEstoque.length} itens prontos para o PDF
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
               <div className="w-12 h-12 border-4 border-gold-ak/30 border-t-gold-ak rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-gray-600 font-bold loading-pulse">Processando imagens do catálogo...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {itensEstoque.map(item => (
                <div key={item.id} className="bg-white border border-line rounded-xl overflow-hidden hover:border-gold-ak transition-all group hover:shadow-lg">
                  <div className="h-32 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    {item.foto_url ? (
                      <img src={item.foto_url} alt={item.descricao} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Package className="w-10 h-10 text-gray-300" />
                    )}
                    <div className="absolute top-2 right-2 badge-green !bg-white/90 backdrop-blur !shadow-sm">
                        Qtd: {item.quantidade_disponivel}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{item.categoria}</p>
                    <h3 className="font-semibold text-charcoal text-sm line-clamp-2 leading-tight mb-2 h-10">{item.descricao}</h3>
                    <div className="font-black text-gold-ak">R$ {item.valor_unitario.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendas' && (
        <div className="space-y-6 animate-slide-up">
           <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
            <h3 className="font-bold text-charcoal mb-4">Filtrar Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                 <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input-field" />
              </div>
              <div>
                 <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input-field" />
              </div>
              <div>
                <button onClick={carregarVendas} className="w-full btn-primary h-[44px]">Aplicar Filtros</button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
             <button onClick={exportarVendasPDF} disabled={vendas.length === 0} className="btn-secondary group hover:border-red-200">
               <FileText className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" /> PDF
             </button>
             <button onClick={exportarVendasExcel} disabled={vendas.length === 0} className="btn-secondary group hover:border-green-200">
               <Download className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" /> Planilha (CSV)
             </button>
             <div className="ml-auto bg-ice px-4 py-2 rounded-lg font-bold text-charcoal">
                Total do filtro: <span className="text-gold-ak ml-2">R$ {vendas.reduce((s,v)=>s+v.valor_total,0).toFixed(2)}</span>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-line overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-line">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Valor Total</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {vendas.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-medium">Nenhuma venda encontrada no filtro.</td></tr>
                  ) : vendas.map(venda => (
                    <tr key={venda.id} className="hover:bg-ice/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{new Date(venda.data_venda).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-sm font-bold text-charcoal">{venda.clientes.nome}</td>
                      <td className="px-6 py-4 text-sm font-black text-charcoal">R$ {venda.valor_total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {venda.status_pagamento === 'pago' ? <span className="badge-green">Pago</span> : <span className="badge-orange">Restaurar</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customizado' && (
        <div className="space-y-6 animate-slide-up">
           <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
               <h3 className="font-bold text-charcoal mb-4">Montador de Query</h3>
               {/* Componente base original mantido para salvar */}
               <div className="space-y-4 max-w-2xl">
                   <input type="text" placeholder="Nome Ex: Top Vendas do Ano" value={novoRelatorio.nome} onChange={(e) => setNovoRelatorio({...novoRelatorio, nome: e.target.value})} className="input-field" />
                   <select value={novoRelatorio.tipo} onChange={(e) => setNovoRelatorio({...novoRelatorio, tipo: e.target.value, colunas: []})} className="input-field">
                     <option value="vendas">Visualização de Vendas</option>
                     <option value="clientes">Visualização de Clientes</option>
                   </select>
                   <p className="text-sm font-bold text-gray-500 mt-4 mb-2">Selecione Colunas Finais</p>
                   {/* colunas ficticias mantidas como original */}
                    <div className="flex gap-4">
                       <label className="flex items-center gap-2 p-3 border border-line rounded-lg cursor-pointer hover:border-gold-ak bg-ice"><input type="checkbox" className="w-4 h-4" checked={novoRelatorio.colunas.includes('data')} onChange={(e) => setNovoRelatorio({...novoRelatorio, colunas: e.target.checked? ['data',...novoRelatorio.colunas] : novoRelatorio.colunas.filter(v=>v!=='data')})} /> <span>Data / Momento</span></label>
                       <label className="flex items-center gap-2 p-3 border border-line rounded-lg cursor-pointer hover:border-gold-ak bg-ice"><input type="checkbox" className="w-4 h-4" checked={novoRelatorio.colunas.includes('total')} onChange={(e) => setNovoRelatorio({...novoRelatorio, colunas: e.target.checked? ['total',...novoRelatorio.colunas] : novoRelatorio.colunas.filter(v=>v!=='total')})} /> <span>Valor Financeiro</span></label>
                    </div>
                   <button onClick={salvarRelatorio} className="btn-primary w-fit mt-4">Salvar Relatório de View</button>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {relatoriosSalvos.map(rel => (
                  <div key={rel.id} className="bg-white border border-line rounded-2xl p-5 hover:border-gold-ak transition-colors hover:shadow-md">
                     <div className="flex justify-between">
                        <div><h4 className="font-bold text-charcoal">{rel.nome}</h4><p className="text-xs font-bold text-gray-400 tracking-wider uppercase">{rel.tipo}</p></div>
                        <button onClick={() => excluirRelatorio(rel.id!)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 className="w-5 h-5"/></button>
                     </div>
                     <button className="w-full mt-4 bg-ice hover:bg-gray-200 text-charcoal font-bold text-sm py-2 rounded-lg transition-colors">Abrir Dados (Em breve)</button>
                  </div>
               ))}
           </div>
        </div>
      )}

    </div>
  );
}

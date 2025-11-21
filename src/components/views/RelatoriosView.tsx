import { useState, useEffect } from 'react';
import {
  FileText, Download, Printer, Calendar, TrendingUp, Package,
  BookOpen, BarChart3, PieChart, Settings, Plus, Trash2, Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CatalogoService } from '../../services/catalogoService';

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
  const [activeTab, setActiveTab] = useState<'catalogo' | 'vendas' | 'customizado'>('catalogo');
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
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
    if (activeTab === 'catalogo') {
      carregarItensEstoque();
    } else if (activeTab === 'vendas') {
      carregarVendas();
    } else if (activeTab === 'customizado') {
      carregarRelatoriosSalvos();
    }
  }, [activeTab, user]);

  async function carregarNomeConsultora() {
    const { data } = await supabase
      .from('configuracoes_loja')
      .select('nome_loja')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data?.nome_loja) {
      setNomeConsultora(data.nome_loja);
    }
  }

  async function carregarItensEstoque() {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('itens_pano')
      .select('*')
      .order('categoria', { ascending: true });

    if (error) {
      console.error('Erro ao carregar estoque:', error);
      alert('Erro ao carregar itens de estoque');
    } else if (data) {
      setItensEstoque(data);
    }
    setLoading(false);
  }

  async function carregarVendas() {
    if (!user?.id) return;
    setLoading(true);
    let query = supabase
      .from('vendas_detalhadas')
      .select('*')
      .order('data_venda', { ascending: false });

    if (dataInicio) query = query.gte('data_venda', dataInicio);
    if (dataFim) query = query.lte('data_venda', dataFim);

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao carregar vendas:', error);
      alert('Erro ao carregar vendas');
    } else if (data) {
      setVendas(data.map((v: any) => ({
        id: v.id,
        data_venda: v.data_venda,
        valor_total: v.valor_total,
        status_pagamento: v.status_pagamento,
        clientes: { nome: v.cliente_nome }
      })));
    }
    setLoading(false);
  }

  async function carregarRelatoriosSalvos() {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('relatorios_salvos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar relatórios:', error);
    } else if (data) {
      setRelatoriosSalvos(data);
    }
  }

  async function salvarRelatorio() {
    if (!novoRelatorio.nome) {
      alert('Digite um nome para o relatório');
      return;
    }

    const { error } = await supabase
      .from('relatorios_salvos')
      .insert([{
        user_id: user?.id,
        nome: novoRelatorio.nome,
        tipo: novoRelatorio.tipo,
        filtros: novoRelatorio.filtros,
        configuracoes: { colunas: novoRelatorio.colunas }
      }]);

    if (!error) {
      alert('Relatório salvo com sucesso!');
      setNovoRelatorio({ nome: '', tipo: 'vendas', colunas: [], filtros: {} });
      carregarRelatoriosSalvos();
    }
  }

  async function excluirRelatorio(id: string) {
    if (!confirm('Deseja excluir este relatório?')) return;

    await supabase
      .from('relatorios_salvos')
      .delete()
      .eq('id', id);

    carregarRelatoriosSalvos();
  }

  async function gerarCatalogoPDF() {
    setLoading(true);
    try {
      await CatalogoService.gerarCatalogoPDF(itensEstoque, nomeConsultora || 'SPHERE');
      alert('✅ Catálogo gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar catálogo:', error);
      alert('❌ Erro ao gerar catálogo. Verifique se há produtos disponíveis.');
    } finally {
      setLoading(false);
    }
  }

  function exportarVendasExcel() {
    const csv = [
      ['Data', 'Cliente', 'Valor Total', 'Status Pagamento'],
      ...vendas.map(v => [
        new Date(v.data_venda).toLocaleDateString('pt-BR'),
        v.clientes.nome,
        v.valor_total.toFixed(2),
        v.status_pagamento
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  async function exportarVendasPDF() {
    setLoading(true);
    try {
      await CatalogoService.gerarRelatorioVendasPDF(
        vendas,
        nomeConsultora || 'SPHERE',
        dataInicio,
        dataFim
      );
      alert('✅ Relatório de vendas gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('❌ Erro ao gerar relatório de vendas.');
    } finally {
      setLoading(false);
    }
  }

  const colunasDisponiveis = {
    vendas: [
      { id: 'data_venda', nome: 'Data' },
      { id: 'cliente', nome: 'Cliente' },
      { id: 'valor_total', nome: 'Valor Total' },
      { id: 'status_pagamento', nome: 'Status Pagamento' },
      { id: 'forma_pagamento', nome: 'Forma Pagamento' }
    ],
    clientes: [
      { id: 'nome', nome: 'Nome' },
      { id: 'telefone', nome: 'Telefone' },
      { id: 'email', nome: 'Email' },
      { id: 'total_compras', nome: 'Total de Compras' },
      { id: 'valor_total', nome: 'Valor Total Gasto' }
    ]
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-charcoal mb-2">Relatórios</h1>
          <p className="text-gray-600">Visualize e exporte seus dados</p>
        </div>
      </div>

      <div className="flex gap-3 border-b border-line">
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'catalogo'
              ? 'text-gold-ak border-b-2 border-gold-ak'
              : 'text-gray-500 hover:text-charcoal'
          }`}
        >
          <BookOpen className="inline w-5 h-5 mr-2" />
          Catálogo
        </button>
        <button
          onClick={() => setActiveTab('vendas')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'vendas'
              ? 'text-gold-ak border-b-2 border-gold-ak'
              : 'text-gray-500 hover:text-charcoal'
          }`}
        >
          <BarChart3 className="inline w-5 h-5 mr-2" />
          Vendas
        </button>
        <button
          onClick={() => setActiveTab('customizado')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'customizado'
              ? 'text-gold-ak border-b-2 border-gold-ak'
              : 'text-gray-500 hover:text-charcoal'
          }`}
        >
          <Settings className="inline w-5 h-5 mr-2" />
          Customizado
        </button>
      </div>

      {activeTab === 'catalogo' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-gold-ak to-amber-warning rounded-xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Catálogo de Produtos</h2>
            <p className="opacity-90">Gere um catálogo visual para enviar aos seus clientes</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={gerarCatalogoPDF}
              disabled={loading || itensEstoque.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-ak to-amber-warning hover:from-amber-warning hover:to-gold-ak text-white rounded-lg font-bold transition-all shadow-lg disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              Gerar Catálogo
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-ak"></div>
              <p className="mt-4 text-gray-600">Carregando produtos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {itensEstoque.map(item => (
                <div key={item.id} className="bg-white border-2 border-line rounded-xl overflow-hidden hover:border-gold-ak transition-all">
                  <div className="h-40 bg-gradient-to-br from-gold-ak to-amber-warning flex items-center justify-center">
                    {item.foto_url ? (
                      <img src={item.foto_url} alt={item.descricao} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-16 h-16 text-white opacity-50" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-1">{item.categoria}</p>
                    <h3 className="font-bold text-charcoal mb-2 line-clamp-2">{item.descricao}</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gold-ak">R$ {item.valor_unitario.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">Estoque: {item.quantidade_disponivel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendas' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Relatório de Vendas</h2>
            <p className="opacity-90">Exporte suas vendas em PDF ou Excel</p>
          </div>

          <div className="bg-white rounded-xl border-2 border-line p-6">
            <h3 className="font-bold text-charcoal mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-line rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-line rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={carregarVendas}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportarVendasPDF}
              disabled={vendas.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              Exportar PDF
            </button>
            <button
              onClick={exportarVendasExcel}
              disabled={vendas.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Exportar Excel (CSV)
            </button>
          </div>

          <div className="bg-white rounded-xl border-2 border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-line">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(venda => (
                    <tr key={venda.id} className="border-b border-line hover:bg-gray-50">
                      <td className="px-6 py-4">{new Date(venda.data_venda).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">{venda.clientes.nome}</td>
                      <td className="px-6 py-4 font-bold text-gold-ak">R$ {venda.valor_total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          venda.status_pagamento === 'pago' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {venda.status_pagamento}
                        </span>
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
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Relatórios Customizados</h2>
            <p className="opacity-90">Crie seus próprios relatórios personalizados</p>
          </div>

          <div className="bg-white rounded-xl border-2 border-line p-6">
            <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Criar Novo Relatório
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Relatório</label>
                <input
                  type="text"
                  value={novoRelatorio.nome}
                  onChange={(e) => setNovoRelatorio({...novoRelatorio, nome: e.target.value})}
                  placeholder="Ex: Vendas do Mês"
                  className="w-full px-3 py-2 border-2 border-line rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Dados</label>
                <select
                  value={novoRelatorio.tipo}
                  onChange={(e) => setNovoRelatorio({...novoRelatorio, tipo: e.target.value, colunas: []})}
                  className="w-full px-3 py-2 border-2 border-line rounded-lg"
                >
                  <option value="vendas">Vendas</option>
                  <option value="clientes">Clientes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Colunas a Exibir</label>
                <div className="grid grid-cols-2 gap-2">
                  {colunasDisponiveis[novoRelatorio.tipo as keyof typeof colunasDisponiveis]?.map(coluna => (
                    <label key={coluna.id} className="flex items-center gap-2 p-3 border-2 border-line rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novoRelatorio.colunas.includes(coluna.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNovoRelatorio({...novoRelatorio, colunas: [...novoRelatorio.colunas, coluna.id]});
                          } else {
                            setNovoRelatorio({...novoRelatorio, colunas: novoRelatorio.colunas.filter(c => c !== coluna.id)});
                          }
                        }}
                        className="w-4 h-4 text-gold-ak"
                      />
                      <span className="text-sm">{coluna.nome}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={salvarRelatorio}
                disabled={!novoRelatorio.nome || novoRelatorio.colunas.length === 0}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg font-bold transition-all disabled:opacity-50"
              >
                Salvar Relatório
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-charcoal">Relatórios Salvos</h3>
            {relatoriosSalvos.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-line">
                <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum relatório salvo ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatoriosSalvos.map(relatorio => (
                  <div key={relatorio.id} className="bg-white border-2 border-line rounded-xl p-4 hover:border-gold-ak transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-charcoal">{relatorio.nome}</h4>
                        <p className="text-sm text-gray-500 capitalize">{relatorio.tipo}</p>
                      </div>
                      <button
                        onClick={() => excluirRelatorio(relatorio.id!)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-gold-ak hover:bg-amber-warning text-white rounded-lg text-sm font-medium transition-colors">
                        Executar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

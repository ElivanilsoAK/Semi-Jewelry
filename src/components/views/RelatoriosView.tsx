import { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, Users, TrendingUp, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ItemEstoque {
  id: string;
  descricao: string;
  categoria: string;
  valor_unitario: number;
  quantidade_disponivel: number;
  foto_url?: string;
}

interface VendaRelatorio {
  id: string;
  cliente_nome: string;
  data_venda: string;
  valor_total: number;
  status_pagamento: string;
}

export default function RelatoriosView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalogo' | 'vendas' | 'clientes'>('catalogo');

  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [vendas, setVendas] = useState<VendaRelatorio[]>([]);
  const [loading, setLoading] = useState(false);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');

  useEffect(() => {
    if (activeTab === 'catalogo') {
      carregarItensEstoque();
    } else if (activeTab === 'vendas') {
      carregarVendas();
    }
  }, [activeTab]);

  async function carregarItensEstoque() {
    setLoading(true);
    const { data: panos } = await supabase
      .from('panos')
      .select('id')
      .eq('user_id', user?.id)
      .eq('status', 'ativo');

    if (panos && panos.length > 0) {
      const panoIds = panos.map(p => p.id);

      const { data: itens } = await supabase
        .from('itens_pano')
        .select('*')
        .in('pano_id', panoIds)
        .gt('quantidade_disponivel', 0)
        .order('categoria', { ascending: true });

      if (itens) {
        setItensEstoque(itens);
      }
    }
    setLoading(false);
  }

  async function carregarVendas() {
    setLoading(true);
    let query = supabase
      .from('vendas')
      .select('*')
      .eq('user_id', user?.id)
      .order('data_venda', { ascending: false });

    if (dataInicio) {
      query = query.gte('data_venda', dataInicio);
    }
    if (dataFim) {
      query = query.lte('data_venda', dataFim);
    }
    if (clienteFiltro) {
      query = query.ilike('cliente_nome', `%${clienteFiltro}%`);
    }

    const { data } = await query;
    if (data) {
      setVendas(data);
    }
    setLoading(false);
  }

  function imprimirCatalogo() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const categorias = [...new Set(itensEstoque.map(item => item.categoria))].sort();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Catálogo de Produtos</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              padding: 40px;
              background: white;
            }

            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #333;
            }

            .header h1 {
              font-size: 32px;
              color: #333;
              margin-bottom: 8px;
              font-weight: 700;
            }

            .header p {
              font-size: 18px;
              color: #666;
              font-weight: 300;
            }

            .categoria-section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }

            .categoria-titulo {
              font-size: 24px;
              color: #333;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
              font-weight: 600;
            }

            .produtos-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 30px;
            }

            .produto-card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
              page-break-inside: avoid;
              background: white;
            }

            .produto-foto {
              width: 100%;
              height: 150px;
              object-fit: cover;
              border-radius: 8px;
              margin-bottom: 12px;
              background: #f3f4f6;
            }

            .produto-foto-placeholder {
              width: 100%;
              height: 150px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 48px;
              margin-bottom: 12px;
            }

            .produto-nome {
              font-size: 16px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }

            .produto-preco {
              font-size: 20px;
              font-weight: 700;
              color: #10b981;
              margin-bottom: 4px;
            }

            .produto-qtd {
              font-size: 14px;
              color: #6b7280;
            }

            .footer {
              margin-top: 60px;
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }

            @media print {
              body {
                padding: 20px;
              }

              .categoria-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💎 Semi-Joias</h1>
            <p>Catálogo de Produtos</p>
          </div>

          ${categorias.map(categoria => {
            const produtosDaCategoria = itensEstoque.filter(item => item.categoria === categoria);

            return `
              <div class="categoria-section">
                <h2 class="categoria-titulo">${categoria}</h2>
                <div class="produtos-grid">
                  ${produtosDaCategoria.map(produto => `
                    <div class="produto-card">
                      ${produto.foto_url ?
                        `<img src="${produto.foto_url}" alt="${produto.descricao}" class="produto-foto">` :
                        `<div class="produto-foto-placeholder">💎</div>`
                      }
                      <div class="produto-nome">${produto.descricao}</div>
                      <div class="produto-preco">R$ ${produto.valor_unitario.toFixed(2)}</div>
                      <div class="produto-qtd">${produto.quantidade_disponivel} disponível${produto.quantidade_disponivel > 1 ? 'is' : ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}

          <div class="footer">
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p style="margin-top: 8px;">Semi-Joias - Sistema de Gestão</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }

  function exportarVendasCSV() {
    const headers = ['Data', 'Cliente', 'Valor Total', 'Status'];
    const rows = vendas.map(v => [
      new Date(v.data_venda).toLocaleDateString('pt-BR'),
      v.cliente_nome,
      `R$ ${v.valor_total.toFixed(2)}`,
      v.status_pagamento
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  const totalVendas = vendas.reduce((sum, v) => sum + v.valor_total, 0);
  const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;
  const totalProdutosCatalogo = itensEstoque.reduce((sum, item) => sum + item.quantidade_disponivel, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
            <p className="text-sm text-gray-600">Catálogos, vendas e análises</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'catalogo'
              ? 'text-violet-600 border-b-2 border-violet-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Catálogo
        </button>
        <button
          onClick={() => setActiveTab('vendas')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'vendas'
              ? 'text-violet-600 border-b-2 border-violet-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Vendas
        </button>
        <button
          onClick={() => setActiveTab('clientes')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'clientes'
              ? 'text-violet-600 border-b-2 border-violet-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Clientes
        </button>
      </div>

      {activeTab === 'catalogo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Produtos</p>
                  <p className="text-3xl font-bold text-gray-900">{itensEstoque.length}</p>
                </div>
                <Package className="w-12 h-12 text-violet-500 opacity-50" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Em Estoque</p>
                  <p className="text-3xl font-bold text-gray-900">{totalProdutosCatalogo}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-500 opacity-50" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Categorias</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {new Set(itensEstoque.map(i => i.categoria)).size}
                  </p>
                </div>
                <FileText className="w-12 h-12 text-blue-500 opacity-50" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Pré-visualização do Catálogo</h3>
              <button onClick={imprimirCatalogo} className="btn-primary">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Catálogo
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : itensEstoque.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto em estoque</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[...new Set(itensEstoque.map(item => item.categoria))].sort().map(categoria => (
                  <div key={categoria} className="space-y-3">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">{categoria}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {itensEstoque
                        .filter(item => item.categoria === categoria)
                        .map(item => (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
                            {item.foto_url ? (
                              <img src={item.foto_url} alt={item.descricao} className="w-full h-32 object-cover rounded-lg mb-2" />
                            ) : (
                              <div className="w-full h-32 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg mb-2 flex items-center justify-center text-white text-4xl">
                                💎
                              </div>
                            )}
                            <p className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">{item.descricao}</p>
                            <p className="text-lg font-bold text-green-600">R$ {item.valor_unitario.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{item.quantidade_disponivel} disponível</p>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vendas' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                <input
                  type="text"
                  value={clienteFiltro}
                  onChange={(e) => setClienteFiltro(e.target.value)}
                  placeholder="Nome do cliente..."
                  className="input-field"
                />
              </div>
              <div className="flex items-end">
                <button onClick={carregarVendas} className="btn-primary w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-gradient-to-br from-green-50 to-green-100">
              <p className="text-sm text-green-700 font-medium mb-1">Total em Vendas</p>
              <p className="text-3xl font-bold text-green-900">R$ {totalVendas.toFixed(2)}</p>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
              <p className="text-sm text-blue-700 font-medium mb-1">Ticket Médio</p>
              <p className="text-3xl font-bold text-blue-900">R$ {ticketMedio.toFixed(2)}</p>
            </div>
            <div className="card bg-gradient-to-br from-violet-50 to-violet-100">
              <p className="text-sm text-violet-700 font-medium mb-1">Total de Vendas</p>
              <p className="text-3xl font-bold text-violet-900">{vendas.length}</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Relatório de Vendas</h3>
              <button onClick={exportarVendasCSV} className="btn-secondary">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </button>
            </div>

            {vendas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nenhuma venda encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Valor</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendas.map((venda) => (
                      <tr key={venda.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{venda.cliente_nome}</td>
                        <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                          R$ {venda.valor_total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            venda.status_pagamento === 'pago'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {venda.status_pagamento}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'clientes' && (
        <div className="card">
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Relatório de Clientes</p>
            <p className="text-sm">Em breve: ranking de clientes, histórico de compras e mais!</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Shield, Plus, Search, RefreshCw, Check, X, ArrowRight, DollarSign } from 'lucide-react';
import { supabase, withUserId } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Garantia {
  id: string;
  venda_id: string;
  item_original_id: string;
  item_novo_id: string | null;
  tipo: 'troca' | 'devolucao';
  motivo: string;
  status: 'pendente' | 'aprovada' | 'concluida' | 'rejeitada';
  diferenca_valor: number;
  forma_pagamento_diferenca: string | null;
  valor_item_antigo: number;
  valor_item_novo: number;
  created_at: string;
}

export default function GarantiasView() {
  const { user } = useAuth();
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [showNovaGarantia, setShowNovaGarantia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  // Passo 1: Buscar cliente
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');

  // Passo 2: Buscar vendas do cliente
  const [vendas, setVendas] = useState<any[]>([]);
  const [vendaSelecionada, setVendaSelecionada] = useState<string>('');

  // Passo 3: Selecionar item antigo da venda
  const [itensDaVenda, setItensDaVenda] = useState<any[]>([]);
  const [itemAntigoSelecionado, setItemAntigoSelecionado] = useState<any>(null);

  // Passo 4: Selecionar item novo do pano (para troca)
  const [itensDisponiveis, setItensDisponiveis] = useState<any[]>([]);
  const [itemNovoSelecionado, setItemNovoSelecionado] = useState<any>(null);

  // Passo 5: Dados da garantia
  const [tipo, setTipo] = useState<'troca' | 'devolucao'>('troca');
  const [motivo, setMotivo] = useState('');
  const [diferencaValor, setDiferencaValor] = useState(0);
  const [formaPagamentoDiferenca, setFormaPagamentoDiferenca] = useState<string>('');

  useEffect(() => {
    carregarGarantias();
    carregarClientes();
    if (tipo === 'troca') {
      carregarItensDisponiveis();
    }
  }, [tipo]);

  useEffect(() => {
    if (clienteSelecionado) {
      carregarVendasCliente();
    }
  }, [clienteSelecionado]);

  useEffect(() => {
    if (vendaSelecionada) {
      carregarItensDaVenda();
    }
  }, [vendaSelecionada]);

  useEffect(() => {
    calcularDiferenca();
  }, [itemAntigoSelecionado, itemNovoSelecionado]);

  async function carregarGarantias() {
    const { data } = await supabase
      .from('garantias')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setGarantias(data);
  }

  async function carregarClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .order('nome');

    if (data) setClientes(data);
  }

  async function carregarVendasCliente() {
    const { data } = await supabase.rpc('buscar_vendas_para_garantia', {
      cliente_id_param: clienteSelecionado,
      busca: null,
      limite: 100
    });

    if (data) setVendas(data);
  }

  async function carregarItensDaVenda() {
    const { data, error } = await supabase
      .from('itens_venda')
      .select(`
        id,
        item_pano_id,
        quantidade,
        valor_unitario,
        valor_total,
        itens_pano (
          descricao,
          categoria,
          foto_url
        )
      `)
      .eq('venda_id', vendaSelecionada);

    if (data && !error) {
      setItensDaVenda(data.map((item: any) => ({
        item_venda_id: item.id,
        item_pano_id: item.item_pano_id,
        descricao: item.itens_pano?.descricao || 'Sem descrição',
        categoria: item.itens_pano?.categoria || '',
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        foto_url: item.itens_pano?.foto_url
      })));
    }
  }

  async function carregarItensDisponiveis() {
    const { data, error } = await supabase
      .from('itens_pano')
      .select('*')
      .gt('quantidade_disponivel', 0)
      .order('categoria')
      .order('descricao');

    if (data && !error) {
      setItensDisponiveis(data.map((item: any) => ({
        item_id: item.id,
        pano_id: item.pano_id,
        descricao: item.descricao,
        categoria: item.categoria,
        valor_unitario: item.valor_unitario,
        quantidade_disponivel: item.quantidade_disponivel,
        foto_url: item.foto_url
      })));
    }
  }

  function calcularDiferenca() {
    if (!itemAntigoSelecionado) {
      setDiferencaValor(0);
      return;
    }

    const valorAntigo = itemAntigoSelecionado.valor_unitario || 0;
    const valorNovo = itemNovoSelecionado?.valor_unitario || 0;
    const diferenca = valorNovo - valorAntigo;
    setDiferencaValor(diferenca);
  }

  async function criarGarantia() {
    if (!vendaSelecionada || !itemAntigoSelecionado || !motivo.trim()) {
      alert('❌ Preencha todos os campos obrigatórios');
      return;
    }

    if (tipo === 'troca' && !itemNovoSelecionado) {
      alert('❌ Selecione o item novo para troca');
      return;
    }

    if (diferencaValor > 0 && !formaPagamentoDiferenca) {
      alert('❌ Informe a forma de pagamento da diferença');
      return;
    }

    setLoading(true);

    try {
      const garantiaData = await withUserId({
        venda_original_id: vendaSelecionada,
        item_original_id: itemAntigoSelecionado.item_venda_id,
        item_novo_id: tipo === 'troca' && itemNovoSelecionado ? itemNovoSelecionado.item_id : null,
        tipo,
        motivo,
        status: 'pendente',
        data_solicitacao: new Date().toISOString().split('T')[0],
        diferenca_valor: Math.abs(diferencaValor),
        forma_pagamento_diferenca: diferencaValor > 0 ? formaPagamentoDiferenca : null,
        valor_item_antigo: itemAntigoSelecionado.valor_unitario,
        valor_item_novo: itemNovoSelecionado?.valor_unitario || 0
      });

      const { error } = await supabase.from('garantias').insert(garantiaData);

      if (error) throw error;

      alert('✅ Garantia criada com sucesso!');
      setShowNovaGarantia(false);
      resetForm();
      carregarGarantias();
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao criar garantia');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setClienteSelecionado('');
    setVendaSelecionada('');
    setItemAntigoSelecionado(null);
    setItemNovoSelecionado(null);
    setTipo('troca');
    setMotivo('');
    setDiferencaValor(0);
    setFormaPagamentoDiferenca('');
    setVendas([]);
    setItensDaVenda([]);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-gold-ak to-amber-warning rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Garantias</h1>
            <p className="text-sm text-gray-600">Gestão de trocas e devoluções (2 anos)</p>
          </div>
        </div>
        <button
          onClick={() => setShowNovaGarantia(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-ak to-amber-warning text-white rounded-lg hover:shadow-lg transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Nova Garantia
        </button>
      </div>

      {/* Lista de Garantias */}
      <div className="bg-white rounded-xl shadow-sm border border-line p-6">
        <h3 className="font-bold text-charcoal mb-4">Garantias Registradas</h3>
        {garantias.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma garantia registrada</p>
        ) : (
          <div className="space-y-3">
            {garantias.map((g) => (
              <div key={g.id} className="border border-line rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-charcoal">{g.tipo === 'troca' ? '🔄 Troca' : '↩️ Devolução'}</p>
                    <p className="text-sm text-gray-600 mt-1">{g.motivo}</p>
                    <p className="text-xs text-gray-500 mt-2">Criada em: {formatDate(g.created_at)}</p>
                    {g.diferenca_valor > 0 && (
                      <p className="text-sm text-gold-ak mt-1">
                        Diferença: {formatCurrency(g.diferenca_valor)} - {g.forma_pagamento_diferenca?.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    g.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                    g.status === 'aprovada' ? 'bg-blue-100 text-blue-700' :
                    g.status === 'concluida' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {g.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nova Garantia */}
      {showNovaGarantia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-line bg-gradient-to-r from-gold-ak to-amber-warning">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Nova Garantia</h2>
                <button onClick={() => { setShowNovaGarantia(false); resetForm(); }} className="text-white hover:bg-white/20 p-2 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Tipo de Garantia */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Tipo de Garantia *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['troca', 'devolucao'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`p-3 rounded-lg border-2 transition-all font-medium ${
                        tipo === t
                          ? 'border-gold-ak bg-gold-ak/10 text-gold-ak'
                          : 'border-line hover:border-gold-ak/50'
                      }`}
                    >
                      {t === 'troca' ? '🔄 Troca' : '↩️ Devolução'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passo 1: Cliente */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">1️⃣ Cliente *</label>
                <select
                  value={clienteSelecionado}
                  onChange={(e) => {
                    setClienteSelecionado(e.target.value);
                    setVendaSelecionada('');
                    setItemAntigoSelecionado(null);
                  }}
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.telefone ? `- ${c.telefone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Passo 2: Venda */}
              {clienteSelecionado && (
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">2️⃣ Venda (últimos 2 anos) *</label>
                  <select
                    value={vendaSelecionada}
                    onChange={(e) => {
                      setVendaSelecionada(e.target.value);
                      setItemAntigoSelecionado(null);
                    }}
                    className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                  >
                    <option value="">Selecione a venda</option>
                    {vendas.map((v) => (
                      <option key={v.venda_id} value={v.venda_id}>
                        {formatDate(v.data_venda)} - {formatCurrency(v.valor_total)} - {v.itens_count} {v.itens_count === 1 ? 'item' : 'itens'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Passo 3: Item Antigo */}
              {vendaSelecionada && (
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">3️⃣ Item da Venda (antigo) *</label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-line rounded-lg p-3">
                    {itensDaVenda.map((item) => (
                      <button
                        key={item.item_venda_id}
                        onClick={() => setItemAntigoSelecionado(item)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          itemAntigoSelecionado?.item_venda_id === item.item_venda_id
                            ? 'border-gold-ak bg-gold-ak/10'
                            : 'border-line hover:border-gold-ak/50'
                        }`}
                      >
                        <p className="font-bold text-charcoal">{item.descricao}</p>
                        <p className="text-sm text-gray-600">
                          {item.categoria} - Qtd: {item.quantidade} - {formatCurrency(item.valor_unitario)} cada
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Passo 4: Item Novo (apenas para troca) */}
              {tipo === 'troca' && itemAntigoSelecionado && (
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">4️⃣ Item Novo do Pano (para troca) *</label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-line rounded-lg p-3">
                    {itensDisponiveis.map((item) => (
                      <button
                        key={item.item_id}
                        onClick={() => setItemNovoSelecionado(item)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          itemNovoSelecionado?.item_id === item.item_id
                            ? 'border-green-600 bg-green-50'
                            : 'border-line hover:border-green-400'
                        }`}
                      >
                        <p className="font-bold text-charcoal">{item.descricao}</p>
                        <p className="text-sm text-gray-600">
                          {item.categoria} - Disponível: {item.quantidade_disponivel} - {formatCurrency(item.valor_unitario)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Diferença de Valor */}
              {itemAntigoSelecionado && itemNovoSelecionado && diferencaValor !== 0 && (
                <div className={`p-4 rounded-lg border-2 ${diferencaValor > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                  <h4 className="font-bold text-charcoal mb-2">
                    {diferencaValor > 0 ? '⚠️ Diferença a Pagar' : '✅ Diferença a Favor'}
                  </h4>
                  <div className="flex justify-between items-center mb-3">
                    <span>Item Antigo:</span>
                    <span className="font-bold">{formatCurrency(itemAntigoSelecionado.valor_unitario)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span>Item Novo:</span>
                    <span className="font-bold">{formatCurrency(itemNovoSelecionado.valor_unitario)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-current">
                    <span className="font-bold">Diferença:</span>
                    <span className="font-bold text-lg">{formatCurrency(Math.abs(diferencaValor))}</span>
                  </div>

                  {diferencaValor > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-bold text-charcoal mb-2">Forma de Pagamento da Diferença *</label>
                      <select
                        value={formaPagamentoDiferenca}
                        onChange={(e) => setFormaPagamentoDiferenca(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                      >
                        <option value="">Selecione a forma de pagamento</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">PIX</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="negociacao">Negociação</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Motivo *</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo da garantia..."
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowNovaGarantia(false); resetForm(); }}
                  className="flex-1 px-4 py-3 border-2 border-line text-charcoal rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={criarGarantia}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gold-ak to-amber-warning text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Garantia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { supabase, Cliente, Pano, ItemPano, withUserId } from '../../lib/supabase';
import { X, Plus, Trash2, UserPlus, ShoppingCart, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

interface NovaVendaModalProps {
  onClose: () => void;
}

interface ItemVendaTemp {
  item_pano_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export default function NovaVendaModal({ onClose }: NovaVendaModalProps) {
  const [step, setStep] = useState<'cliente' | 'itens' | 'pagamento'>('cliente');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [panos, setPanos] = useState<Pano[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemPano[]>([]);

  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '' });
  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);

  const [panoSelecionado, setPanoSelecionado] = useState<string>('');
  const [itensVenda, setItensVenda] = useState<ItemVendaTemp[]>([]);

  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [datasParcelas, setDatasParcelas] = useState<string[]>(['']);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [desconto, setDesconto] = useState(0);
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'fixo'>('percentual');
  const [observacoes, setObservacoes] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClientes();
    loadPanos();
  }, []);

  useEffect(() => {
    if (panoSelecionado) {
      loadItens(panoSelecionado);
    }
  }, [panoSelecionado]);

  useEffect(() => {
    const dates = Array(numeroParcelas).fill('');
    setDatasParcelas(dates);
  }, [numeroParcelas]);

  const loadClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').order('nome');
    setClientes(data || []);
  };

  const loadPanos = async () => {
    const { data } = await supabase.from('panos').select('*').eq('status', 'ativo').order('nome');
    setPanos(data || []);
  };

  const loadItens = async (panoId: string) => {
    const { data } = await supabase
      .from('itens_pano')
      .select('*')
      .eq('pano_id', panoId)
      .gt('quantidade_disponivel', 0);
    setItensDisponiveis(data || []);
  };

  const handleCriarCliente = async () => {
    if (!novoCliente.nome) {
      alert('Nome do cliente é obrigatório');
      return;
    }

    const clienteComUserId = await withUserId(novoCliente);
    const { data, error } = await supabase
      .from('clientes')
      .insert([clienteComUserId])
      .select()
      .single();

    if (error) {
      alert('Erro ao criar cliente');
      return;
    }

    setClienteSelecionado(data.id);
    setMostrarNovoCliente(false);
    setNovoCliente({ nome: '', telefone: '' });
    loadClientes();
  };

  const handleAdicionarItem = (item: ItemPano, quantidade: number) => {
    if (quantidade <= 0 || quantidade > item.quantidade_disponivel) {
      alert('Quantidade inválida');
      return;
    }

    const itemExistente = itensVenda.find(i => i.item_pano_id === item.id);
    if (itemExistente) {
      alert('Item já adicionado');
      return;
    }

    const valorTotal = quantidade * Number(item.valor_unitario);

    setItensVenda([...itensVenda, {
      item_pano_id: item.id,
      descricao: item.descricao,
      quantidade,
      valor_unitario: Number(item.valor_unitario),
      valor_total: valorTotal,
    }]);
  };

  const handleRemoverItem = (itemPanoId: string) => {
    setItensVenda(itensVenda.filter(i => i.item_pano_id !== itemPanoId));
  };

  const calcularSubtotal = () => {
    return itensVenda.reduce((sum, item) => sum + item.valor_total, 0);
  };

  const calcularDesconto = () => {
    const subtotal = calcularSubtotal();
    if (tipoDesconto === 'percentual') {
      return (subtotal * desconto) / 100;
    }
    return desconto;
  };

  const calcularValorTotal = () => {
    return calcularSubtotal() - calcularDesconto();
  };

  const valorTotalMemo = useMemo(() => calcularValorTotal(), [itensVenda, desconto, tipoDesconto]);

  const handleFinalizarVenda = async () => {
    if (!clienteSelecionado || itensVenda.length === 0) {
      alert('Selecione um cliente e adicione itens');
      return;
    }

    if (numeroParcelas > 1 && datasParcelas.some(d => !d)) {
      alert('Preencha todas as datas de vencimento');
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Verificando autenticação antes de registrar venda:', {
        authenticated: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at
      });

      if (!session) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }
      const valorTotal = calcularValorTotal();
      const valorParcela = valorTotal / numeroParcelas;

      const vendaComUserId = await withUserId({
        cliente_id: clienteSelecionado,
        valor_total: valorTotal,
        status_pagamento: numeroParcelas === 1 ? 'pago' : 'pendente',
        forma_pagamento: formaPagamento,
        desconto: calcularDesconto(),
        observacoes,
      });

      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert([vendaComUserId])
        .select()
        .single();

      if (vendaError) throw vendaError;

      const itensVendaBase = itensVenda.map(item => ({
        venda_id: venda.id,
        item_pano_id: item.item_pano_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
      }));

      const itensVendaInsert = await Promise.all(itensVendaBase.map(item => withUserId(item)));

      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensVendaInsert);

      if (itensError) throw itensError;

      for (const item of itensVenda) {
        const { error: updateError } = await supabase.rpc('decrement_stock', {
          item_id: item.item_pano_id,
          amount: item.quantidade,
        });

        if (updateError) {
          console.error('Erro ao decrementar estoque:', updateError);
          const { data: itemAtual } = await supabase
            .from('itens_pano')
            .select('quantidade_disponivel')
            .eq('id', item.item_pano_id)
            .single();

          if (itemAtual) {
            await supabase
              .from('itens_pano')
              .update({ quantidade_disponivel: itemAtual.quantidade_disponivel - item.quantidade })
              .eq('id', item.item_pano_id);
          }
        }
      }

      const pagamentosBase = datasParcelas.map((data, index) => ({
        venda_id: venda.id,
        numero_parcela: index + 1,
        valor_parcela: valorParcela,
        data_vencimento: data || new Date().toISOString().split('T')[0],
        status: numeroParcelas === 1 && index === 0 ? 'pago' : 'pendente',
      }));

      const pagamentosInsert = await Promise.all(pagamentosBase.map(pag => withUserId(pag)));

      const { error: pagamentosError } = await supabase
        .from('pagamentos')
        .insert(pagamentosInsert);

      if (pagamentosError) throw pagamentosError;

      alert(`✅ Venda registrada com sucesso!\n\nTotal: R$ ${valorTotal.toFixed(2)}\nParcelas: ${numeroParcelas}x de R$ ${valorParcela.toFixed(2)}`);
      onClose();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('not authenticated')) {
        alert('❌ Sessão expirada!\n\nPor favor, faça login novamente para continuar.\n\nVocê será redirecionado para a página de login.');
        await supabase.auth.signOut();
        window.location.reload();
      } else {
        alert('❌ Erro ao registrar venda:\n\n' + errorMessage + '\n\nTente novamente ou contate o suporte.');
      }
    } finally {
      setSaving(false);
    }
  };

  const nomeCliente = clientes.find(c => c.id === clienteSelecionado)?.nome || '';
  const nomePano = panos.find(p => p.id === panoSelecionado)?.nome || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-gold-ak to-amber-warning p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Nova Venda</h2>
              <p className="text-sm opacity-90 mt-1">
                {step === 'cliente' && 'Selecione o cliente'}
                {step === 'itens' && 'Adicione os itens da venda'}
                {step === 'pagamento' && 'Configure o pagamento'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
              disabled={saving}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-2 mt-6">
            {['cliente', 'itens', 'pagamento'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step === s || i < ['cliente', 'itens', 'pagamento'].indexOf(step)
                    ? 'bg-white'
                    : 'bg-white bg-opacity-30'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'cliente' && (
            <div className="space-y-6">
              {!mostrarNovoCliente ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-charcoal mb-2">
                      Cliente *
                    </label>
                    <select
                      value={clienteSelecionado}
                      onChange={(e) => setClienteSelecionado(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} {cliente.telefone ? `- ${cliente.telefone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setMostrarNovoCliente(true)}
                    className="flex items-center gap-2 text-gold-ak hover:text-amber-warning font-semibold transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    Cadastrar novo cliente
                  </button>

                  {clienteSelecionado && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-green-900">Cliente selecionado:</p>
                        <p className="text-green-700">{nomeCliente}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-50 border-2 border-line rounded-xl p-6 space-y-4">
                  <h4 className="font-bold text-charcoal text-lg">Novo Cliente</h4>
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone"
                    value={novoCliente.telefone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      let formatted = value;
                      if (value.length > 0) {
                        if (value.length <= 2) {
                          formatted = `(${value}`;
                        } else if (value.length <= 7) {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        } else if (value.length <= 11) {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                        }
                      }
                      setNovoCliente({ ...novoCliente, telefone: formatted });
                    }}
                    maxLength={15}
                    className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setMostrarNovoCliente(false)}
                      className="flex-1 px-4 py-3 border-2 border-line text-charcoal rounded-lg hover:bg-gray-100 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCriarCliente}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-gold-ak to-amber-warning text-white rounded-lg hover:from-amber-warning hover:to-gold-ak font-bold shadow-lg transition-all"
                    >
                      Criar Cliente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'itens' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  Selecione o Pano
                </label>
                <select
                  value={panoSelecionado}
                  onChange={(e) => setPanoSelecionado(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                >
                  <option value="">Selecione um pano</option>
                  {panos.map((pano) => (
                    <option key={pano.id} value={pano.id}>
                      {pano.nome}
                    </option>
                  ))}
                </select>
              </div>

              {panoSelecionado && itensDisponiveis.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-800">
                    Nenhum item disponível neste pano
                  </p>
                </div>
              )}

              {panoSelecionado && itensDisponiveis.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-charcoal">Itens Disponíveis</h4>
                  {itensDisponiveis.map((item) => {
                    const jaAdicionado = itensVenda.some(i => i.item_pano_id === item.id);

                    return (
                      <div key={item.id} className="flex items-center gap-3 bg-gray-50 border-2 border-line p-4 rounded-lg hover:border-gold-ak transition-colors">
                        <div className="flex-1">
                          <p className="font-bold text-charcoal">{item.descricao}</p>
                          <p className="text-sm text-gray-600">
                            Disponível: {item.quantidade_disponivel} | R$ {Number(item.valor_unitario).toFixed(2)}
                          </p>
                        </div>
                        {!jaAdicionado && (
                          <input
                            type="number"
                            min="1"
                            max={item.quantidade_disponivel}
                            placeholder="Qtd"
                            className="w-20 px-3 py-2 border-2 border-line rounded-lg text-center font-bold focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const qtd = parseInt((e.target as HTMLInputElement).value) || 0;
                                if (qtd > 0) {
                                  handleAdicionarItem(item, qtd);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        )}
                        {jaAdicionado && (
                          <span className="text-sm text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Adicionado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {itensVenda.length > 0 && (
                <div className="border-t-2 border-line pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-charcoal flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Itens da Venda
                    </h4>
                    <span className="text-sm bg-gold-ak text-white px-3 py-1 rounded-full font-bold">
                      {itensVenda.length} {itensVenda.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {itensVenda.map((item) => (
                      <div key={item.item_pano_id} className="flex items-center justify-between bg-gradient-to-r from-gold-ak to-amber-warning bg-opacity-10 border-2 border-gold-ak p-4 rounded-lg">
                        <div className="flex-1">
                          <p className="font-bold text-charcoal">{item.descricao}</p>
                          <p className="text-sm text-gray-700">
                            {item.quantidade}x R$ {item.valor_unitario.toFixed(2)} = <span className="font-bold">R$ {item.valor_total.toFixed(2)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoverItem(item.item_pano_id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 bg-gradient-to-r from-gold-ak to-amber-warning text-white p-6 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Subtotal:</span>
                      <span className="text-3xl font-bold">R$ {calcularSubtotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'pagamento' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gold-ak to-amber-warning text-white p-6 rounded-xl">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm opacity-90">
                    <span>Subtotal:</span>
                    <span className="font-medium">R$ {calcularSubtotal().toFixed(2)}</span>
                  </div>
                  {calcularDesconto() > 0 && (
                    <div className="flex justify-between items-center text-sm opacity-90">
                      <span>Desconto ({tipoDesconto === 'percentual' ? `${desconto}%` : 'R$'}):</span>
                      <span className="font-medium">- R$ {calcularDesconto().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-white border-opacity-30 pt-3 flex justify-between items-center">
                    <span className="text-xl font-medium">TOTAL:</span>
                    <span className="text-4xl font-bold">R$ {valorTotalMemo.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                  >
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="pix">📱 PIX</option>
                    <option value="cartao_credito">💳 Cartão de Crédito</option>
                    <option value="cartao_debito">💳 Cartão de Débito</option>
                    <option value="transferencia">🏦 Transferência</option>
                    <option value="boleto">📄 Boleto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">
                    Número de Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  Desconto
                </label>
                <div className="flex gap-3">
                  <select
                    value={tipoDesconto}
                    onChange={(e) => setTipoDesconto(e.target.value as 'percentual' | 'fixo')}
                    className="px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                  >
                    <option value="percentual">%</option>
                    <option value="fixo">R$</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step={tipoDesconto === 'percentual' ? '1' : '0.01'}
                    max={tipoDesconto === 'percentual' ? '100' : calcularSubtotal()}
                    value={desconto}
                    onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              {numeroParcelas > 1 && (
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-3">
                    Datas de Vencimento das Parcelas
                  </label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {datasParcelas.map((data, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm font-bold text-charcoal w-24">
                          Parcela {index + 1}:
                        </span>
                        <input
                          type="date"
                          value={data}
                          onChange={(e) => {
                            const newDatas = [...datasParcelas];
                            newDatas[index] = e.target.value;
                            setDatasParcelas(newDatas);
                          }}
                          className="flex-1 px-3 py-2 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                        />
                        <span className="text-sm font-bold text-charcoal">
                          R$ {(valorTotalMemo / numeroParcelas).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                  rows={3}
                  placeholder="Informações adicionais sobre a venda..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t-2 border-line flex gap-3">
          {step !== 'cliente' && (
            <button
              onClick={() => setStep(step === 'pagamento' ? 'itens' : 'cliente')}
              className="px-6 py-3 border-2 border-line text-charcoal rounded-lg hover:bg-gray-100 font-bold transition-colors"
              disabled={saving}
            >
              Voltar
            </button>
          )}
          {step === 'cliente' && (
            <button
              onClick={() => clienteSelecionado && setStep('itens')}
              disabled={!clienteSelecionado}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gold-ak to-amber-warning text-white rounded-lg hover:from-amber-warning hover:to-gold-ak disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg transition-all"
            >
              Próximo: Adicionar Itens
            </button>
          )}
          {step === 'itens' && (
            <button
              onClick={() => itensVenda.length > 0 && setStep('pagamento')}
              disabled={itensVenda.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gold-ak to-amber-warning text-white rounded-lg hover:from-amber-warning hover:to-gold-ak disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg transition-all"
            >
              Próximo: Pagamento
            </button>
          )}
          {step === 'pagamento' && (
            <button
              onClick={handleFinalizarVenda}
              disabled={saving || itensVenda.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Finalizar Venda
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

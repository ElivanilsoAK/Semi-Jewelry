import { useState, useEffect } from 'react';
import { supabase, withUserId } from '../../lib/supabase';
import {
  X, Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Percent, DollarSign, Printer, Send, TrendingUp, Image as ImageIcon
} from 'lucide-react';

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
}

interface Item {
  id: string;
  descricao: string;
  valor_unitario: number;
  quantidade_disponivel: number;
  foto_url?: string;
  categoria?: string;
}

interface ItemCarrinho {
  itemId: string;
  quantidade: number;
}

type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';
type TipoDesconto = 'percentual' | 'fixo';

export default function VendaRapidaModal({ onClose }: { onClose: () => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sugestoes, setSugestoes] = useState<Item[]>([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
  const [tipoVenda, setTipoVenda] = useState<'avista' | 'parcelado'>('avista');
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [tipoDesconto, setTipoDesconto] = useState<TipoDesconto>('percentual');
  const [desconto, setDesconto] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      loadSugestoes();
    }
  }, [selectedCliente]);

  const loadData = async () => {
    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .order('nome');

    const { data: itemsData } = await supabase
      .from('itens_pano')
      .select('*')
      .gt('quantidade_disponivel', 0)
      .order('descricao');

    setClientes(clientesData || []);
    setItems(itemsData || []);
  };

  const loadSugestoes = async () => {
    const { data } = await supabase
      .from('itens_venda')
      .select(`
        item_pano_id,
        itens_pano!inner(*)
      `)
      .eq('vendas.cliente_id', selectedCliente)
      .limit(5);

    if (data) {
      const itemIds = data.map((d: any) => d.itens_pano.id);
      const sugestoesUnicas = items.filter(item => itemIds.includes(item.id));
      setSugestoes(sugestoesUnicas.slice(0, 3));
    }
  };

  const filteredItems = items.filter(item =>
    item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (itemId: string, quantidade: number = 1) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const existing = carrinho.find(i => i.itemId === itemId);
    const currentQtd = existing ? existing.quantidade : 0;
    const novaQtd = currentQtd + quantidade;

    if (novaQtd > item.quantidade_disponivel) {
      alert(`Quantidade máxima disponível: ${item.quantidade_disponivel}`);
      return;
    }

    if (existing) {
      setCarrinho(carrinho.map(i =>
        i.itemId === itemId ? { ...i, quantidade: novaQtd } : i
      ));
    } else {
      setCarrinho([...carrinho, { itemId, quantidade }]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setCarrinho(carrinho.filter(i => i.itemId !== itemId));
  };

  const handleUpdateQuantidade = (itemId: string, delta: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const existing = carrinho.find(i => i.itemId === itemId);
    if (!existing) return;

    const novaQtd = existing.quantidade + delta;

    if (novaQtd < 1) {
      handleRemoveItem(itemId);
      return;
    }

    if (novaQtd > item.quantidade_disponivel) {
      alert(`Quantidade máxima disponível: ${item.quantidade_disponivel}`);
      return;
    }

    setCarrinho(carrinho.map(i =>
      i.itemId === itemId ? { ...i, quantidade: novaQtd } : i
    ));
  };

  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => {
      const produto = items.find(i => i.id === item.itemId);
      return total + (produto?.valor_unitario || 0) * item.quantidade;
    }, 0);
  };

  const calcularDesconto = () => {
    const subtotal = calcularSubtotal();
    if (tipoDesconto === 'percentual') {
      return (subtotal * desconto) / 100;
    }
    return desconto;
  };

  const calcularTotal = () => {
    return calcularSubtotal() - calcularDesconto();
  };

  const gerarComprovante = (venda: any) => {
    const cliente = clientes.find(c => c.id === selectedCliente);
    const subtotal = calcularSubtotal();
    const valorDesconto = calcularDesconto();
    const total = calcularTotal();

    const itensTexto = carrinho.map(item => {
      const produto = items.find(i => i.id === item.itemId);
      return `${item.quantidade}x ${produto?.descricao} - R$ ${((produto?.valor_unitario || 0) * item.quantidade).toFixed(2)}`;
    }).join('\n');

    const comprovante = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      SPHERE - COMPROVANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cliente: ${cliente?.nome}
${cliente?.telefone ? `Telefone: ${cliente.telefone}` : ''}

Data: ${new Date().toLocaleDateString('pt-BR')}
Venda: #${venda.id.slice(0, 8)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           ITENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${itensTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subtotal: R$ ${subtotal.toFixed(2)}
${valorDesconto > 0 ? `Desconto: -R$ ${valorDesconto.toFixed(2)}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: R$ ${total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forma: ${formaPagamento.toUpperCase()}
${tipoVenda === 'parcelado' ? `${numeroParcelas}x de R$ ${(total / numeroParcelas).toFixed(2)}` : 'À VISTA'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Obrigado pela preferência!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    return comprovante;
  };

  const handleImprimir = (venda: any) => {
    const comprovante = gerarComprovante(venda);
    const printWindow = window.open('', '', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comprovante de Venda</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                margin: 20px;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            ${comprovante}
            <script>
              window.print();
              window.close();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleEnviarWhatsApp = (venda: any) => {
    const cliente = clientes.find(c => c.id === selectedCliente);
    if (!cliente?.telefone) {
      alert('Cliente não possui telefone cadastrado');
      return;
    }

    const comprovante = gerarComprovante(venda);
    const mensagem = encodeURIComponent(comprovante);
    const numero = cliente.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${numero}?text=${mensagem}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async () => {
    if (!selectedCliente || carrinho.length === 0) {
      alert('Selecione um cliente e adicione pelo menos um item');
      return;
    }

    const total = calcularTotal();

    if (tipoVenda === 'parcelado' && valorEntrada > total) {
      alert('Valor de entrada não pode ser maior que o total da venda');
      return;
    }

    setLoading(true);
    try {
      const statusPagamento = tipoVenda === 'avista' ? 'pago' : valorEntrada >= total ? 'pago' : 'pendente';
      const subtotal = calcularSubtotal();
      const valorDesconto = calcularDesconto();

      const vendaComUserId = await withUserId({
        cliente_id: selectedCliente,
        valor_original: subtotal,
        desconto_valor: valorDesconto,
        desconto_percentual: tipoDesconto === 'percentual' ? desconto : 0,
        valor_total: total,
        status_pagamento: statusPagamento,
        forma_pagamento: formaPagamento,
        numero_parcelas: tipoVenda === 'parcelado' ? numeroParcelas : 1
      });

      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert([vendaComUserId])
        .select()
        .single();

      if (vendaError) throw vendaError;

      const itensVendaBase = carrinho.map(item => {
        const produto = items.find(i => i.id === item.itemId)!;
        return {
          venda_id: venda.id,
          item_pano_id: item.itemId,
          quantidade: item.quantidade,
          valor_unitario: produto.valor_unitario,
          valor_total: produto.valor_unitario * item.quantidade
        };
      });

      const itensVenda = await Promise.all(itensVendaBase.map(item => withUserId(item)));
      const { error: itensError } = await supabase.from('itens_venda').insert(itensVenda);
      if (itensError) throw itensError;

      const hoje = new Date();
      const pagamentos = [];

      if (tipoVenda === 'avista') {
        pagamentos.push(await withUserId({
          venda_id: venda.id,
          numero_parcela: 1,
          valor_parcela: total,
          data_vencimento: hoje.toISOString().split('T')[0],
          data_pagamento: hoje.toISOString().split('T')[0],
          status: 'pago',
          valor_original: total,
          valor_pago: total,
          forma_pagamento_realizado: formaPagamento
        }));
      } else {
        const valorRestante = total - valorEntrada;
        let parcelaNum = 1;

        if (valorEntrada > 0) {
          pagamentos.push(await withUserId({
            venda_id: venda.id,
            numero_parcela: parcelaNum++,
            valor_parcela: valorEntrada,
            data_vencimento: hoje.toISOString().split('T')[0],
            data_pagamento: hoje.toISOString().split('T')[0],
            status: 'pago',
            valor_original: valorEntrada,
            valor_pago: valorEntrada,
            forma_pagamento_realizado: formaPagamento
          }));
        }

        const valorParcela = valorRestante / numeroParcelas;
        for (let i = 0; i < numeroParcelas; i++) {
          const dataVencimento = new Date(hoje);
          dataVencimento.setMonth(dataVencimento.getMonth() + i + 1);

          pagamentos.push(await withUserId({
            venda_id: venda.id,
            numero_parcela: parcelaNum++,
            valor_parcela: valorParcela,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            status: 'pendente',
            valor_original: valorParcela
          }));
        }
      }

      const { error: pagamentosError } = await supabase.from('pagamentos').insert(pagamentos);
      if (pagamentosError) throw pagamentosError;

      for (const item of carrinho) {
        const produto = items.find(i => i.id === item.itemId)!;
        await supabase
          .from('itens_pano')
          .update({ quantidade_disponivel: produto.quantidade_disponivel - item.quantidade })
          .eq('id', item.itemId);
      }

      const acao = confirm('Venda realizada com sucesso!\n\nDeseja imprimir o comprovante?');
      if (acao) {
        handleImprimir(venda);
      }

      const enviar = confirm('Deseja enviar o comprovante por WhatsApp?');
      if (enviar) {
        handleEnviarWhatsApp(venda);
      }

      onClose();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao realizar venda');
    } finally {
      setLoading(false);
    }
  };

  const formasPagamento: { value: FormaPagamento; label: string; icon: typeof CreditCard }[] = [
    { value: 'dinheiro', label: 'Dinheiro', icon: DollarSign },
    { value: 'pix', label: 'PIX', icon: TrendingUp },
    { value: 'cartao_credito', label: 'Crédito', icon: CreditCard },
    { value: 'cartao_debito', label: 'Débito', icon: CreditCard }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-line bg-gradient-to-r from-gold-ak to-amber-warning">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-white" />
            <h2 className="text-2xl font-bold text-white">Venda Rápida</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Cliente *</label>
                <select
                  value={selectedCliente}
                  onChange={(e) => setSelectedCliente(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-medium"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.telefone ? `- ${c.telefone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {sugestoes.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-blue-900">Produtos Sugeridos (baseado no histórico)</h3>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {sugestoes.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleAddItem(item.id)}
                        className="px-3 py-2 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        + {item.descricao}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Buscar Produtos</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite para buscar por nome ou categoria..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-line rounded-lg hover:border-gold-ak transition-all cursor-pointer group"
                    onClick={() => handleAddItem(item.id)}
                  >
                    <div className="p-4">
                      {item.foto_url ? (
                        <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                          <img src={item.foto_url} alt={item.descricao} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-gradient-to-br from-gold-ak to-amber-warning rounded-lg mb-3 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-white opacity-50" />
                        </div>
                      )}
                      <h4 className="font-bold text-charcoal mb-1 line-clamp-1">{item.descricao}</h4>
                      {item.categoria && (
                        <p className="text-xs text-gray-500 mb-2">{item.categoria}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gold-ak">R$ {item.valor_unitario.toFixed(2)}</span>
                        <span className="text-xs text-gray-500">Estoque: {item.quantidade_disponivel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gradient-to-br from-silk to-white border-2 border-gold-ak rounded-xl p-4 sticky top-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-charcoal text-lg">Carrinho</h3>
                  <div className="bg-gold-ak text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {carrinho.length}
                  </div>
                </div>

                {carrinho.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Carrinho vazio</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                      {carrinho.map(item => {
                        const produto = items.find(i => i.id === item.itemId);
                        if (!produto) return null;

                        return (
                          <div key={item.itemId} className="bg-white rounded-lg p-3 border border-line">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-semibold text-charcoal flex-1 pr-2">{produto.descricao}</span>
                              <button
                                onClick={() => handleRemoveItem(item.itemId)}
                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                <button
                                  onClick={() => handleUpdateQuantidade(item.itemId, -1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded hover:bg-red-100 text-red-600 font-bold"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center font-bold text-sm">{item.quantidade}</span>
                                <button
                                  onClick={() => handleUpdateQuantidade(item.itemId, 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded hover:bg-green-100 text-green-600 font-bold"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-sm font-bold text-gold-ak">
                                R$ {(produto.valor_unitario * item.quantidade).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 border-t border-line pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold">R$ {calcularSubtotal().toFixed(2)}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setTipoDesconto('percentual')}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                            tipoDesconto === 'percentual'
                              ? 'border-gold-ak bg-silk text-charcoal'
                              : 'border-line hover:border-gray-300'
                          }`}
                        >
                          <Percent className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => setTipoDesconto('fixo')}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                            tipoDesconto === 'fixo'
                              ? 'border-gold-ak bg-silk text-charcoal'
                              : 'border-line hover:border-gray-300'
                          }`}
                        >
                          <DollarSign className="w-4 h-4 mx-auto" />
                        </button>
                        <input
                          type="number"
                          value={desconto}
                          onChange={(e) => setDesconto(Math.max(0, Number(e.target.value)))}
                          placeholder="0"
                          className="flex-1 px-3 py-2 border-2 border-line rounded-lg text-center font-bold"
                        />
                      </div>

                      {desconto > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Desconto:</span>
                          <span className="font-semibold">-R$ {calcularDesconto().toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xl font-bold pt-2 border-t border-line">
                        <span>Total:</span>
                        <span className="text-gold-ak">R$ {calcularTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mt-4 pt-4 border-t border-line">
                      <label className="block text-sm font-bold text-charcoal">Forma de Pagamento</label>
                      <div className="grid grid-cols-2 gap-2">
                        {formasPagamento.map(forma => {
                          const Icon = forma.icon;
                          return (
                            <button
                              key={forma.value}
                              onClick={() => setFormaPagamento(forma.value)}
                              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                formaPagamento === forma.value
                                  ? 'border-gold-ak bg-silk text-charcoal'
                                  : 'border-line hover:border-gray-300'
                              }`}
                            >
                              <Icon className="w-4 h-4 mx-auto mb-1" />
                              {forma.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setTipoVenda('avista')}
                          className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                            tipoVenda === 'avista'
                              ? 'border-gold-ak bg-silk text-charcoal'
                              : 'border-line hover:border-gray-300'
                          }`}
                        >
                          À Vista
                        </button>
                        <button
                          onClick={() => setTipoVenda('parcelado')}
                          className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                            tipoVenda === 'parcelado'
                              ? 'border-gold-ak bg-silk text-charcoal'
                              : 'border-line hover:border-gray-300'
                          }`}
                        >
                          Parcelado
                        </button>
                      </div>

                      {tipoVenda === 'parcelado' && (
                        <div className="space-y-2 animate-fade-in">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={calcularTotal()}
                            value={valorEntrada}
                            onChange={(e) => setValorEntrada(Number(e.target.value))}
                            placeholder="Entrada (opcional)"
                            className="w-full px-3 py-2 border-2 border-line rounded-lg"
                          />
                          <select
                            value={numeroParcelas}
                            onChange={(e) => setNumeroParcelas(Number(e.target.value))}
                            className="w-full px-3 py-2 border-2 border-line rounded-lg font-medium"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => (
                              <option key={n} value={n}>{n}x de R$ {((calcularTotal() - valorEntrada) / n).toFixed(2)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-line p-6 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-line rounded-lg hover:bg-white transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedCliente || carrinho.length === 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-gold-ak to-amber-warning hover:from-amber-warning hover:to-gold-ak text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg"
          >
            {loading ? 'Processando...' : '✓ Finalizar Venda'}
          </button>
        </div>
      </div>
    </div>
  );
}

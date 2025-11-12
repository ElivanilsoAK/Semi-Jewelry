import { useState, useEffect } from 'react';
import { supabase, Cliente, Pano, ItemPano, withUserId } from '../../lib/supabase';
import { X, Plus, Trash2, UserPlus } from 'lucide-react';

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

  const calcularValorTotal = () => {
    return itensVenda.reduce((sum, item) => sum + item.valor_total, 0);
  };

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
      const valorTotal = calcularValorTotal();
      const valorParcela = valorTotal / numeroParcelas;

      const vendaComUserId = await withUserId({
          cliente_id: clienteSelecionado,
          valor_total: valorTotal,
          status_pagamento: 'pendente',
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
        const { error: updateError } = await supabase.rpc('atualizar_quantidade_item', {
          item_id: item.item_pano_id,
          qtd_vendida: item.quantidade,
        });

        if (updateError) {
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
        status: 'pendente',
      }));

      const pagamentosInsert = await Promise.all(pagamentosBase.map(pag => withUserId(pag)));

      const { error: pagamentosError } = await supabase
        .from('pagamentos')
        .insert(pagamentosInsert);

      if (pagamentosError) throw pagamentosError;

      alert('Venda registrada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      alert('Erro ao registrar venda');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Nova Venda</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            {['cliente', 'itens', 'pagamento'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${
                  step === s || i < ['cliente', 'itens', 'pagamento'].indexOf(step)
                    ? 'bg-emerald-600'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'cliente' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Selecione o Cliente</h3>

              {!mostrarNovoCliente ? (
                <>
                  <select
                    value={clienteSelecionado}
                    onChange={(e) => setClienteSelecionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.telefone ? `- ${cliente.telefone}` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setMostrarNovoCliente(true)}
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                  >
                    <UserPlus className="w-5 h-5" />
                    Cadastrar novo cliente
                  </button>
                </>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-800">Novo Cliente</h4>
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMostrarNovoCliente(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCriarCliente}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Criar Cliente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'itens' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Adicionar Itens</h3>

              <select
                value={panoSelecionado}
                onChange={(e) => setPanoSelecionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione um pano</option>
                {panos.map((pano) => (
                  <option key={pano.id} value={pano.id}>
                    {pano.nome}
                  </option>
                ))}
              </select>

              {panoSelecionado && itensDisponiveis.length > 0 && (
                <div className="space-y-2">
                  {itensDisponiveis.map((item) => {
                    const jaAdicionado = itensVenda.some(i => i.item_pano_id === item.id);

                    return (
                      <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.descricao}</p>
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
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAdicionarItem(item, parseInt((e.target as HTMLInputElement).value) || 0);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleAdicionarItem(item, parseInt(e.target.value) || 0);
                                e.target.value = '';
                              }
                            }}
                          />
                        )}
                        {jaAdicionado && (
                          <span className="text-sm text-green-600 font-medium">Adicionado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {itensVenda.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Itens da Venda</h4>
                  <div className="space-y-2">
                    {itensVenda.map((item) => (
                      <div key={item.item_pano_id} className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{item.descricao}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantidade}x R$ {item.valor_unitario.toFixed(2)} = R$ {item.valor_total.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoverItem(item.item_pano_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-lg font-bold text-gray-800">
                      Total: R$ {calcularValorTotal().toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'pagamento' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Forma de Pagamento</h3>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-lg font-bold text-gray-800 mb-2">
                  Valor Total: R$ {calcularValorTotal().toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Parcelas
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={numeroParcelas}
                  onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {numeroParcelas > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datas de Vencimento das Parcelas
                  </label>
                  <div className="space-y-2">
                    {datasParcelas.map((data, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-24">
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">
                          R$ {(calcularValorTotal() / numeroParcelas).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={3}
                  placeholder="Informações adicionais sobre a venda..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          {step !== 'cliente' && (
            <button
              onClick={() => setStep(step === 'pagamento' ? 'itens' : 'cliente')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
          )}

          {step === 'cliente' && (
            <button
              onClick={() => setStep('itens')}
              disabled={!clienteSelecionado}
              className="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          )}

          {step === 'itens' && (
            <button
              onClick={() => setStep('pagamento')}
              disabled={itensVenda.length === 0}
              className="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          )}

          {step === 'pagamento' && (
            <button
              onClick={handleFinalizarVenda}
              disabled={saving}
              className="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Finalizando...' : 'Finalizar Venda'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase, withUserId } from '../../lib/supabase';
import { X, Search } from 'lucide-react';

interface Cliente {
  id: string;
  nome: string;
}

interface Item {
  id: string;
  descricao: string;
  valor_unitario: number;
  quantidade_disponivel: number;
}

export default function VendaRapidaModal({ onClose }: { onClose: () => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantidade: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'avista' | 'parcelado'>('avista');
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: clientesData } = await supabase.from('clientes').select('id, nome').order('nome');
    const { data: itemsData } = await supabase
      .from('itens_pano')
      .select('*')
      .gt('quantidade_disponivel', 0)
      .order('descricao');

    setClientes(clientesData || []);
    setItems(itemsData || []);
  };

  const filteredItems = items.filter(item =>
    item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (itemId: string) => {
    const existing = selectedItems.find(i => i.itemId === itemId);
    if (existing) {
      setSelectedItems(selectedItems.map(i =>
        i.itemId === itemId ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { itemId, quantidade: 1 }]);
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, selected) => {
      const item = items.find(i => i.id === selected.itemId);
      return total + (item?.valor_unitario || 0) * selected.quantidade;
    }, 0);
  };

  const handleSubmit = async () => {
    if (!selectedCliente || selectedItems.length === 0) {
      alert('Selecione um cliente e pelo menos um item');
      return;
    }

    const totalVenda = calculateTotal();

    if (formaPagamento === 'parcelado' && valorEntrada > totalVenda) {
      alert('Valor de entrada não pode ser maior que o total da venda');
      return;
    }

    setLoading(true);
    try {
      // Criar venda
      const statusPagamento = formaPagamento === 'avista' ? 'pago' : valorEntrada >= totalVenda ? 'pago' : 'pendente';
      const vendaComUserId = await withUserId({
        cliente_id: selectedCliente,
        valor_total: totalVenda,
        status_pagamento: statusPagamento
      });

      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert([vendaComUserId])
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Inserir itens da venda
      const itensVendaBase = selectedItems.map(selected => {
        const item = items.find(i => i.id === selected.itemId)!;
        return {
          venda_id: venda.id,
          item_pano_id: selected.itemId,
          quantidade: selected.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_unitario * selected.quantidade
        };
      });

      const itensVenda = await Promise.all(itensVendaBase.map(item => withUserId(item)));
      const { error: itensError } = await supabase.from('itens_venda').insert(itensVenda);
      if (itensError) throw itensError;

      // Criar pagamentos
      const hoje = new Date();
      const pagamentos = [];

      if (formaPagamento === 'avista') {
        // Pagamento à vista
        pagamentos.push(await withUserId({
          venda_id: venda.id,
          valor: totalVenda,
          data_vencimento: hoje.toISOString().split('T')[0],
          data_pagamento: hoje.toISOString().split('T')[0],
          status: 'pago'
        }));
      } else {
        // Pagamento parcelado
        const valorRestante = totalVenda - valorEntrada;

        // Pagamento de entrada (se houver)
        if (valorEntrada > 0) {
          pagamentos.push(await withUserId({
            venda_id: venda.id,
            valor: valorEntrada,
            data_vencimento: hoje.toISOString().split('T')[0],
            data_pagamento: hoje.toISOString().split('T')[0],
            status: 'pago'
          }));
        }

        // Parcelas restantes
        const valorParcela = valorRestante / numeroParcelas;
        for (let i = 0; i < numeroParcelas; i++) {
          const dataVencimento = new Date(hoje);
          dataVencimento.setMonth(dataVencimento.getMonth() + i + 1);

          pagamentos.push(await withUserId({
            venda_id: venda.id,
            valor: valorParcela,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            status: 'pendente'
          }));
        }
      }

      const { error: pagamentosError } = await supabase.from('pagamentos').insert(pagamentos);
      if (pagamentosError) throw pagamentosError;

      // Atualizar estoque
      for (const selected of selectedItems) {
        const item = items.find(i => i.id === selected.itemId)!;
        await supabase
          .from('itens_pano')
          .update({ quantidade_disponivel: item.quantidade_disponivel - selected.quantidade })
          .eq('id', selected.itemId);
      }

      alert('Venda realizada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao realizar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Venda Rápida</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Item</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite para buscar..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item.id)}
                className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-0"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{item.descricao}</span>
                  <span className="text-emerald-600">R$ {item.valor_unitario.toFixed(2)}</span>
                </div>
                <span className="text-xs text-gray-500">Disponível: {item.quantidade_disponivel}</span>
              </button>
            ))}
          </div>

          {selectedItems.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Itens Selecionados</h3>
                {selectedItems.map(selected => {
                  const item = items.find(i => i.id === selected.itemId);
                  return (
                    <div key={selected.itemId} className="flex justify-between py-2">
                      <span>{item?.descricao} x{selected.quantidade}</span>
                      <span>R$ {((item?.valor_unitario || 0) * selected.quantidade).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-emerald-600">R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Forma de Pagamento</h3>
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('avista')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      formaPagamento === 'avista'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    À Vista
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('parcelado')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      formaPagamento === 'parcelado'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Parcelado
                  </button>
                </div>

                {formaPagamento === 'parcelado' && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor de Entrada (Opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={calculateTotal()}
                        value={valorEntrada}
                        onChange={(e) => setValorEntrada(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Parcelas
                      </label>
                      <select
                        value={numeroParcelas}
                        onChange={(e) => setNumeroParcelas(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                    {valorEntrada < calculateTotal() && (
                      <div className="bg-gray-50 p-3 rounded-lg text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">Valor restante:</span>
                          <span className="font-semibold">R$ {(calculateTotal() - valorEntrada).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valor da parcela:</span>
                          <span className="font-semibold text-emerald-600">
                            {numeroParcelas}x R$ {((calculateTotal() - valorEntrada) / numeroParcelas).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formaPagamento === 'avista' && (
                  <div className="bg-emerald-50 p-3 rounded-lg animate-fade-in">
                    <p className="text-sm text-emerald-700">
                      ✓ Pagamento será registrado como pago imediatamente
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedCliente || selectedItems.length === 0}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

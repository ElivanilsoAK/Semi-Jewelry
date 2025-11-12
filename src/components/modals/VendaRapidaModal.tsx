import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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

    setLoading(true);
    try {
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert([{
          cliente_id: selectedCliente,
          valor_total: calculateTotal(),
          status_pagamento: 'pendente'
        }])
        .select()
        .single();

      if (vendaError) throw vendaError;

      const itensVenda = selectedItems.map(selected => {
        const item = items.find(i => i.id === selected.itemId)!;
        return {
          venda_id: venda.id,
          item_pano_id: selected.itemId,
          quantidade: selected.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_unitario * selected.quantidade
        };
      });

      const { error: itensError } = await supabase.from('itens_venda').insert(itensVenda);
      if (itensError) throw itensError;

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
            <div className="border-t pt-4">
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
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span>R$ {calculateTotal().toFixed(2)}</span>
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

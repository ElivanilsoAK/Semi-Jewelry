import { useState, useEffect } from 'react';
import { Shield, Plus, Search, RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Garantia {
  id: string;
  venda_id: string;
  item_original_id: string;
  item_novo_id: string | null;
  tipo: 'troca' | 'reparo' | 'devolucao';
  motivo: string;
  status: 'pendente' | 'aprovada' | 'concluida' | 'rejeitada';
  created_at: string;
  venda?: {
    cliente_nome: string;
    data_venda: string;
  };
  item_original?: {
    descricao: string;
    valor_unitario: number;
  };
  item_novo?: {
    descricao: string;
    valor_unitario: number;
  };
}

export default function GarantiasView() {
  const { user } = useAuth();
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [showNovaGarantia, setShowNovaGarantia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const [vendas, setVendas] = useState<any[]>([]);
  const [vendaSelecionada, setVendaSelecionada] = useState<string>('');
  const [itensDaVenda, setItensDaVenda] = useState<any[]>([]);
  const [itemOriginalId, setItemOriginalId] = useState<string>('');
  const [itemNovoId, setItemNovoId] = useState<string>('');
  const [tipo, setTipo] = useState<'troca' | 'reparo' | 'devolucao'>('troca');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    carregarGarantias();
    carregarVendas();
  }, []);

  useEffect(() => {
    if (vendaSelecionada) {
      carregarItensDaVenda(vendaSelecionada);
    }
  }, [vendaSelecionada]);

  async function carregarGarantias() {
    const { data, error } = await supabase
      .from('garantias')
      .select(`
        *,
        venda:vendas!garantias_venda_id_fkey(cliente_nome, data_venda),
        item_original:itens_venda!garantias_item_original_id_fkey(descricao, valor_unitario),
        item_novo:itens_venda!garantias_item_novo_id_fkey(descricao, valor_unitario)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setGarantias(data);
    }
  }

  async function carregarVendas() {
    const { data, error } = await supabase
      .from('vendas')
      .select('id, cliente_nome, data_venda')
      .eq('user_id', user?.id)
      .order('data_venda', { ascending: false })
      .limit(50);

    if (!error && data) {
      setVendas(data);
    }
  }

  async function carregarItensDaVenda(vendaId: string) {
    const { data, error } = await supabase
      .from('itens_venda')
      .select('*')
      .eq('venda_id', vendaId);

    if (!error && data) {
      setItensDaVenda(data);
    }
  }

  async function criarGarantia() {
    if (!vendaSelecionada || !itemOriginalId || !motivo.trim()) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('garantias')
      .insert({
        venda_id: vendaSelecionada,
        item_original_id: itemOriginalId,
        item_novo_id: tipo === 'troca' && itemNovoId ? itemNovoId : null,
        tipo,
        motivo,
        status: 'pendente'
      });

    if (!error) {
      setShowNovaGarantia(false);
      resetForm();
      carregarGarantias();
    }
    setLoading(false);
  }

  function resetForm() {
    setVendaSelecionada('');
    setItemOriginalId('');
    setItemNovoId('');
    setTipo('troca');
    setMotivo('');
  }

  async function atualizarStatus(garantiaId: string, novoStatus: string) {
    await supabase
      .from('garantias')
      .update({ status: novoStatus })
      .eq('id', garantiaId);

    carregarGarantias();
  }

  const garantiasFiltradas = garantias.filter((g) => {
    const matchBusca = g.venda?.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
      g.item_original?.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || g.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const statusColors = {
    pendente: 'bg-yellow-100 text-yellow-700',
    aprovada: 'bg-blue-100 text-blue-700',
    concluida: 'bg-green-100 text-green-700',
    rejeitada: 'bg-red-100 text-red-700',
  };

  const tipoLabels = {
    troca: 'Troca',
    reparo: 'Reparo',
    devolucao: 'Devolução',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Garantias</h2>
            <p className="text-sm text-gray-600">Gerencie trocas e garantias de produtos</p>
          </div>
        </div>
        <button onClick={() => setShowNovaGarantia(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nova Garantia
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por cliente ou item..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-field md:w-48"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="concluida">Concluída</option>
            <option value="rejeitada">Rejeitada</option>
          </select>
        </div>

        {garantiasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhuma garantia registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {garantiasFiltradas.map((garantia) => (
              <div
                key={garantia.id}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[garantia.status]}`}>
                        {garantia.status.charAt(0).toUpperCase() + garantia.status.slice(1)}
                      </span>
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                        {tipoLabels[garantia.tipo]}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{garantia.venda?.cliente_nome}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Item: {garantia.item_original?.descricao}
                    </p>
                    {garantia.tipo === 'troca' && garantia.item_novo && (
                      <p className="text-sm text-gray-600">
                        → Trocar por: {garantia.item_novo.descricao}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Motivo: {garantia.motivo}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(garantia.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {garantia.status === 'pendente' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => atualizarStatus(garantia.id, 'aprovada')}
                        className="btn-secondary text-green-600 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar
                      </button>
                      <button
                        onClick={() => atualizarStatus(garantia.id, 'rejeitada')}
                        className="btn-secondary text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeitar
                      </button>
                    </div>
                  )}
                  {garantia.status === 'aprovada' && (
                    <button
                      onClick={() => atualizarStatus(garantia.id, 'concluida')}
                      className="btn-primary"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Concluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNovaGarantia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Nova Garantia</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venda Original
                </label>
                <select
                  value={vendaSelecionada}
                  onChange={(e) => setVendaSelecionada(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecione uma venda</option>
                  {vendas.map((venda) => (
                    <option key={venda.id} value={venda.id}>
                      {venda.cliente_nome} - {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                    </option>
                  ))}
                </select>
              </div>

              {vendaSelecionada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Original
                  </label>
                  <select
                    value={itemOriginalId}
                    onChange={(e) => setItemOriginalId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione o item</option>
                    {itensDaVenda.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.descricao} - R$ {item.valor_unitario.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Garantia
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['troca', 'reparo', 'devolucao'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tipo === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {tipoLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              {tipo === 'troca' && vendaSelecionada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Novo (Opcional)
                  </label>
                  <select
                    value={itemNovoId}
                    onChange={(e) => setItemNovoId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione o novo item</option>
                    {itensDaVenda.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.descricao} - R$ {item.valor_unitario.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo da garantia..."
                  className="input-field"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowNovaGarantia(false);
                  resetForm();
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={criarGarantia}
                disabled={loading}
                className="btn-primary flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Criar Garantia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

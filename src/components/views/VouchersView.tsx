import { useState, useEffect } from 'react';
import { Ticket, Search, Copy, Check, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Voucher {
  id: string;
  codigo: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  valor_original: number;
  valor_disponivel: number;
  valor_utilizado: number;
  status: string;
  status_descricao: string;
  data_validade: string;
  tipo_garantia: string;
  motivo_garantia: string;
  esta_vencido: boolean;
  created_at: string;
}

export default function VouchersView() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    carregarVouchers();

    const channel = supabase
      .channel('vouchers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, carregarVouchers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function carregarVouchers() {
    try {
      const { data, error } = await supabase
        .from('vouchers_detalhados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error('Erro ao carregar vouchers:', error);
    } finally {
      setLoading(false);
    }
  }

  const copiarCodigo = (codigo: string, id: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusIcon = (voucher: Voucher) => {
    if (voucher.status === 'utilizado') {
      return { icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-100' };
    }
    if (voucher.status === 'cancelado') {
      return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' };
    }
    if (voucher.esta_vencido) {
      return { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' };
    }
    return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' };
  };

  const vouchersFiltrados = vouchers.filter(v =>
    v.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
    v.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  const totais = {
    ativos: vouchers.filter(v => v.status === 'ativo' && !v.esta_vencido).length,
    utilizados: vouchers.filter(v => v.status === 'utilizado').length,
    vencidos: vouchers.filter(v => v.esta_vencido).length,
    valor_total_ativo: vouchers
      .filter(v => v.status === 'ativo' && !v.esta_vencido)
      .reduce((sum, v) => sum + v.valor_disponivel, 0)
  };

  if (loading) return <div className="text-center py-12">Carregando vouchers...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl">
          <Ticket className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Vouchers de Garantia</h1>
          <p className="text-sm text-gray-600">Créditos e vale-compras dos clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <p className="text-sm text-gray-600 mb-1">Vouchers Ativos</p>
          <p className="text-2xl font-bold text-green-600">{totais.ativos}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(totais.valor_total_ativo)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <p className="text-sm text-gray-600 mb-1">Utilizados</p>
          <p className="text-2xl font-bold text-gray-600">{totais.utilizados}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <p className="text-sm text-gray-600 mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-orange-600">{totais.vencidos}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <p className="text-sm text-gray-600 mb-1">Total de Vouchers</p>
          <p className="text-2xl font-bold text-charcoal">{vouchers.length}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por cliente ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vouchersFiltrados.map((voucher) => {
          const statusInfo = getStatusIcon(voucher);
          const StatusIcon = statusInfo.icon;
          const percentualUtilizado = (voucher.valor_utilizado / voucher.valor_original) * 100;

          return (
            <div
              key={voucher.id}
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${
                voucher.status === 'ativo' && !voucher.esta_vencido
                  ? 'border-purple-500'
                  : 'border-line'
              }`}
            >
              <div className={`p-4 ${statusInfo.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                    <span className={`text-sm font-bold ${statusInfo.color}`}>
                      {voucher.status_descricao.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => copiarCodigo(voucher.codigo, voucher.id)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Copiar código"
                  >
                    {copiedId === voucher.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="font-mono text-lg font-bold text-charcoal">{voucher.codigo}</p>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-bold text-charcoal">{voucher.cliente_nome}</p>
                  {voucher.cliente_telefone && (
                    <p className="text-xs text-gray-500">{voucher.cliente_telefone}</p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-line">
                  <div>
                    <p className="text-xs text-gray-600">Valor Original</p>
                    <p className="text-sm font-bold text-charcoal">
                      {formatCurrency(voucher.valor_original)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Disponível</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(voucher.valor_disponivel)}
                    </p>
                  </div>
                </div>

                {voucher.valor_utilizado > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Utilizado</span>
                      <span>{percentualUtilizado.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-700 h-2 rounded-full transition-all"
                        style={{ width: `${percentualUtilizado}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatCurrency(voucher.valor_utilizado)} usado
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-line space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Válido até:</span>
                    <span className={`font-medium ${voucher.esta_vencido ? 'text-red-600' : 'text-charcoal'}`}>
                      {formatDate(voucher.data_validade)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Origem:</span>
                    <span className="font-medium text-charcoal">
                      {voucher.tipo_garantia === 'troca' ? 'Troca' : 'Devolução'}
                    </span>
                  </div>
                  {voucher.motivo_garantia && (
                    <p className="text-xs text-gray-500 italic mt-2">
                      "{voucher.motivo_garantia}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {vouchersFiltrados.length === 0 && (
        <div className="text-center py-12">
          <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {busca ? 'Nenhum voucher encontrado' : 'Nenhum voucher cadastrado'}
          </p>
        </div>
      )}
    </div>
  );
}

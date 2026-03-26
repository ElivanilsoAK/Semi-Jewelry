import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, Users, Tag, DollarSign, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Categoria {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  user_id: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface ConfigFinanceiro {
  percentual_comissao: number;
  percentual_prestacao_contas: number;
  prazo_garantia_meses: number;
  politica_troca: string;
  permitir_troca_entre_panos: boolean;
  exigir_motivo_troca: boolean;
}

const defaultConfig: ConfigFinanceiro = {
  percentual_comissao: 10,
  percentual_prestacao_contas: 60,
  prazo_garantia_meses: 24,
  politica_troca: '',
  permitir_troca_entre_panos: true,
  exigir_motivo_troca: true,
};

type Toast = { id: number; msg: string; type: 'success' | 'error' };

export default function ConfiguracoesView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'categorias' | 'financeiro' | 'usuarios'>('categorias');

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState({ nome: '', cor: '#3B82F6' });
  const [loading, setLoading] = useState(false);

  const [usuarios, setUsuarios] = useState<UserRole[]>([]);

  const [configFinanceiro, setConfigFinanceiro] = useState<ConfigFinanceiro>(defaultConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    if (activeTab === 'categorias') {
      carregarCategorias();
    } else if (activeTab === 'usuarios') {
      carregarUsuarios();
    } else if (activeTab === 'financeiro') {
      carregarConfigFinanceiro();
    }
  }, [activeTab]);

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .or(`user_id.eq.${user?.id},user_id.is.null`)
      .order('ordem');

    if (!error && data) {
      setCategorias(data);
    }
  }

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsuarios(data);
    }
  }

  async function carregarConfigFinanceiro() {
    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!error && data) {
      setConfigId(data.id);
      setConfigFinanceiro({
        percentual_comissao: data.percentual_comissao ?? defaultConfig.percentual_comissao,
        percentual_prestacao_contas: data.percentual_prestacao_contas ?? defaultConfig.percentual_prestacao_contas,
        prazo_garantia_meses: data.prazo_garantia_meses ?? defaultConfig.prazo_garantia_meses,
        politica_troca: data.politica_troca ?? '',
        permitir_troca_entre_panos: data.permitir_troca_entre_panos ?? true,
        exigir_motivo_troca: data.exigir_motivo_troca ?? true,
      });
    }
  }

  async function salvarConfigFinanceiro() {
    setSavingConfig(true);
    try {
      const payload = {
        user_id: user?.id,
        percentual_comissao: configFinanceiro.percentual_comissao,
        percentual_prestacao_contas: configFinanceiro.percentual_prestacao_contas,
        prazo_garantia_meses: configFinanceiro.prazo_garantia_meses,
        politica_troca: configFinanceiro.politica_troca,
        permitir_troca_entre_panos: configFinanceiro.permitir_troca_entre_panos,
        exigir_motivo_troca: configFinanceiro.exigir_motivo_troca,
      };

      let error;
      if (configId) {
        ({ error } = await supabase
          .from('configuracoes_sistema')
          .update(payload)
          .eq('id', configId));
      } else {
        const { data, error: insertError } = await supabase
          .from('configuracoes_sistema')
          .insert(payload)
          .select()
          .single();
        error = insertError;
        if (data) setConfigId(data.id);
      }

      if (error) throw error;
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      showToast('Erro ao salvar configurações.', 'error');
    } finally {
      setSavingConfig(false);
    }
  }

  async function adicionarCategoria() {
    if (!novaCategoria.nome.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('categorias')
      .insert({
        user_id: user?.id,
        nome: novaCategoria.nome,
        cor: novaCategoria.cor,
        ordem: categorias.length,
        ativo: true
      });

    if (!error) {
      setNovaCategoria({ nome: '', cor: '#3B82F6' });
      carregarCategorias();
      showToast('Categoria adicionada!');
    } else {
      showToast('Erro ao adicionar categoria.', 'error');
    }
    setLoading(false);
  }

  async function removerCategoria(id: string) {
    if (!confirm('Deseja realmente remover esta categoria?')) return;

    await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    carregarCategorias();
  }

  async function toggleCategoriaAtiva(id: string, ativo: boolean) {
    await supabase
      .from('categorias')
      .update({ ativo: !ativo })
      .eq('id', id);

    carregarCategorias();
  }

  const cores = [
    { nome: 'Azul', valor: '#3B82F6' },
    { nome: 'Verde', valor: '#10B981' },
    { nome: 'Vermelho', valor: '#EF4444' },
    { nome: 'Amarelo', valor: '#F59E0B' },
    { nome: 'Rosa', valor: '#EC4899' },
    { nome: 'Roxo', valor: '#8B5CF6' },
    { nome: 'Cinza', valor: '#6B7280' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all animate-fade-in ${
              t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {t.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {t.msg}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
            <p className="text-sm text-gray-600">Gerencie categorias, financeiro e usuários</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('categorias')}
          className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'categorias'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          Categorias
        </button>
        <button
          onClick={() => setActiveTab('financeiro')}
          className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'financeiro'
              ? 'text-gold-ak border-b-2 border-gold-ak'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Financeiro &amp; Trocas
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'usuarios'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários
        </button>
      </div>

      {/* ===== ABA CATEGORIAS ===== */}
      {activeTab === 'categorias' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Categoria</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  value={novaCategoria.nome}
                  onChange={(e) => setNovaCategoria({ ...novaCategoria, nome: e.target.value })}
                  placeholder="Ex: Pulseiras, Colares, Anéis..."
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && adicionarCategoria()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {cores.map((cor) => (
                    <button
                      key={cor.valor}
                      onClick={() => setNovaCategoria({ ...novaCategoria, cor: cor.valor })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        novaCategoria.cor === cor.valor ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: cor.valor }}
                      title={cor.nome}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={adicionarCategoria}
              disabled={loading || !novaCategoria.nome.trim()}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Categoria
            </button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorias Cadastradas</h3>

            {categorias.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma categoria cadastrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categorias.filter(c => c.user_id === null).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Categorias do Sistema
                      </span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    <div className="space-y-2">
                      {categorias.filter(c => c.user_id === null).map((categoria) => (
                        <div
                          key={categoria.id}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full shadow-sm"
                              style={{ backgroundColor: categoria.cor }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{categoria.nome}</p>
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase">
                                  Sistema
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {categoria.ativo ? '✓ Ativa' : '○ Inativa'} • Não pode ser deletada
                              </p>
                            </div>
                          </div>
                          <button
                            disabled
                            className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                          >
                            {categoria.ativo ? 'Ativa' : 'Inativa'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {categorias.filter(c => c.user_id !== null).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 mt-6">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Suas Categorias Personalizadas
                      </span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    <div className="space-y-2">
                      {categorias.filter(c => c.user_id !== null).map((categoria) => (
                        <div
                          key={categoria.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full shadow-sm"
                              style={{ backgroundColor: categoria.cor }}
                            />
                            <div>
                              <p className="font-medium text-gray-900">{categoria.nome}</p>
                              <p className="text-xs text-gray-500">
                                {categoria.ativo ? '✓ Ativa' : '○ Inativa'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCategoriaAtiva(categoria.id, categoria.ativo)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                categoria.ativo
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {categoria.ativo ? 'Ativa' : 'Inativa'}
                            </button>
                            <button
                              onClick={() => removerCategoria(categoria.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ABA FINANCEIRO & TROCAS ===== */}
      {activeTab === 'financeiro' && (
        <div className="space-y-6">
          {/* Comissão e Prestação */}
          <div className="bg-white rounded-xl border-2 border-line p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gold-ak/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-gold-ak" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Comissão e Repasse</h3>
                <p className="text-sm text-gray-500">Percentuais usados no dashboard e nos relatórios</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Percentual de Comissão da Vendedora (%)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Quanto você ganha sobre cada venda paga. Ex: 10 = 10%
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={configFinanceiro.percentual_comissao}
                    onChange={(e) =>
                      setConfigFinanceiro({
                        ...configFinanceiro,
                        percentual_comissao: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 pr-12 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-bold text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">%</span>
                </div>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  💡 Exemplo: Venda de R$ 1.000 → sua comissão = <strong>R$ {(1000 * configFinanceiro.percentual_comissao / 100).toFixed(2)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Percentual de Prestação de Contas (%)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Quanto do total de vendas é repassado ao fornecedor. Ex: 60 = 60%
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={configFinanceiro.percentual_prestacao_contas}
                    onChange={(e) =>
                      setConfigFinanceiro({
                        ...configFinanceiro,
                        percentual_prestacao_contas: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 pr-12 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-bold text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">%</span>
                </div>
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  💡 Exemplo: Venda de R$ 1.000 → repasse ao fornecedor = <strong>R$ {(1000 * configFinanceiro.percentual_prestacao_contas / 100).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Resumo financeiro interativo */}
            <div className="p-4 bg-gradient-to-r from-gold-ak to-amber-warning rounded-xl text-white">
              <p className="text-sm font-medium opacity-90 mb-3">Simulação: Venda de R$ 1.000 paga</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs opacity-75">Total Venda</p>
                  <p className="text-xl font-bold">R$ 1.000</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">Repasse Fornecedor</p>
                  <p className="text-xl font-bold">R$ {(1000 * configFinanceiro.percentual_prestacao_contas / 100).toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">Sua Comissão</p>
                  <p className="text-xl font-bold">R$ {(1000 * configFinanceiro.percentual_comissao / 100).toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Garantias e Trocas */}
          <div className="bg-white rounded-xl border-2 border-line p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Política de Garantias e Trocas</h3>
                <p className="text-sm text-gray-500">Regras aplicadas em todo o sistema de garantias</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Prazo de Garantia (meses)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Por quantos meses após a venda o cliente pode solicitar troca/devolução
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    value={configFinanceiro.prazo_garantia_meses}
                    onChange={(e) =>
                      setConfigFinanceiro({
                        ...configFinanceiro,
                        prazo_garantia_meses: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-3 pr-24 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent font-bold text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">meses</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Atual: <strong>{configFinanceiro.prazo_garantia_meses} meses</strong>
                  {configFinanceiro.prazo_garantia_meses === 24 && ' (padrão legal para semijoias)'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Opções de Troca
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border-2 border-line rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div
                        className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${
                          configFinanceiro.permitir_troca_entre_panos ? 'bg-gold-ak' : 'bg-gray-300'
                        }`}
                        onClick={() =>
                          setConfigFinanceiro({
                            ...configFinanceiro,
                            permitir_troca_entre_panos: !configFinanceiro.permitir_troca_entre_panos,
                          })
                        }
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                            configFinanceiro.permitir_troca_entre_panos ? 'left-5' : 'left-1'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Permitir troca entre panos diferentes</p>
                        <p className="text-xs text-gray-500">Cliente pode trocar por item de outro lote</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border-2 border-line rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div
                        className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${
                          configFinanceiro.exigir_motivo_troca ? 'bg-gold-ak' : 'bg-gray-300'
                        }`}
                        onClick={() =>
                          setConfigFinanceiro({
                            ...configFinanceiro,
                            exigir_motivo_troca: !configFinanceiro.exigir_motivo_troca,
                          })
                        }
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                            configFinanceiro.exigir_motivo_troca ? 'left-5' : 'left-1'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Exigir motivo para troca</p>
                        <p className="text-xs text-gray-500">Campo obrigatório ao registrar garantia</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Política de Troca (texto para clientes)
              </label>
              <textarea
                value={configFinanceiro.politica_troca}
                onChange={(e) =>
                  setConfigFinanceiro({ ...configFinanceiro, politica_troca: e.target.value })
                }
                placeholder="Ex: Aceitamos trocas em até 24 meses mediante apresentação da nota fiscal. A peça deve estar em perfeito estado..."
                className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-transparent"
                rows={4}
              />
            </div>
          </div>

          {/* Botão salvar */}
          <div className="flex justify-end">
            <button
              onClick={salvarConfigFinanceiro}
              disabled={savingConfig}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gold-ak to-amber-warning hover:from-amber-warning hover:to-gold-ak text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
            >
              {savingConfig ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===== ABA USUÁRIOS ===== */}
      {activeTab === 'usuarios' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usuários do Sistema</h3>
          {usuarios.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {usuarios.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{usuario.email}</p>
                    <p className="text-sm text-gray-500 capitalize">{usuario.role}</p>
                  </div>
                  <div className="flex gap-2">
                    {usuario.permissions?.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

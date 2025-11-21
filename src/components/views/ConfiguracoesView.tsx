import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, Users, Tag } from 'lucide-react';
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

export default function ConfiguracoesView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'categorias' | 'usuarios'>('categorias');

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState({ nome: '', cor: '#3B82F6' });
  const [loading, setLoading] = useState(false);

  const [usuarios, setUsuarios] = useState<UserRole[]>([]);

  useEffect(() => {
    if (activeTab === 'categorias') {
      carregarCategorias();
    } else {
      carregarUsuarios();
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
            <p className="text-sm text-gray-600">Gerencie categorias e usuários do sistema</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('categorias')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'categorias'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Tag className="w-4 h-4 inline mr-2" />
          Categorias
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'usuarios'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Usuários
        </button>
      </div>

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
                {/* Categorias do Sistema */}
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
                          <div className="flex items-center gap-2">
                            <button
                              disabled
                              className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                              title="Categorias do sistema não podem ser alteradas"
                            >
                              {categoria.ativo ? 'Ativa' : 'Inativa'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categorias do Usuário */}
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
                              title="Remover categoria"
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

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> As categorias do sistema são padrão e não podem ser removidas.
                Você pode criar suas próprias categorias personalizadas que podem ser editadas e removidas.
              </p>
            </div>
          </div>
        </div>
      )}

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
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Dica:</strong> Sistema de permissões pronto para expansão futura.
              Controle quem pode criar, editar ou excluir vendas, panos e pagamentos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

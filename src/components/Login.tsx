import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Gem, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        alert('Conta criada com sucesso! Faça login para continuar.');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100 animate-fade-in-scale">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-50 animate-pulse-slow"></div>
            <div className="relative bg-gradient-to-br from-emerald-600 to-teal-600 p-4 rounded-2xl shadow-lg mb-4">
              <Gem className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
            Semi-Joias
          </h1>
          <p className="text-sm text-gray-500 font-medium">Sistema de Gestão</p>
        </div>

        <p className="text-gray-600 text-center mb-8 font-medium">
          {isSignUp ? 'Criar nova conta' : 'Faça login para continuar'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 button-hover flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Aguarde...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold transition-colors"
          >
            {isSignUp ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

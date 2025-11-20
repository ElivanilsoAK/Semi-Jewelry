import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setTimeout(() => {
          setIsForgotPassword(false);
          setSuccess('');
        }, 3000);
      } else if (isSignUp) {
        await signUp(email, password);
        setSuccess('Conta criada com sucesso! Faça login para continuar.');
        setTimeout(() => {
          setIsSignUp(false);
          setSuccess('');
        }, 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-silk via-ice to-canvas flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 md:p-10 w-full max-w-md border border-line animate-fade-in-scale">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gold-ak rounded-full blur-2xl opacity-40 animate-pulse-slow"></div>
            <img
              src="/esfera logo.png"
              alt="SPHERE Logo"
              className="relative w-28 h-28 object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl font-bold text-center text-charcoal mb-2">
            SPHERE
          </h1>
          <p className="text-sm text-gray-medium font-medium">by Magold Ana Kelly</p>
        </div>

        {isForgotPassword ? (
          <>
            <div className="mb-6">
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="flex items-center gap-2 text-gray-medium hover:text-charcoal transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>
            </div>

            <h2 className="text-xl font-bold text-charcoal mb-2">Recuperar Senha</h2>
            <p className="text-gray-medium text-sm mb-6">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>
          </>
        ) : (
          <p className="text-gray-medium text-center mb-8 font-medium">
            {isSignUp ? 'Criar nova conta' : 'Faça login para continuar'}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-gold-ak transition-all text-charcoal placeholder-gray-medium"
              required
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-line rounded-lg focus:ring-2 focus:ring-gold-ak focus:border-gold-ak transition-all text-charcoal"
                required
                minLength={6}
              />
            </div>
          )}

          {!isForgotPassword && !isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                }}
                className="text-sm text-gold-ak hover:text-amber-warning font-semibold transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          {error && (
            <div className="bg-ruby-light border-2 border-ruby-critical text-ruby-critical px-4 py-3 rounded-lg text-sm font-medium animate-slide-down">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-light border-2 border-emerald-success text-emerald-success px-4 py-3 rounded-lg text-sm font-medium animate-slide-down flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-ak hover:bg-amber-warning text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading
              ? 'Aguarde...'
              : isForgotPassword
              ? 'Enviar Link de Recuperação'
              : isSignUp
              ? 'Criar Conta'
              : 'Entrar'}
          </button>
        </form>

        {!isForgotPassword && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-gold-ak hover:text-amber-warning text-sm font-bold transition-colors"
            >
              {isSignUp ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-line">
          <p className="text-xs text-center text-gray-medium">
            Sistema de Gestão para Semi-Joias
            <br />
            <span className="font-semibold text-gold-ak">SPHERE</span> © 2025
          </p>
        </div>
      </div>
    </div>
  );
}

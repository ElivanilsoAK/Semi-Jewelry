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
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();

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

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // O redirecionamento acontece automaticamente pelo OAuth
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-silk via-ice to-canvas flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 md:p-10 w-full max-w-md border border-line animate-fade-in-scale">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gold-ak rounded-full blur-2xl opacity-40 animate-pulse-slow"></div>
            <div className="relative w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-silk to-white shadow-2xl border-4 border-gold-ak">
              <img
                src="/esfera logo.png"
                alt="SPHERE Logo"
                className="w-full h-full object-cover scale-100"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-center text-charcoal mb-2">
            SPHERE
          </h1>
          <p className="text-sm text-gray-medium font-medium">by Magold EAK</p>
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

        {/* Botão Google OAuth — visível apenas no login/cadastro normal */}
        {!isForgotPassword && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-line bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-charcoal text-sm group"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-medium" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>
                {googleLoading
                  ? 'Redirecionando...'
                  : isSignUp
                    ? 'Cadastrar com Google'
                    : 'Entrar com Google'}
              </span>
            </button>

            {/* Separador elegante */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-line"></div>
              <span className="text-xs text-gray-medium font-medium px-2">ou continue com email</span>
              <div className="flex-1 h-px bg-line"></div>
            </div>
          </div>
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
            disabled={loading || googleLoading}
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
            <span className="font-semibold text-gold-ak">SPHERE</span> © 2026
          </p>
        </div>
      </div>
    </div>
  );
}

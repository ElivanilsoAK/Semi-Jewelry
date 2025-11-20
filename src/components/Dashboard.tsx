import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package2, Users, ShoppingBag, LogOut, Home, Zap, CreditCard, FileText, Shield, Settings } from 'lucide-react';
import HomeView from './views/HomeView';
import ClientesView from './views/ClientesView';
import PanosView from './views/PanosView';
import VendasView from './views/VendasView';
import PagamentosView from './views/PagamentosView';
import RelatoriosView from './views/RelatoriosView';
import GarantiasView from './views/GarantiasView';
import ConfiguracoesView from './views/ConfiguracoesView';
import VendaRapidaModal from './modals/VendaRapidaModal';

type View = 'home' | 'clientes' | 'panos' | 'vendas' | 'pagamentos' | 'relatorios' | 'garantias' | 'configuracoes';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [showVendaRapida, setShowVendaRapida] = useState(false);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const menuItems = [
    { id: 'home' as View, label: 'Início', icon: Home },
    { id: 'clientes' as View, label: 'Clientes', icon: Users },
    { id: 'panos' as View, label: 'Panos', icon: Package2 },
    { id: 'vendas' as View, label: 'Vendas', icon: ShoppingBag },
    { id: 'pagamentos' as View, label: 'Pagamentos', icon: CreditCard },
    { id: 'garantias' as View, label: 'Garantias', icon: Shield },
    { id: 'relatorios' as View, label: 'Relatórios', icon: FileText },
    { id: 'configuracoes' as View, label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-ice">
      <nav className="bg-white shadow-md border-b border-line sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-silk to-white shadow-lg border-2 border-gold-ak">
                <img
                  src="/esfera logo.png"
                  alt="SPHERE"
                  className="w-full h-full object-cover scale-100"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-charcoal">SPHERE</h1>
                <p className="text-xs text-gray-medium hidden sm:block">by Magold Ana Kelly</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowVendaRapida(true)}
                className="flex items-center gap-2 bg-gold-ak hover:bg-amber-warning text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
              >
                <Zap className="w-5 h-5" />
                <span className="hidden sm:inline">Venda Rápida</span>
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)]">
        <aside className="hidden md:block w-64 bg-white border-r border-line overflow-y-auto shadow-sm">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-silk text-gold-ak font-semibold shadow-sm border-l-4 border-gold-ak'
                      : 'text-charcoal hover:bg-ice'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <nav className="flex justify-around p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            {currentView === 'home' && <HomeView />}
            {currentView === 'clientes' && <ClientesView />}
            {currentView === 'panos' && <PanosView />}
            {currentView === 'vendas' && <VendasView />}
            {currentView === 'pagamentos' && <PagamentosView />}
            {currentView === 'garantias' && <GarantiasView />}
            {currentView === 'relatorios' && <RelatoriosView />}
            {currentView === 'configuracoes' && <ConfiguracoesView />}
          </div>
        </main>
      </div>

      {showVendaRapida && (
        <VendaRapidaModal onClose={() => setShowVendaRapida(false)} />
      )}
    </div>
  );
}

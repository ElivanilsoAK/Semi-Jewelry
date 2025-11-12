import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package2, Users, ShoppingBag, LogOut, Home, Zap } from 'lucide-react';
import HomeView from './views/HomeView';
import ClientesView from './views/ClientesView';
import PanosView from './views/PanosView';
import VendasView from './views/VendasView';

type View = 'home' | 'clientes' | 'panos' | 'vendas';

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
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-xl shadow-lg">
                <Package2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Semi Jewelry</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Sistema de Vendas</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
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
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
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
          </div>
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package2, Users, ShoppingBag, LogOut, Home } from 'lucide-react';
import HomeView from './views/HomeView';
import ClientesView from './views/ClientesView';
import PanosView from './views/PanosView';
import VendasView from './views/VendasView';

type View = 'home' | 'clientes' | 'panos' | 'vendas';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('home');
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-emerald-600 p-2 rounded-lg mr-3">
                <Package2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">
                Sistema de Semi-Joias
              </h1>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)]">
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
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

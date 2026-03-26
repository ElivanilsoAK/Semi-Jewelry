import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package2, Users, ShoppingBag, LogOut, Home, Zap, CreditCard, FileText, Shield, Settings, Ticket, Menu, X } from 'lucide-react';
import HomeView from './views/HomeView';
import ClientesView from './views/ClientesView';
import PanosView from './views/PanosView';
import VendasView from './views/VendasView';
import PagamentosView from './views/PagamentosView';
import RelatoriosView from './views/RelatoriosView';
import GarantiasView from './views/GarantiasView';
import ConfiguracoesView from './views/ConfiguracoesView';
import VouchersView from './views/VouchersView';
import VendaRapidaModal from './modals/VendaRapidaModal';
import { Toaster } from 'react-hot-toast';

type View = 'home' | 'clientes' | 'panos' | 'vendas' | 'pagamentos' | 'relatorios' | 'garantias' | 'vouchers' | 'configuracoes';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [showVendaRapida, setShowVendaRapida] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const menuItems = [
    { id: 'home' as View, label: 'Resumo', icon: Home },
    { id: 'clientes' as View, label: 'Clientes', icon: Users },
    { id: 'panos' as View, label: 'Estoque / Panos', icon: Package2 },
    { id: 'vendas' as View, label: 'Vendas', icon: ShoppingBag },
    { id: 'pagamentos' as View, label: 'Pagamentos', icon: CreditCard },
    { id: 'garantias' as View, label: 'Garantias', icon: Shield },
    { id: 'vouchers' as View, label: 'Vouchers', icon: Ticket },
    { id: 'relatorios' as View, label: 'Relatórios', icon: FileText },
    { id: 'configuracoes' as View, label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-ice flex flex-col md:flex-row font-sans">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626',
            },
          },
        }}
      />

      {/* Sidebar Desktop - Dark Theme */}
      <aside className="hidden md:flex w-72 flex-col bg-dark-sidebar shadow-2xl z-20 text-white relative">
        <div className="p-6 pb-2 border-b border-white/10 flex flex-col items-center">
          <div className="relative mb-4 group cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="absolute inset-0 bg-gold-ak rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-2xl border-[3px] border-gold-ak/80 group-hover:border-gold-ak transition-colors bg-white">
              <img src="/esfera logo.png" alt="SPHERE" className="w-full h-full object-cover p-1" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-wider text-gradient-gold mb-1">SPHERE</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">by Magold EAK</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-white/10 text-white shadow-inner font-semibold'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-gold-ak text-white shadow-glow-sm' : 'bg-transparent text-gray-400 group-hover:text-gold-ak'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm tracking-wide">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-ak shadow-glow-sm"></div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
           <button
             onClick={handleSignOut}
             className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors p-3 hover:bg-white/5 rounded-xl"
           >
             <LogOut className="w-5 h-5" />
             <span className="text-sm font-medium">Sair do Sistema</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Topbar Desktop */}
        <header className="hidden md:flex bg-white h-20 shadow-sm border-b border-line items-center justify-between px-8 z-10">
          <h2 className="text-xl font-bold text-charcoal capitalize">
            {menuItems.find(i => i.id === currentView)?.label}
          </h2>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowVendaRapida(true)}
              className="group flex items-center gap-2 bg-charcoal hover:bg-charcoal-light text-white px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 font-semibold"
            >
              <Zap className="w-5 h-5 text-gold-ak group-hover:animate-pulse" />
              <span>Venda Rápida</span>
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex bg-dark-sidebar h-16 shadow-md items-center justify-between px-4 z-40 relative">
          <div className="flex items-center gap-3 w-10 h-10 rounded-full border border-gold-ak bg-white overflow-hidden p-0.5" onClick={() => setCurrentView('home')}>
             <img src="/esfera logo.png" alt="SPHERE" className="w-full h-full object-cover" />
          </div>
          
          <h1 className="text-lg font-bold text-gradient-gold">SPHERE</h1>

          <button
              onClick={() => setShowVendaRapida(true)}
              className="bg-gold-ak text-white p-2 rounded-lg shadow-glow-sm"
          >
             <Zap className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Nav Bottom */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 overflow-x-auto mobile-nav-scroll snap-scroll pb-safe">
          <nav className="flex p-2 gap-1 min-w-max">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 w-[76px] py-2.5 rounded-xl transition-all flex-shrink-0 relative ${
                    isActive
                      ? 'bg-ice text-gold-deep shadow-inner'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gold-ak rounded-b-full"></div>}
                  <Icon className={`w-5 h-5 ${isActive ? 'text-gold-ak' : ''}`} />
                  <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label.split(' ')[0]} {/* Abrevia nomes longos */}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto bg-ice pb-24 md:pb-6 custom-scrollbar scroll-smooth relative">
          
          {/* Base background accent */}
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white to-transparent pointer-events-none opacity-50"></div>

          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-0 animate-fade-in">
            {currentView === 'home' && <HomeView onNavigate={(view) => setCurrentView(view as View)} />}
            {currentView === 'clientes' && <ClientesView />}
            {currentView === 'panos' && <PanosView />}
            {currentView === 'vendas' && <VendasView />}
            {currentView === 'pagamentos' && <PagamentosView />}
            {currentView === 'garantias' && <GarantiasView />}
            {currentView === 'vouchers' && <VouchersView />}
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

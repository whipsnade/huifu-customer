import React from 'react';
import { Home, ClipboardList, Settings, Mic, Wallet } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  modals?: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onVoiceClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, modals, activeTab, onTabChange, onVoiceClick }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      {/* Phone Frame Mockup */}
      <div className="w-full max-w-[400px] h-[850px] bg-white rounded-[3rem] shadow-2xl border-[10px] border-slate-900 overflow-hidden relative flex flex-col">
        {/* Status Bar */}
        <div className="h-8 w-full flex justify-between items-center px-8 pt-4 shrink-0">
          <span className="text-xs font-bold text-slate-900">9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-2 bg-slate-900/20 rounded-sm" />
            <div className="w-3 h-3 bg-slate-900/20 rounded-full" />
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative pt-12 pb-8">
          {children}
        </main>

        {/* Bottom Navigation Area */}
        <div className="bg-white px-4 pt-2 pb-1 relative z-50 shrink-0 border-t border-slate-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 p-2 flex justify-between items-center">
            
            <button 
              onClick={() => onTabChange('home')}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'home' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Home size={22} />
            </button>

            <button 
              onClick={() => onTabChange('orders')}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'orders' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ClipboardList size={22} />
            </button>

            {/* Center Action Button (Voice) */}
            <button 
              onClick={onVoiceClick}
              className="flex items-center justify-center w-14 h-14 -mt-10 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-300 transform transition-transform hover:scale-110 active:scale-95 group"
            >
              <Mic size={24} className="group-active:scale-90 transition-transform" />
            </button>

            <button 
              onClick={() => onTabChange('cost')}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'cost' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Wallet size={22} />
            </button>

            <button 
              onClick={() => onTabChange('settings')}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'settings' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Settings size={22} />
            </button>
          </div>

          {/* Home Indicator */}
          <div className="h-1.5 w-32 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
        </div>
        {/* Modals */}
        {modals}
      </div>
    </div>
  );
};

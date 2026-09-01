import React from 'react';
import { Mail, Sparkles, ShieldCheck, Play, FileCode, CheckCircle2, MapPin, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  activeTab: 'campaign' | 'contacts' | 'leads' | 'personalizer' | 'runner' | 'code';
  setActiveTab: (tab: 'campaign' | 'contacts' | 'leads' | 'personalizer' | 'runner' | 'code') => void;
  contactCount: number;
  readyCount: number;
  sentCount: number;
  isDryRun: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  contactCount,
  readyCount,
  sentCount,
  isDryRun,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const tabs = [
    { id: 'campaign', label: '1. Campaign & Prompt', icon: Sparkles },
    { id: 'contacts', label: `2. Contacts (${contactCount})`, icon: Mail },
    { id: 'leads', label: '3. Search Leads (Maps)', icon: MapPin },
    { id: 'personalizer', label: `4. AI Studio (${readyCount})`, icon: ShieldCheck },
    { id: 'runner', label: '5. Dispatcher & Logs', icon: Play },
    { id: 'code', label: 'Python Script & Setup', icon: FileCode },
  ] as const;

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm ring-4 ring-indigo-50 dark:ring-indigo-950/50">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-base tracking-tight">
                  Gemini Email Automator
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  v2.4 Python + GenAI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Excel contacts parser • Gemini personalization • Checkpoint logging • 100/hr Gmail SMTP
              </p>
            </div>
          </div>

          {/* Status Indicators & Dark Mode Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-200">Mode:</span>
              {isDryRun ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                  Dry Run (Safe)
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                  Live SMTP (Gmail)
                </span>
              )}
            </div>

            {sentCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{sentCount} Dispatched</span>
              </div>
            )}

            {/* Global Dark Mode Toggle Button */}
            <button
              id="theme-toggle-button"
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 shadow-xs cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 transition-transform duration-200 -rotate-12 hover:rotate-0" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-100 dark:border-slate-800/80 py-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};


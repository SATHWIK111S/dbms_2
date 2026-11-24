import React, { useState } from 'react';
import {
  HeartHandshake,
  UserCheck,
  RefreshCw,
  Database,
  ChevronDown,
  Sun,
  Moon,
  CheckCircle2
} from 'lucide-react';
import { getApiRole, setApiRole } from '../api/client';

export const ROLES = [
  {
    id: 'Disaster Coordinator',
    label: 'Disaster Coordinator',
    desc: 'Registers incidents & affected zones',
  },
  {
    id: 'Zone Field Responder',
    label: 'Field Responder',
    desc: 'Requests emergency supplies for zones',
  },
  {
    id: 'Shelter Logistics Manager',
    label: 'Shelter Manager',
    desc: 'Manages shelter stock & confirms deliveries',
  },
  {
    id: 'Central Command Dispatcher',
    label: 'Dispatch Coordinator',
    desc: 'Authorizes dispatches for needed supplies',
  },
];

export default function Navbar({
  activeRole,
  onRoleChange,
  onResetDb,
  isResetting,
  dbMode,
  onManualRefresh,
  isRefreshing,
  darkMode,
  onToggleTheme
}) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const handleSelectRole = (role) => {
    setApiRole(role);
    onRoleChange(role);
    setRoleMenuOpen(false);
  };

  const activeRoleObj = ROLES.find(r => r.id === activeRole) || ROLES[3];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 dark:bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  ReliefHub
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Community Disaster Relief & Resource Allocation
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Database indicator (subtle) */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{dbMode === 'postgres' ? 'PostgreSQL' : 'Embedded DB'}</span>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              title="Refresh data"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={onToggleTheme}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all"
              >
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400 font-normal">Role:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeRoleObj.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Your Role
                  </div>

                  <div className="p-1 space-y-0.5">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectRole(r.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex flex-col gap-0.5 transition-colors ${
                          activeRole === r.id
                            ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{r.label}</span>
                          {activeRole === r.id && <span className="text-teal-600 dark:text-teal-400">●</span>}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          {r.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reset Database Button */}
            <button
              onClick={onResetDb}
              disabled={isResetting}
              title="Reset data back to test baseline"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-teal-600' : ''}`} />
              <span>Reset data</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

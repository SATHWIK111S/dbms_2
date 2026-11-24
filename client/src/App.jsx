import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  AlertTriangle,
  Home,
  FileText,
  Truck,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

import Navbar from './components/Navbar';
import KpiCards from './components/KpiCards';
import IncidentMap from './components/IncidentMap';
import ShortagesMonitor from './components/ShortagesMonitor';
import ShelterInventory from './components/ShelterInventory';
import AidRequestTracker from './components/AidRequestTracker';
import DispatchManager from './components/DispatchManager';
import SqlExplorer from './components/SqlExplorer';

import { api } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [activeRole, setActiveRole] = useState('Central Command Dispatcher');
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbMode, setDbMode] = useState('postgres');
  
  // Theme state: defaults to light mode as requested, supports dark mode toggle
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(prev => !prev);

  // Core Data Entities
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [overview, setOverview] = useState(null);

  // Shortage fulfillment shortcut state
  const [prefillDispatch, setPrefillDispatch] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((curr) => (curr?.id === Date.now() ? null : curr));
    }, 4500);
  };

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        incRes,
        zoneRes,
        shelterRes,
        supplyRes,
        reqRes,
        dispRes,
        shortRes,
        overRes,
        healthRes
      ] = await Promise.all([
        api.getIncidents().catch(() => ({ data: [] })),
        api.getZones().catch(() => ({ data: [] })),
        api.getShelters().catch(() => ({ data: [] })),
        api.getSupplies().catch(() => ({ data: [] })),
        api.getRequests().catch(() => ({ data: [] })),
        api.getDispatches().catch(() => ({ data: [] })),
        api.getShortages().catch(() => ({ data: [] })),
        api.getOverview().catch(() => ({})),
        api.getHealth().catch(() => ({ databaseMode: 'postgres' })),
      ]);

      setIncidents(incRes.data || []);
      setZones(zoneRes.data || []);
      setShelters(shelterRes.data || []);
      setSupplies(supplyRes.data || []);
      setRequests(reqRes.data || []);
      setDispatches(dispRes.data || []);
      setShortages(shortRes.data || []);
      setOverview(overRes);
      if (healthRes.databaseMode) {
        setDbMode(healthRes.databaseMode);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    // Periodic refresh every 15 seconds
    const interval = setInterval(loadAllData, 15000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  const handleResetDatabase = async () => {
    if (!window.confirm('Reset the database back to test baseline data? Any newly entered records will be cleared.')) {
      return;
    }
    setIsResetting(true);
    try {
      await api.resetDatabase();
      showToast('Database reset to baseline test data.', 'success');
      await loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to reset database', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDispatchShortcut = (shortageItem) => {
    const matchingReq = requests.find(r => r.zone_id === shortageItem.zone_id && r.supply_id === shortageItem.supply_id);
    if (matchingReq) {
      setPrefillDispatch(matchingReq);
    } else {
      setPrefillDispatch({
        request_id: requests[0]?.request_id,
        unallocated_qty: shortageItem.unallocated_qty
      });
    }
    setActiveTab('dispatches');
  };

  const tabs = [
    { id: 'map', label: 'Area overview', icon: MapPin, count: incidents.length },
    { id: 'shortages', label: 'Supplies needed', icon: AlertTriangle, count: shortages.length, alert: shortages.length > 0 },
    { id: 'inventory', label: 'Shelter inventory', icon: Home, count: shelters.length },
    { id: 'requests', label: 'Aid requests', icon: FileText, count: requests.length },
    { id: 'dispatches', label: 'Dispatch tracking', icon: Truck, count: dispatches.filter(d => d.status === 'IN_TRANSIT').length },
    { id: 'architecture', label: 'SQL reference', icon: Database },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Toast Notification Box */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`p-3.5 rounded-xl border shadow-lg flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed flex-1">
              <div className="font-semibold">{toast.message}</div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        onResetDb={handleResetDatabase}
        isResetting={isResetting}
        dbMode={dbMode}
        onManualRefresh={loadAllData}
        isRefreshing={isRefreshing}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Telemetry Banner */}
        <KpiCards overview={overview} />

        {/* Tab Navigation Pill Bar */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto pb-1 text-xs font-medium">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-700 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${
                      tab.alert
                        ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold'
                        : isActive
                        ? 'bg-teal-800 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-700" />
            <span>Loading disaster relief data...</span>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            {activeTab === 'map' && (
              <IncidentMap
                incidents={incidents}
                zones={zones}
                shortages={shortages}
                onRefresh={loadAllData}
                activeRole={activeRole}
                showToast={showToast}
                onDispatchShortcut={handleDispatchShortcut}
              />
            )}

            {activeTab === 'shortages' && (
              <ShortagesMonitor
                shortages={shortages}
                onDispatchShortcut={handleDispatchShortcut}
              />
            )}

            {activeTab === 'inventory' && (
              <ShelterInventory
                shelters={shelters}
                supplies={supplies}
                activeRole={activeRole}
                showToast={showToast}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'requests' && (
              <AidRequestTracker
                requests={requests}
                zones={zones}
                supplies={supplies}
                activeRole={activeRole}
                showToast={showToast}
                onRefresh={loadAllData}
                onFulfillRequest={(r) => {
                  setPrefillDispatch(r);
                  setActiveTab('dispatches');
                }}
              />
            )}

            {activeTab === 'dispatches' && (
              <DispatchManager
                dispatches={dispatches}
                requests={requests}
                shelters={shelters}
                activeRole={activeRole}
                showToast={showToast}
                onRefresh={loadAllData}
                prefillRequest={prefillDispatch}
              />
            )}

            {activeTab === 'architecture' && <SqlExplorer />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Community Disaster Relief & Resource Allocation Platform</span>
          <span className="text-slate-400">PostgreSQL 15+ • Express.js • React</span>
        </div>
      </footer>
    </div>
  );
}

// src/App.jsx
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  TableProperties, 
  Settings as SettingsIcon, 
  Smartphone, 
  Monitor, 
  DownloadCloud, 
  Fuel, 
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import RecordForm from './screens/RecordForm';
import HistoryReport from './screens/HistoryReport';
import DetailedRecordList from './screens/DetailedRecordList';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [view, setView] = useState('loading');
  
  // Theme state: defaults to 'light' on every page refresh / enter as requested!
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#090d16' : '#f8fafc');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [userProfile, setUserProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bike_profile')) || { name: '', regNumber: '', isSetup: false };
    } catch {
      return { name: '', regNumber: '', isSetup: false };
    }
  });
  const [records, setRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bike_records')) || [];
    } catch {
      return [];
    }
  });
  const [bin, setBin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bike_bin')) || [];
    } catch {
      return [];
    }
  });
  const [editingRecord, setEditingRecord] = useState(null);

  // Layout switcher for PC testing ('desktop' or 'mobile-preview')
  const [pcViewMode, setPcViewMode] = useState('desktop');

  // PWA Install prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const initialFilterConfig = {
    dateMode: 'all',
    numericMode: 'none',
    sortBy: 'date',
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    amountFilter: { operator: 'eq', value: '' },
    costFilter: { operator: 'eq', value: '' },
    mileageFilter: { operator: 'eq', value: '' }
  };
  const [filterConfig, setFilterConfig] = useState(initialFilterConfig);

  useEffect(() => {
    if (!userProfile.isSetup) {
      setView('onboarding');
    } else if (view === 'loading') {
      setView('home');
    }
  }, [userProfile.isSetup, view]);

  useEffect(() => {
    // Capture PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    localStorage.setItem('bike_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('bike_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('bike_bin', JSON.stringify(bin));
  }, [bin]);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleOnboardingComplete = (profileData) => {
    setUserProfile(profileData);
    setView('home');
  };

  const handleBackFromDetailedList = () => {
    setFilterConfig(initialFilterConfig);
    setView('home');
  };

  const handleSaveRecord = (newRecord) => {
    let updatedRecords;
    if (editingRecord) {
      updatedRecords = records.map(r => r.id === newRecord.id ? newRecord : r);
      setView('detailed_list');
    } else {
      updatedRecords = [...records, newRecord];
      setView('home');
    }
    updatedRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    setRecords(updatedRecords);
    setEditingRecord(null);
  };

  const handleMoveToBin = (id) => {
    const recordToDelete = records.find(r => r.id === id);
    if (recordToDelete) {
      setBin([...bin, recordToDelete]);
      setRecords(records.filter(r => r.id !== id));
      setEditingRecord(null);
      setView('detailed_list');
    }
  };

  const handleRestoreFromBin = (id) => {
    const recordToRestore = bin.find(r => r.id === id);
    if (recordToRestore) {
      setRecords([...records, recordToRestore].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setBin(bin.filter(r => r.id !== id));
    }
  };

  const handlePermanentDelete = (id) => {
    if (window.confirm("Permanently delete this record? This cannot be undone.")) {
      setBin(bin.filter(r => r.id !== id));
    }
  };

  const handleResetData = () => {
    if (window.confirm("WARNING: This will delete ALL data, including your profile and history. This cannot be undone. Are you sure?")) {
      setRecords([]);
      setBin([]);
      setUserProfile({ name: '', regNumber: '', isSetup: false });
      localStorage.clear();
      setView('onboarding');
    }
  };

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          alert("The uploaded sheet is empty.");
          return;
        }

        const clean = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const findVal = (row, prefixes) => {
          for (const key of Object.keys(row)) {
            const cKey = clean(key);
            for (const p of prefixes) {
              const cp = clean(p);
              if (cKey.startsWith(cp) || cKey.includes(cp)) {
                if (row[key] !== undefined && row[key] !== '') return row[key];
              }
            }
          }
          return undefined;
        };

        const normalizeDate = (raw) => {
          if (!raw) return null;
          if (raw instanceof Date && !isNaN(raw)) {
            const y = raw.getFullYear();
            const m = String(raw.getMonth() + 1).padStart(2, '0');
            const d = String(raw.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          if (typeof raw === 'number') {
            const utcDays = Math.floor(raw - 25569);
            const date = new Date(utcDays * 86400 * 1000);
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          const s = String(raw).trim();
          const m1 = s.match(/^(\d{4})[-\\/.](\d{1,2})[-\\/.](\d{1,2})/);
          if (m1) return `${m1[1]}-${String(m1[2]).padStart(2, '0')}-${String(m1[3]).padStart(2, '0')}`;
          const m2 = s.match(/^(\d{1,2})[-\\/.](\d{1,2})[-\\/.](\d{4})/);
          if (m2) return `${m2[3]}-${String(m2[2]).padStart(2, '0')}-${String(m2[1]).padStart(2, '0')}`;
          const d = new Date(s);
          if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return null;
        };

        let importedCount = 0;
        let updatedCount = 0;
        const recordMap = new Map();
        records.forEach(r => {
          const key = `${r.date}_${r.oldReading}`;
          recordMap.set(key, r);
        });

        rows.forEach((row, idx) => {
          const rawDate = findVal(row, ['date', 'time', 'day']);
          const dateStr = normalizeDate(rawDate);
          if (!dateStr) return;

          const amount = parseFloat(findVal(row, ['amount', 'amt', 'spent', 'paid', 'price'])) || 0;
          const rate = parseFloat(findVal(row, ['rate', 'perl', 'priceperl'])) || 0;
          const oldR = parseFloat(findVal(row, ['old', 'prev', 'start'])) || 0;
          const newR = parseFloat(findVal(row, ['new', 'curr', 'end', 'close'])) || 0;
          const rawQty = parseFloat(findVal(row, ['quant', 'qty', 'liter', 'litre', 'fuel'])) || 0;
          const rawDriven = parseFloat(findVal(row, ['total', 'drive', 'dist', 'km'])) || 0;
          const rawMileage = parseFloat(findVal(row, ['mil', 'avg', 'effic'])) || 0;
          const rawCostKm = parseFloat(findVal(row, ['costper', 'rateper', 'costkm', 'ckm'])) || 0;

          if (amount <= 0 && newR <= 0) return;

          const quantity = rawQty > 0 ? rawQty.toFixed(2) : (rate > 0 ? (amount / rate).toFixed(2) : '0.00');
          const totalDriven = rawDriven > 0 ? rawDriven.toFixed(1) : (newR > oldR ? (newR - oldR).toFixed(1) : '0.0');
          const mileage = rawMileage > 0 ? rawMileage.toFixed(2) : ((parseFloat(quantity) > 0 && parseFloat(totalDriven) > 0) ? (parseFloat(totalDriven) / parseFloat(quantity)).toFixed(2) : '0.00');
          const ratePerKm = rawCostKm > 0 ? rawCostKm.toFixed(2) : ((parseFloat(totalDriven) > 0 && amount > 0) ? (amount / parseFloat(totalDriven)).toFixed(2) : '0.00');

          const key = `${dateStr}_${oldR}`;
          const newRecord = {
            id: recordMap.has(key) ? recordMap.get(key).id : (Date.now() + idx),
            date: dateStr,
            amount: amount.toString(),
            rate: rate.toString(),
            oldReading: oldR.toString(),
            newReading: newR.toString(),
            quantity: quantity.toString(),
            totalDriven: totalDriven.toString(),
            mileage: mileage.toString(),
            ratePerKm: ratePerKm.toString()
          };

          if (recordMap.has(key)) {
            updatedCount++;
          } else {
            importedCount++;
          }
          recordMap.set(key, newRecord);
        });

        const finalRecords = Array.from(recordMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
        setRecords(finalRecords);
        alert(`Import Complete!\nAdded: ${importedCount}\nUpdated/Overridden: ${updatedCount}`);
        setView('detailed_list');
      } catch (err) {
        console.error("Excel import failed", err);
        alert("Failed to parse Excel file. Please ensure it has valid columns.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  // Active Screen Renderer
  const renderScreen = () => {
    switch (view) {
      case 'loading':
        return <div className="h-full flex items-center justify-center font-bold text-slate-400">Loading Bike Tracker...</div>;
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} onImport={handleImport} />;
      case 'home':
        return <Dashboard records={records} userProfile={userProfile} onNavigate={setView} />;
      case 'add':
        return (
          <RecordForm
            onSave={handleSaveRecord}
            onCancel={() => setView('home')}
            lastRecord={lastRecord}
            allRecords={records}
          />
        );
      case 'edit':
        return editingRecord ? (
          <RecordForm
            isEditMode={true}
            initialData={editingRecord}
            onSave={handleSaveRecord}
            onCancel={() => { setEditingRecord(null); setView('detailed_list'); }}
            onDelete={handleMoveToBin}
            lastRecord={lastRecord}
            allRecords={records}
          />
        ) : null;
      case 'history':
        return (
          <HistoryReport
            records={records}
            filterConfig={filterConfig}
            onFilterChange={setFilterConfig}
            onBack={() => setView('home')}
            onNavigateList={() => setView('detailed_list')}
            userProfile={userProfile}
          />
        );
      case 'detailed_list':
        return (
          <DetailedRecordList
            records={records}
            filterConfig={filterConfig}
            onFilterChange={setFilterConfig}
            onBack={handleBackFromDetailedList}
            onEdit={(record) => { setEditingRecord(record); setView('edit'); }}
            onImport={handleImport}
            userProfile={userProfile}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={() => setView('home')}
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            onImport={handleImport}
            records={records}
            bin={bin}
            onRestore={handleRestoreFromBin}
            onPermanentDelete={handlePermanentDelete}
            onResetData={handleResetData}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        );
      default:
        return <Dashboard records={records} userProfile={userProfile} onNavigate={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 flex flex-col font-sans bg-cyber-grid selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-200 transition-colors duration-200">
      
      {/* PWA Install Banner */}
      {showInstallBanner && isInstallable && (
        <div className="glass-panel-glow text-slate-900 dark:text-white px-4 py-2.5 flex items-center justify-between z-50 text-xs border-b border-emerald-500/30">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold">📲</span>
            <span><strong>Install Bike Tracker</strong> for instant offline telemetry and native app experience</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallPWA}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-lg font-bold transition-all shadow-md shadow-emerald-500/30"
            >
              Install App
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white px-1.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP HEADER (Visible on PC screens md:) */}
      <header className="hidden md:flex glass-panel-glow text-slate-800 dark:text-white px-6 py-3 items-center justify-between border-b border-slate-200 dark:border-white/10 sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <div 
            onClick={() => userProfile.isSetup && setView('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 group-hover:border-emerald-400 transition-all shadow-lg shadow-emerald-500/10">
              <Fuel size={22} className="group-hover:rotate-6 transition-transform" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                APEX TRACKER
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 rounded-full">
                  v2.0 PWA
                </span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Smart Telemetry & Fuel Diagnostics</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          {userProfile.isSetup && (
            <nav className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-300 dark:border-white/10 text-xs font-semibold shadow-inner">
              <button
                onClick={() => setView('home')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${view === 'home' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'}`}
              >
                <LayoutDashboard size={16} /> Cockpit
              </button>
              <button
                onClick={() => setView('history')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${view === 'history' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'}`}
              >
                <BarChart3 size={16} /> Analytics
              </button>
              <button
                onClick={() => setView('detailed_list')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${view === 'detailed_list' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'}`}
              >
                <TableProperties size={16} /> Logs Data
              </button>
              <button
                onClick={() => setView('settings')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${view === 'settings' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'}`}
              >
                <SettingsIcon size={16} /> Bike Profile
              </button>
            </nav>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Action "+ Log Refill" CTA button on PC */}
          {userProfile.isSetup && (
            <button
              onClick={() => setView('add')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <PlusCircle size={17} /> Log Refill
            </button>
          )}

          {/* Theme Switcher Button (Desktop) */}
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <>
                <Moon size={15} className="text-indigo-600" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun size={15} className="text-amber-400" />
                <span>Light Mode</span>
              </>
            )}
          </button>

          {/* View Switcher */}
          <div className="bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-white/10 flex items-center text-xs">
            <button
              onClick={() => setPcViewMode('desktop')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium ${pcViewMode === 'desktop' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
              title="Wide Desktop Cockpit"
            >
              <Monitor size={14} /> Desktop UI
            </button>
            <button
              onClick={() => setPcViewMode('mobile-preview')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium ${pcViewMode === 'mobile-preview' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
              title="Preview Mobile PWA Frame"
            >
              <Smartphone size={14} /> Mobile PWA
            </button>
          </div>

          {/* Install Button in Header */}
          {isInstallable && (
            <button
              onClick={handleInstallPWA}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Install progressive web app"
            >
              <DownloadCloud size={15} /> Install
            </button>
          )}

          {/* User Profile Pill */}
          {userProfile.isSetup && (
            <div 
              onClick={() => setView('settings')}
              className="flex items-center gap-2.5 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-1.5 rounded-2xl border border-slate-300 dark:border-white/10 cursor-pointer transition-all hover:border-emerald-500/40 shadow-sm"
            >
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover ring-2 ring-emerald-400" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  {userProfile.name ? userProfile.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{userProfile.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE TOP BAR (Visible on phones < md:) */}
      <div className="md:hidden glass-panel px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 sticky top-0 z-40">
        <div 
          onClick={() => userProfile.isSetup && setView('home')} 
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Fuel size={17} />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">APEX TRACKER</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <>
                <Moon size={14} className="text-indigo-600" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={14} className="text-amber-400" />
                <span>Light</span>
              </>
            )}
          </button>

          {isInstallable && (
            <button
              onClick={handleInstallPWA}
              className="p-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl"
              title="Install PWA"
            >
              <DownloadCloud size={16} />
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTAINER:
          Adapts to Mobile PWA (edge-to-edge) or Desktop Mode based on screen & switcher
      */}
      <main className="flex-1 flex flex-col justify-center items-center w-full">
        {pcViewMode === 'mobile-preview' ? (
          /* Mobile Preview Frame on Desktop */
          <div className="my-4 w-full max-w-[420px] h-[90vh] max-h-[860px] bg-slate-200 dark:bg-[#0c121e] rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden border-[10px] border-slate-300 dark:border-slate-800 relative flex flex-col ring-1 ring-slate-300 dark:ring-white/10">
            {/* Speaker & camera notch */}
            <div className="w-32 h-5 bg-slate-300 dark:bg-slate-800 rounded-b-2xl mx-auto z-40 mb-1 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-400 dark:bg-slate-700 rounded-full"></div>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-100 dark:bg-[#090d16]">
              {renderScreen()}
            </div>

            {/* Mobile Bottom Navigation (Inside phone preview) */}
            {userProfile.isSetup && (
              <nav className="glass-panel-glow border-t border-slate-200 dark:border-white/10 py-2.5 px-3 flex justify-around items-center z-30">
                <button
                  onClick={() => setView('home')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'home' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <LayoutDashboard size={20} />
                  <span>Cockpit</span>
                </button>
                <button
                  onClick={() => setView('history')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'history' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <BarChart3 size={20} />
                  <span>Analytics</span>
                </button>
                
                {/* Elevated Center Button */}
                <button
                  onClick={() => setView('add')}
                  className="w-12 h-12 -mt-5 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 border-2 border-white dark:border-[#090d16] active:scale-90 transition-transform"
                  title="Log Refill"
                >
                  <PlusCircle size={26} />
                </button>

                <button
                  onClick={() => setView('detailed_list')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'detailed_list' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <TableProperties size={20} />
                  <span>Logs</span>
                </button>
                <button
                  onClick={() => setView('settings')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <SettingsIcon size={20} />
                  <span>Profile</span>
                </button>
              </nav>
            )}
          </div>
        ) : (
          /* Responsive Layout: Full edge-to-edge on Mobile, Spacious Dashboard on PC */
          <div className="w-full flex-1 flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderScreen()}
            </div>

            {/* Mobile Bottom Navigation Dock (Visible on screens < 768px) */}
            {userProfile.isSetup && (
              <nav className="md:hidden safe-bottom glass-panel-glow border-t border-slate-200 dark:border-white/10 px-4 py-2 flex justify-around items-center z-40 sticky bottom-0">
                <button
                  onClick={() => setView('home')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'home' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <LayoutDashboard size={21} />
                  <span>Cockpit</span>
                </button>
                <button
                  onClick={() => setView('history')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'history' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <BarChart3 size={21} />
                  <span>Analytics</span>
                </button>

                {/* Floating center action button */}
                <button
                  onClick={() => setView('add')}
                  className="w-12 h-12 -mt-6 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/40 border-2 border-white dark:border-[#090d16] active:scale-90 transition-transform"
                  title="Quick Refill Log"
                >
                  <PlusCircle size={26} />
                </button>

                <button
                  onClick={() => setView('detailed_list')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'detailed_list' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <TableProperties size={21} />
                  <span>Logs</span>
                </button>
                <button
                  onClick={() => setView('settings')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <SettingsIcon size={21} />
                  <span>Profile</span>
                </button>
              </nav>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
import { notificationService } from './services/notificationService';
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
  Sun,
  Moon,
  Navigation,
  Wrench,
  ShieldCheck,
  BookOpen,
  Car
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider, useAppData } from './context/AppDataContext';

import AuthScreen from './screens/AuthScreen';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import RecordForm from './screens/RecordForm';
import HistoryReport from './screens/HistoryReport';
import DetailedRecordList from './screens/DetailedRecordList';
import SettingsScreen from './screens/SettingsScreen';
import TripsScreen from './screens/TripsScreen';
import ServiceRepairScreen from './screens/ServiceRepairScreen';
import DocumentsRemindersScreen from './screens/DocumentsRemindersScreen';
import CashBookScreen from './screens/CashBookScreen';
import CashBookReportsScreen from './screens/CashBookReportsScreen';

function AppContent() {
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const { 
    activeArea,
    setActiveArea,
    vehicles,
    activeVehicle,
    records,
    reminders,
    bin,
    addCompletedFuelRecord,
    addPendingFuelRecord,
    completePendingRecord,
    updateFuelRecord,
    moveToBin,
    restoreFromBin,
    permanentDelete,
    bulkImportFuelRecords,
    refreshFuelRecords,
    addVehicle,
    updateVehicle
  } = useAppData();

  const [view, setView] = useState('home');
  const [editingRecord, setEditingRecord] = useState(null);

  // Theme state: defaults to 'light' on every page refresh / enter as requested
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

  // Layout switcher for PC testing ('desktop' or 'mobile-preview')
  const [pcViewMode, setPcViewMode] = useState('desktop');

  // PWA Install prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);


  useEffect(() => {
    const checkNotifs = () => {
      notificationService.checkAndSendNotifications(reminders, activeVehicle?.current_odometer_km);
    };

    checkNotifs();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNotifs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reminders, activeVehicle?.current_odometer_km]);

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
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Guarantee window and document scroll reset to top whenever screen view changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [view]);

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

  // Auth Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] flex flex-col items-center justify-center p-4 bg-cyber-grid text-slate-800 dark:text-slate-100">
        <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-black text-lg text-slate-900 dark:text-white">Expenses Tracker</h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">Connecting to cloud telemetry...</p>
      </div>
    );
  }

  // Unauthenticated user -> Auth screen
  if (!user) {
    return <AuthScreen />;
  }

  // If user has no vehicles and no display name, show Onboarding
  const needsOnboarding = vehicles.length === 0 && !profile?.display_name;
  if (needsOnboarding && view === 'onboarding') {
    return (
      <Onboarding
        onComplete={async (profileData) => {
          try {
            await updateProfile({ display_name: profileData.name });
            await addVehicle({
              name: `${profileData.name}'s Bike`,
              registration_number: profileData.regNumber,
            });
            setView('home');
          } catch (err) {
            console.error('Onboarding error:', err);
            setView('home');
          }
        }}
        onImport={(file) => handleImport(file)}
      />
    );
  }

  const userProfile = {
    name: profile?.display_name || user.email?.split('@')[0] || 'Rider',
    regNumber: activeVehicle?.registration_number || '',
    avatar: profile?.avatar_path || null,
    isSetup: true,
  };

  const handleOpenDetailedList = () => {
    setFilterConfig(initialFilterConfig);
    if (refreshFuelRecords) refreshFuelRecords();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    setView('detailed_list');
  };

  const handleBackFromDetailedList = () => {
    setFilterConfig(initialFilterConfig);
    setView('home');
  };

  const handleSaveRecord = async (savedData) => {
    try {
      if (editingRecord) {
        if (editingRecord.status === 'pending' && savedData.newReading) {
          await completePendingRecord(savedData.newReading, savedData);
          setView('home');
        } else {
          await updateFuelRecord(savedData.id, savedData);
          handleOpenDetailedList();
        }
        setEditingRecord(null);
      } else if (savedData.status === 'pending') {
        await addPendingFuelRecord(savedData);
        setView('home');
      } else {
        await addCompletedFuelRecord(savedData);
        setView('home');
      }
    } catch (err) {
      alert('Error saving record: ' + err.message);
    }
  };

  const handleCompletePendingRefill = (pending) => {
    setEditingRecord(pending);
    setView('edit');
  };

  const handleMoveToBin = async (id) => {
    try {
      await moveToBin(id);
      setEditingRecord(null);
      handleOpenDetailedList();
    } catch (err) {
      alert('Error deleting record: ' + err.message);
    }
  };

  const handleRestoreFromBin = async (id) => {
    try {
      await restoreFromBin(id);
    } catch (err) {
      alert('Error restoring record: ' + err.message);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (window.confirm("Permanently delete this record? This cannot be undone.")) {
      try {
        await permanentDelete(id);
      } catch (err) {
        alert('Error permanently deleting record: ' + err.message);
      }
    }
  };

  const handleResetData = () => {
    if (window.confirm("WARNING: Clear local browser cache? Your cloud records in Supabase will stay safe.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    if (!activeVehicle?.id) {
      alert("Please select or configure an active vehicle before importing records.");
      return;
    }

    try {
      let rawRows = [];
      const fileName = (file.name || '').toLowerCase();

      if (fileName.endsWith('.json') || file.type === 'application/json') {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          rawRows = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
          rawRows = parsed.records;
        } else if (parsed && Array.isArray(parsed.data)) {
          rawRows = parsed.data;
        } else {
          alert("The uploaded JSON file does not contain a valid records array.");
          return;
        }
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          alert("The uploaded spreadsheet contains no sheets.");
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      if (!rawRows || rawRows.length === 0) {
        alert("The uploaded file contains no data rows.");
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

      // Composite signature generator for duplicate detection: date_amount_rate_prevOdo_currOdo
      const makeSig = (date, amt, rate, prevOdo, currOdo) => {
        const d = String(date || '').split('T')[0];
        const a = Math.round(Number(amt || 0) * 100) / 100;
        const r = Math.round(Number(rate || 0) * 100) / 100;
        const p = Math.round(Number(prevOdo || 0) * 10) / 10;
        const c = Math.round(Number(currOdo || 0) * 10) / 10;
        return `${d}_${a}_${r}_${p}_${c}`;
      };

      // Build existing signatures set from active vehicle records
      const existingSignatures = new Set(
        records.map(r => makeSig(
          r.refill_at || r.date,
          r.amount || r.total_cost,
          r.rate_per_litre || r.cost || r.fuel_rate_per_litre,
          r.previous_reserve_odometer ?? r.start_odometer_km ?? r.oldReading,
          r.current_reserve_odometer ?? r.end_odometer_km ?? r.newReading
        ))
      );

      const totalRows = rawRows.length;
      let duplicateCount = 0;
      let invalidCount = 0;
      const validImportRows = [];

      for (const row of rawRows) {
        const dateRaw = row.refill_at || row.fuel_datetime || row.date || findVal(row, ['refill', 'datetime', 'date', 'time', 'day']);
        const dateStr = normalizeDate(dateRaw);

        const prevOdo = parseFloat(
          row.previous_reserve_odometer ??
          row.start_odometer_km ??
          row.oldReading ??
          findVal(row, ['previousreserveodometer', 'startodometer', 'oldreading', 'old', 'start', 'prev', 'initial']) ??
          NaN
        );

        const currOdo = parseFloat(
          row.current_reserve_odometer ??
          row.end_odometer_km ??
          row.newReading ??
          findVal(row, ['currentreserveodometer', 'endodometer', 'newreading', 'finalodometer', 'new', 'end', 'curr', 'final', 'odometer']) ??
          NaN
        );

        const rate = parseFloat(
          row.rate_per_litre ??
          row.fuel_rate_per_litre ??
          row.cost ??
          findVal(row, ['rateperlitre', 'rateperliter', 'fuelrate', 'rate', 'perliter', 'perlitre', 'fuelprice']) ??
          NaN
        );

        const amt = parseFloat(
          row.amount ??
          row.total_cost ??
          findVal(row, ['amount', 'totalcost', 'totalamount', 'total', 'paid', 'spent']) ??
          NaN
        );

        const notes = row.notes || findVal(row, ['notes', 'comment', 'description', 'remarks']) || 'Imported from file';

        // Reserve-to-Reserve Business Rules:
        // Must have: valid date, amount > 0, rate > 0, prevOdo >= 0, currOdo > prevOdo
        if (!dateStr || isNaN(amt) || amt <= 0 || isNaN(prevOdo) || prevOdo < 0 || isNaN(currOdo) || currOdo <= prevOdo || isNaN(rate) || rate <= 0) {
          invalidCount++;
          continue;
        }

        const sig = makeSig(dateStr, amt, rate, prevOdo, currOdo);
        if (existingSignatures.has(sig)) {
          duplicateCount++;
          continue;
        }

        existingSignatures.add(sig);
        validImportRows.push({
          refill_at: new Date(dateStr).toISOString(),
          amount: amt,
          rate_per_litre: rate,
          previous_reserve_odometer: prevOdo,
          current_reserve_odometer: currOdo,
          notes: notes,
        });
      }

      if (validImportRows.length > 0) {
        await bulkImportFuelRecords(validImportRows);

        // Advance active vehicle odometer if imported end odometer is higher
        const maxEndOdo = Math.max(...validImportRows.map(r => r.current_reserve_odometer));
        const currentVehOdo = parseFloat(activeVehicle.current_odometer_km || 0);
        if (maxEndOdo > currentVehOdo) {
          await updateVehicle(activeVehicle.id, { current_odometer_km: maxEndOdo });
        }

        let msg = `Import Complete:\n� Total rows scanned: ${totalRows}\n� Successfully imported: ${validImportRows.length}\n� Duplicates skipped: ${duplicateCount}\n� Invalid rows skipped: ${invalidCount}`;
        if (invalidCount > 0) {
          msg += `\n\nInvalid rows were skipped because required date, amount, rate, or reserve-to-reserve odometer data was missing or invalid.`;
        }
        alert(msg);
        handleOpenDetailedList();
      } else {
        alert(`No new records imported.\n� Total rows scanned: ${totalRows}\n� Duplicates skipped: ${duplicateCount}\n� Invalid rows skipped: ${invalidCount}\n\nInvalid rows were skipped because required date, amount, rate, or reserve-to-reserve odometer data was missing or invalid.`);
      }
    } catch (err) {
      console.error("[handleImport] Error:", err);
      alert("Failed to parse and import file: " + err.message);
    }
  };

  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  const handleNavigate = (newView) => {
    if (newView === 'detailed_list') {
      handleOpenDetailedList();
    } else {
      setView(newView);
    }
  };

  const renderScreen = () => {
    switch (view) {
      case 'home':
        return (
          <Dashboard 
            records={records} 
            userProfile={userProfile} 
            onNavigate={handleNavigate}
            onOpenDetailedList={handleOpenDetailedList}
            onCompletePendingRefill={handleCompletePendingRefill}
          />
        );
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
            onCancel={() => { setEditingRecord(null); handleOpenDetailedList(); }}
            onDelete={handleMoveToBin}
            lastRecord={lastRecord}
            allRecords={records}
          />
        ) : null;
      case 'trips':
        return <TripsScreen onBack={() => setView('home')} />;
      case 'service':
        return <ServiceRepairScreen onBack={() => setView('home')} />;
      case 'documents':
        return <DocumentsRemindersScreen onBack={() => setView('home')} />;
      case 'cash_book':
        return <CashBookScreen onOpenReports={() => setView('cash_book_reports')} />;
      case 'cash_book_reports':
        return <CashBookReportsScreen onBack={() => setView('cash_book')} />;
      case 'history':
        return (
          <HistoryReport
            records={records}
            filterConfig={filterConfig}
            onFilterChange={setFilterConfig}
            onBack={() => setView('home')}
            onNavigateList={handleOpenDetailedList}
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
            onUpdateProfile={() => {}}
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
        return (
          <Dashboard 
            records={records} 
            userProfile={userProfile} 
            onNavigate={handleNavigate}
            onOpenDetailedList={handleOpenDetailedList}
            onCompletePendingRefill={handleCompletePendingRefill}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 flex flex-col font-sans bg-cyber-grid selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-200 transition-colors duration-200">
      
      {/* PWA Install Banner */}
      {showInstallBanner && isInstallable && (
        <div className="glass-panel-glow text-slate-900 dark:text-white px-4 py-2.5 flex items-center justify-between z-50 text-xs border-b border-emerald-500/30">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold">📲</span>
            <span><strong>Install Expenses Tracker</strong> for instant offline telemetry and native app experience</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallPWA}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-lg font-bold transition-all shadow-md shadow-emerald-500/30 cursor-pointer"
            >
              Install App
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP HEADER (Visible on PC screens md:) */}
      <header className="hidden md:flex glass-panel-glow text-slate-800 dark:text-white px-6 py-3 items-center justify-between border-b border-slate-200 dark:border-white/10 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div 
            onClick={() => setView('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 group-hover:border-emerald-400 transition-all shadow-lg shadow-emerald-500/10">
              <Fuel size={22} className="group-hover:rotate-6 transition-transform" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                EXPENSES TRACKER
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 rounded-full">
                  CLOUD PWA
                </span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Vehicles Telemetry & Cash Book</p>
            </div>
          </div>

          {/* PRIMARY DOMAIN AREA SWITCHER: VEHICLES vs CASH BOOK */}
          <div className="p-1 bg-slate-200/90 dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-white/10 flex items-center text-xs font-black shadow-inner">
            <button
              onClick={() => {
                setActiveArea('vehicles');
                setView('home');
              }}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeArea === 'vehicles'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car size={15} /> VEHICLES
            </button>
            <button
              onClick={() => {
                setActiveArea('cash_book');
                setView('cash_book');
              }}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeArea === 'cash_book'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen size={15} /> CASH BOOK
            </button>
          </div>

          {/* Desktop Navigation Tabs for Vehicles */}
          {activeArea === 'vehicles' && (
            <nav className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-300 dark:border-white/10 text-xs font-semibold shadow-inner">
              <button
                onClick={() => setView('home')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${view === 'home' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <LayoutDashboard size={15} /> Cockpit
              </button>
              <button
                onClick={() => setView('trips')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${view === 'trips' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <Navigation size={15} /> Speedometer
              </button>
              <button
                onClick={() => setView('service')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${view === 'service' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <Wrench size={15} /> Service Hub
              </button>
              <button
                onClick={() => setView('documents')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${view === 'documents' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <ShieldCheck size={15} /> Vault
              </button>
              <button
                onClick={() => setView('history')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${view === 'history' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <BarChart3 size={15} /> Analytics
              </button>
              <button
                onClick={handleOpenDetailedList}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${view === 'detailed_list' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/25' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <TableProperties size={15} /> Logs
              </button>
            </nav>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Action "+ Log Refill" CTA button on PC */}
          {activeArea === 'vehicles' && (
            <button
              onClick={() => setView('add')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
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
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer ${pcViewMode === 'desktop' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
              title="Wide Desktop Cockpit"
            >
              <Monitor size={14} /> Desktop UI
            </button>
            <button
              onClick={() => setPcViewMode('mobile-preview')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer ${pcViewMode === 'mobile-preview' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
              title="Preview Mobile PWA Frame"
            >
              <Smartphone size={14} /> Mobile PWA
            </button>
          </div>

          {/* User Profile Pill */}
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
        </div>
      </header>

      {/* MOBILE TOP BAR (Visible on phones < md:) */}
      <div className="md:hidden glass-panel px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 sticky top-0 z-40">
        <div 
          onClick={() => setView('home')} 
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="w-8 h-8 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Fuel size={17} />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
              {activeArea === 'cash_book' ? 'CASH BOOK' : 'EXPENSES'}
            </span>
          </div>
        </div>

        {/* Mobile Domain Switcher (Vehicles vs Cash Book) */}
        <div className="flex items-center gap-1.5">
          <div className="p-0.5 bg-slate-200 dark:bg-slate-800 rounded-xl flex text-[10px] font-black border border-slate-300 dark:border-white/10">
            <button
              onClick={() => {
                setActiveArea('vehicles');
                setView('home');
              }}
              className={`px-2 py-1 rounded-lg transition-all ${activeArea === 'vehicles' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-500'}`}
            >
              Vehicles
            </button>
            <button
              onClick={() => {
                setActiveArea('cash_book');
                setView('cash_book');
              }}
              className={`px-2 py-1 rounded-lg transition-all ${activeArea === 'cash_book' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-500'}`}
            >
              Cash Book
            </button>
          </div>

          {/* Mobile Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold flex items-center text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={15} className="text-indigo-600" /> : <Sun size={15} className="text-amber-400" />}
          </button>
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
            <nav className="glass-panel-glow border-t border-slate-200 dark:border-white/10 py-2 px-3 flex justify-around items-center z-30">
              {activeArea === 'cash_book' ? (
                <>
                  <button
                    onClick={() => setView('cash_book')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'cash_book' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <BookOpen size={20} />
                    <span>Ledger</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveArea('vehicles');
                      setView('home');
                    }}
                    className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-500"
                  >
                    <Car size={20} />
                    <span>Vehicles</span>
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <SettingsIcon size={20} />
                    <span>Settings</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setView('home')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'home' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <LayoutDashboard size={20} />
                    <span>Cockpit</span>
                  </button>
                  <button
                    onClick={() => setView('trips')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'trips' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <Navigation size={20} />
                    <span>Speedo</span>
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
                    onClick={() => setView('service')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'service' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <Wrench size={20} />
                    <span>Service</span>
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <SettingsIcon size={20} />
                    <span>Settings</span>
                  </button>
                </>
              )}
            </nav>
          </div>
        ) : (
          /* Responsive Layout: Full edge-to-edge on Mobile, Spacious Dashboard on PC */
          <div className="w-full flex-1 flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderScreen()}
            </div>

            {/* Mobile Bottom Navigation Dock (Visible on screens < md:) */}
            <nav className="md:hidden safe-bottom glass-panel-glow border-t border-slate-200 dark:border-white/10 px-4 py-2 flex justify-around items-center z-40 sticky bottom-0">
              {activeArea === 'cash_book' ? (
                <>
                  <button
                    onClick={() => setView('cash_book')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'cash_book' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <BookOpen size={20} />
                    <span>Ledger</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveArea('vehicles');
                      setView('home');
                    }}
                    className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-500"
                  >
                    <Car size={20} />
                    <span>Vehicles Area</span>
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <SettingsIcon size={20} />
                    <span>Settings</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setView('home')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'home' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <LayoutDashboard size={21} />
                    <span>Cockpit</span>
                  </button>
                  <button
                    onClick={() => setView('trips')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'trips' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <Navigation size={21} />
                    <span>Speedo</span>
                  </button>

                  {/* Floating center action button */}
                  <button
                    onClick={() => setView('add')}
                    className="w-12 h-12 -mt-6 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/40 border-2 border-white dark:border-[#090d16] active:scale-90 transition-transform cursor-pointer"
                    title="Quick Refill Log"
                  >
                    <PlusCircle size={26} />
                  </button>

                  <button
                    onClick={() => setView('service')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'service' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <Wrench size={21} />
                    <span>Service</span>
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500'}`}
                  >
                    <SettingsIcon size={21} />
                    <span>Settings</span>
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </main>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </AuthProvider>
  );
}

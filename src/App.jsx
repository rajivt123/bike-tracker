// src/App.jsx
import React, { useState, useEffect } from 'react';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import RecordForm from './screens/RecordForm';
import HistoryReport from './screens/HistoryReport';
import DetailedRecordList from './screens/DetailedRecordList';
import SettingsScreen from './screens/SettingsScreen';
//import { App as CapacitorApp } from '@capacitor/app';

export default function App() {
  const [view, setView] = useState('loading');
  const [userProfile, setUserProfile] = useState(() => JSON.parse(localStorage.getItem('bike_profile')) || { name: '', regNumber: '', isSetup: false });
  const [records, setRecords] = useState(() => JSON.parse(localStorage.getItem('bike_records')) || []);
  const [bin, setBin] = useState(() => JSON.parse(localStorage.getItem('bike_bin')) || []);
  const [editingRecord, setEditingRecord] = useState(null);

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
    // Dynamically load libraries for Export/Share features
    const loadScript = (src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    };
    if (!window.XLSX) loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    if (!window.html2canvas) loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    if (!window.jspdf) {
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      setTimeout(() => {
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js");
      }, 500);
    }

    if (!userProfile.isSetup) {
      setView('onboarding');
    } else {
      setView('home');
    }
  }, []);

  useEffect(() => localStorage.setItem('bike_records', JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem('bike_profile', JSON.stringify(userProfile)), [userProfile]);
  useEffect(() => localStorage.setItem('bike_bin', JSON.stringify(bin)), [bin]);

  const handleOnboardingComplete = (profileData) => {
    setUserProfile(profileData);
    setView('home');
  };

  const handleBackFromDetailedList = () => {
    setFilterConfig(initialFilterConfig);
    setView('history');
  };

  const handleSaveRecord = (newRecord) => {
    let updatedRecords;
    if (editingRecord) {
      updatedRecords = records.map(r => r.id === newRecord.id ? newRecord : r);
    } else {
      updatedRecords = [...records, newRecord];
    }
    updatedRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    setRecords(updatedRecords);
    setView('history');
    setEditingRecord(null);
  };

  const handleMoveToBin = (id) => {
    const recordToDelete = records.find(r => r.id === id);
    if (recordToDelete) {
      setBin([...bin, recordToDelete]);
      setRecords(records.filter(r => r.id !== id));
      setEditingRecord(null);
      setView('history');
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
    if(window.confirm("Permanently delete this record? This cannot be undone.")) {
      setBin(bin.filter(r => r.id !== id));
    }
  };

  // --- NEW: Reset Data Logic ---
  const handleResetData = () => {
    if (window.confirm("WARNING: This will delete ALL data, including your profile and history. This cannot be undone. Are you sure?")) {
      setRecords([]);
      setBin([]);
      setUserProfile({ name: '', regNumber: '', isSetup: false });
      localStorage.clear(); // Wipes local storage
      setView('onboarding'); // Redirect to setup
    }
  };

  const handleImport = (file) => {
    if (!window.XLSX) { alert("Excel Library loading..."); return; }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { dateNF: 'yyyy-mm-dd' });

      let importedCount = 0;
      let updatedCount = 0;
      const recordMap = new Map();
      records.forEach(r => {
        const key = `${r.date}_${r.oldReading}`;
        recordMap.set(key, r);
      });

      jsonData.forEach((row, idx) => {
        const rowDate = new Date(row['Date']);
        if (isNaN(rowDate)) return;

        const dateStr = rowDate.toISOString().split('T')[0];
        const oldReading = row['OldReading'];
        const key = `${dateStr}_${oldReading}`;

        const newRecord = {
          id: recordMap.has(key) ? recordMap.get(key).id : (Date.now() + idx),
          date: dateStr,
          amount: row['Amount'],
          rate: row['Rate'],
          oldReading: row['OldReading'],
          newReading: row['NewReading'],
          quantity: (row['Amount']/row['Rate']).toFixed(2),
          totalDriven: (row['NewReading'] - row['OldReading']).toFixed(1),
          mileage: ((row['NewReading'] - row['OldReading']) / (row['Amount']/row['Rate'])).toFixed(2),
          ratePerKm: (row['Amount'] / (row['NewReading'] - row['OldReading'])).toFixed(2)
        };

        if (newRecord.amount && newRecord.date) {
          if (recordMap.has(key)) {
            updatedCount++;
          } else {
            importedCount++;
          }
          recordMap.set(key, newRecord);
        }
      });

      const finalRecords = Array.from(recordMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
      setRecords(finalRecords);
      alert(`Import Complete!\nAdded: ${importedCount}\nUpdated/Overridden: ${updatedCount}`);
      setView('history');
    };
    reader.readAsArrayBuffer(file);
  };

  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-200 font-sans">
      <div className="w-full max-w-md h-[100dvh] md:h-[800px] bg-white md:rounded-[3rem] shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Fake Status Bar */}
        <div className="h-8 bg-slate-900 flex justify-between items-center px-6 text-[10px] font-medium text-white select-none z-30 rounded-t-[2.5rem] md:rounded-t-[3rem]">
          <span>9:41</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white"></div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-slate-50">
          {view === 'loading' && <div className="h-full flex items-center justify-center">Loading...</div>}
          
          {view === 'onboarding' && (
            <Onboarding onComplete={handleOnboardingComplete} />
          )}
          
          {view === 'home' && (
            <Dashboard
              records={records}
              userProfile={userProfile}
              onNavigate={setView}
            />
          )}

          {view === 'add' && (
            <RecordForm
              onSave={handleSaveRecord}
              onCancel={() => setView('home')}
              lastRecord={lastRecord}
              allRecords={records}
            />
          )}

          {view === 'edit' && editingRecord && (
            <RecordForm
              isEditMode={true}
              initialData={editingRecord}
              onSave={handleSaveRecord}
              onCancel={() => { setEditingRecord(null); setView('detailed_list'); }}
              onDelete={handleMoveToBin}
              lastRecord={lastRecord}
              allRecords={records}
            />
          )}

          {view === 'history' && (
            <HistoryReport
              records={records}
              filterConfig={filterConfig}
              onFilterChange={setFilterConfig}
              onBack={() => setView('home')}
              onNavigateList={() => setView('detailed_list')}
              userProfile={userProfile}
            />
          )}

          {view === 'detailed_list' && (
            <DetailedRecordList
              records={records}
              filterConfig={filterConfig}
              onFilterChange={setFilterConfig}
              onBack={handleBackFromDetailedList}
              onEdit={(record) => { setEditingRecord(record); setView('edit'); }}
              userProfile={userProfile}
            />
          )}

          {view === 'settings' && (
            <SettingsScreen
              onBack={() => setView('home')}
              userProfile={userProfile}
              onUpdateProfile={setUserProfile}
              onImport={handleImport}
              records={records}
              bin={bin}
              onRestore={handleRestoreFromBin}
              onPermanentDelete={handlePermanentDelete}
              onResetData={handleResetData} /* Passed Prop Here */
            />
          )}
        </div>
      </div>
    </div>
  );
}
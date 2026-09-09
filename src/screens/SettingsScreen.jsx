// src/screens/SettingsScreen.jsx
import React, { useState, useRef } from 'react';
import { ArrowLeft, Cloud, Download, Upload, RotateCcw, X, Trash2, CheckCircle, ShieldAlert, Cpu, HardDrive, Smartphone, Sparkles, User, Sun, Moon } from 'lucide-react';
import AvatarUpload from '../components/AvatarUpload';

const SettingsScreen = ({ onBack, userProfile, onUpdateProfile, onImport, records, bin, onRestore, onPermanentDelete, onResetData, theme, onToggleTheme }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(userProfile.name);
  const [regNumber, setRegNumber] = useState(userProfile.regNumber);
  const [avatar, setAvatar] = useState(userProfile.avatar);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const fileInputRef = useRef(null);

  const handleProfileUpdate = (e) => {
    e?.preventDefault();
    onUpdateProfile({ ...userProfile, name, regNumber, avatar });
    alert("Vehicle Profile Calibrated & Saved!");
    onBack();
  };

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `apex_bike_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 animate-in slide-in-from-right duration-300 overflow-y-auto">
      
      {/* Header */}
      <div className="glass-panel-glow border-b border-slate-200 dark:border-white/10 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10"
            title="Return to Cockpit"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu size={20} className="text-emerald-600 dark:text-emerald-400" />
              Machine Profile & Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block font-medium">
              Calibrate vehicle registration, manage local telemetry databases, and sync backups
            </p>
          </div>
        </div>

        {/* Quick Theme Switch Button in Header */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition-all"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Cockpit`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} className="text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={15} className="text-indigo-600 animate-pulse" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Modern Navigation Tabs */}
      <div className="glass-panel border-b border-slate-200 dark:border-white/10 sticky top-[73px] z-10">
        <div className="max-w-2xl mx-auto flex p-2 gap-2">
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === 'profile' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
            Vehicle & Rider
          </button>
          <button 
            onClick={() => setActiveTab('backup')} 
            className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === 'backup' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
            Data & Backup
          </button>
          <button 
            onClick={() => setActiveTab('bin')} 
            className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === 'bin' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
            Trash Bin ({bin.length})
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full pb-16">
        
        {activeTab === 'profile' && (
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-white/10 space-y-6 shadow-xl dark:shadow-2xl">
            
            {/* Appearance & Theme Selector */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Sun size={14} className="text-amber-500" /> Interface Theme
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  {theme === 'light' ? 'Light Cockpit (Default)' : 'Dark Cockpit'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => theme !== 'light' && onToggleTheme && onToggleTheme()}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    theme === 'light'
                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-500/40'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun size={16} className="text-amber-500" /> Light Cockpit
                </button>
                <button
                  type="button"
                  onClick={() => theme !== 'dark' && onToggleTheme && onToggleTheme()}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    theme === 'dark'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/40'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Moon size={16} className="text-indigo-400" /> Dark Cockpit
                </button>
              </div>
            </div>

            {/* Avatar Uploader */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <AvatarUpload currentImage={avatar} onImageChange={setAvatar} />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Click above to upload machine or rider picture</p>
            </div>

            {/* Live Embossed Plate Preview */}
            <div className="p-4 glass-card rounded-2xl border border-slate-200 dark:border-white/10 text-center space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">Live License Plate Render</p>
              <div className="inline-flex items-center">
                <div className="license-plate px-4 py-1.5 rounded-lg text-sm md:text-base font-mono flex items-center gap-2.5">
                  <span className="text-[9px] font-bold text-blue-800 tracking-tighter flex items-center gap-0.5 border-r border-slate-300 pr-1.5">
                    IND 🇮🇳
                  </span>
                  <span>{regNumber || 'MH 02 XX 0000'}</span>
                </div>
              </div>
            </div>
            
            {/* Profile Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Rider Pilot Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Enter pilot name"
                  className="w-full glass-input p-3.5 rounded-2xl outline-none font-bold text-slate-900 dark:text-white text-base" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Bike Registration Plate Number</label>
                <input 
                  type="text" 
                  value={regNumber} 
                  onChange={e => setRegNumber(e.target.value.toUpperCase())} 
                  placeholder="e.g. MH 12 AB 1234"
                  className="w-full glass-input p-3.5 rounded-2xl outline-none font-mono uppercase font-black text-emerald-600 dark:text-emerald-400 text-base" 
                />
              </div>
            </div>

            <button 
              onClick={handleProfileUpdate} 
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 py-4 rounded-2xl font-black text-base shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              Save Machine Profile
            </button>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            
            {/* Diagnostics Card */}
            <div className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <HardDrive size={15} className="text-cyan-600 dark:text-cyan-400" /> Telemetry Storage & Diagnostics
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  🟢 Offline Cached
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">Active Records</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{records.length} logs</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">Bin Cache</span>
                  <p className="text-xl font-black text-slate-700 dark:text-slate-300">{bin.length} logs</p>
                </div>
              </div>
            </div>

            {/* Cloud Sync */}
            <div className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Cloud Synchronization</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pair your telemetry archive with personal cloud backup storage</p>
              
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-white/5 mt-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl"><Cloud size={20}/></div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Google Cloud Drive</p>
                    <p className="text-xs text-slate-500">{syncEnabled ? 'Active sync stream' : 'Local device encrypted storage'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSyncEnabled(!syncEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${syncEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${syncEnabled ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            </div>

            {/* Export & Import Data */}
            <div className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Export & Import Archive</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={downloadBackup} 
                  className="flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-xs rounded-2xl border border-slate-200 dark:border-white/10 transition-colors shadow-sm"
                >
                  <Download size={16} className="text-cyan-600 dark:text-cyan-400" /> Export JSON Archive
                </button>

                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={(e) => { 
                    if(e.target.files && e.target.files[0]) {
                      onImport(e.target.files[0]);
                      e.target.value = '';
                    }
                    }} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-2xl border border-emerald-500/30 transition-colors shadow-sm"
                  >
                    <Upload size={16} className="text-emerald-600 dark:text-emerald-400" /> Import Excel / CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="glass-panel p-5 md:p-6 rounded-3xl border border-rose-500/30 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <ShieldAlert size={18} />
                <h3 className="font-bold text-sm">Destructive Factory Reset</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Irreversibly clears all recorded fuel logs, machine settings, and trash bin items from local storage.</p>
              <button 
                onClick={onResetData} 
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl border border-rose-500/30 transition-colors active:scale-95 shadow-sm"
              >
                <Trash2 size={16} /> Reset Everything & Start Fresh
              </button>
            </div>

          </div>
        )}

        {activeTab === 'bin' && (
          <div className="space-y-3">
            {bin.length === 0 ? (
              <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-white/10 text-center text-slate-500 shadow-xl">
                <Trash2 size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Trash Bin is Empty</p>
                <p className="text-xs text-slate-500 mt-1">Deleted refill records will stay here safe until permanently purged.</p>
              </div>
            ) : (
              bin.map(record => (
                <div key={record.id} className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{record.date}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">₹{record.amount} • {record.totalDriven} km • {record.mileage} km/L</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onRestore(record.id)} 
                      className="p-2.5 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-xl transition-colors"
                      title="Restore Record"
                    >
                      <RotateCcw size={16}/>
                    </button>
                    <button 
                      onClick={() => onPermanentDelete(record.id)} 
                      className="p-2.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl transition-colors"
                      title="Permanently Delete"
                    >
                      <X size={16}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsScreen;
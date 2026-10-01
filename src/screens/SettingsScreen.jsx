// src/screens/SettingsScreen.jsx
import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Cloud, Download, Upload, RotateCcw, Trash2, CheckCircle, 
  Cpu, HardDrive, Smartphone, Sparkles, User, Sun, Moon, LogOut, 
  Plus, Check, ShieldCheck 
} from 'lucide-react';
import AvatarUpload from '../components/AvatarUpload';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';

const SettingsScreen = ({ 
  onBack, 
  userProfile, 
  onUpdateProfile, 
  onImport, 
  records, 
  bin, 
  onRestore, 
  onPermanentDelete, 
  onResetData, 
  theme, 
  onToggleTheme 
}) => {
  const { user, signOut, updateProfile } = useAuth();
  const { vehicles, activeVehicle, selectVehicle, addVehicle, updateVehicle } = useAppData();

  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState(userProfile?.name || '');
  const [avatar, setAvatar] = useState(userProfile?.avatar || null);

  // Active vehicle state
  const [vehicleName, setVehicleName] = useState(activeVehicle?.name || 'My Motorcycle');
  const [regNumber, setRegNumber] = useState(activeVehicle?.registration_number || userProfile?.regNumber || '');
  const [vehicleMake, setVehicleMake] = useState(activeVehicle?.make || '');
  const [vehicleModel, setVehicleModel] = useState(activeVehicle?.model || '');

  // Synchronize form when activeVehicle updates without useEffect cascading render
  const [prevVehicle, setPrevVehicle] = useState(activeVehicle);
  if (activeVehicle !== prevVehicle) {
    setPrevVehicle(activeVehicle);
    setVehicleName(activeVehicle?.name || 'My Motorcycle');
    setRegNumber(activeVehicle?.registration_number || '');
    setVehicleMake(activeVehicle?.make || '');
    setVehicleModel(activeVehicle?.model || '');
  }

  // Synchronize rider name when userProfile updates without useEffect cascading render
  const [prevProfile, setPrevProfile] = useState(userProfile);
  if (userProfile !== prevProfile) {
    setPrevProfile(userProfile);
    setDisplayName(userProfile?.name || '');
    setAvatar(userProfile?.avatar || null);
  }

  // Add vehicle modal
  const [showAddVehModal, setShowAddVehModal] = useState(false);
  const [newVehName, setNewVehName] = useState('');
  const [newVehReg, setNewVehReg] = useState('');
  const [newVehOdo, setNewVehOdo] = useState('');

  const fileInputRef = useRef(null);

  const handleProfileUpdate = async (e) => {
    e?.preventDefault();
    try {
      // 1. Update user profile in Supabase
      if (updateProfile) {
        await updateProfile({ display_name: displayName });
      }
      if (onUpdateProfile) {
        onUpdateProfile({ ...userProfile, name: displayName, avatar });
      }

      // 2. Update existing active vehicle OR Create new vehicle if none exists
      if (activeVehicle?.id) {
        await updateVehicle(activeVehicle.id, {
          name: vehicleName || 'My Motorcycle',
          registration_number: regNumber,
          make: vehicleMake,
          model: vehicleModel,
        });
      } else {
        const createdVeh = await addVehicle({
          name: vehicleName || 'My Motorcycle',
          registration_number: regNumber,
          make: vehicleMake,
          model: vehicleModel,
          current_odometer_km: 0,
        });
        if (createdVeh?.id && selectVehicle) {
          await selectVehicle(createdVeh.id);
        }
      }

      alert("Machine Profile & Cloud Settings Updated Successfully!");
      onBack();
    } catch (err) {
      console.error("[SettingsScreen] Error updating machine profile:", err);
      alert("Error updating profile or vehicle: " + err.message);
    }
  };

  const handleAddNewVehicle = async (e) => {
    e.preventDefault();
    if (!newVehName) return;
    try {
      await addVehicle({
        name: newVehName,
        registration_number: newVehReg,
        current_odometer_km: parseFloat(newVehOdo || 0),
      });
      setShowAddVehModal(false);
      setNewVehName('');
      setNewVehReg('');
      setNewVehOdo('');
    } catch (err) {
      alert('Could not add vehicle: ' + err.message);
    }
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
            className="p-2.5 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10 cursor-pointer"
            title="Return to Cockpit"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu size={20} className="text-emerald-600 dark:text-emerald-400" />
              Machine Profile & Cloud Sync
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block font-medium">
              Calibrate vehicle registration, manage cloud database, and sync backups
            </p>
          </div>
        </div>

        {/* Quick Theme Switch Button in Header */}
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition-all cursor-pointer"
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

          {user && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  signOut();
                }
              }}
              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="glass-panel border-b border-slate-200 dark:border-white/10 sticky top-[73px] z-10">
        <div className="max-w-2xl mx-auto flex p-2 gap-2">
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'profile' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
            Vehicle & Garage ({vehicles.length})
          </button>
          <button 
            onClick={() => setActiveTab('backup')} 
            className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'backup' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
            Cloud Data & Backup
          </button>
          <button 
            onClick={() => setActiveTab('bin')} 
            className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'bin' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
            Trash Bin ({bin.length})
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full flex-1">
        
        {/* 1. VEHICLE & GARAGE PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            
            {/* Garage Switcher */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                  Select Active Vehicle
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddVehModal(true)}
                  className="px-3 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-500/30"
                >
                  <Plus size={14} /> Add Vehicle
                </button>
              </div>

              <div className="space-y-2">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => selectVehicle(v.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      v.id === activeVehicle?.id
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs'
                        : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/5 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        {v.name}
                        {v.id === activeVehicle?.id && (
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                            Active Machine
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {v.registration_number || 'No plate set'} • {v.current_odometer_km || 0} KM
                      </p>
                    </div>
                    {v.id === activeVehicle?.id && (
                      <Check size={18} className="text-emerald-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Avatar & Rider Name */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
              <AvatarUpload currentImage={avatar} onImageChange={setAvatar} />

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Rider / Profile Name
                </label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  className="w-full glass-input rounded-2xl p-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. Maverick"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Active Vehicle Name
                </label>
                <input 
                  type="text" 
                  value={vehicleName} 
                  onChange={(e) => setVehicleName(e.target.value)} 
                  className="w-full glass-input rounded-2xl p-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. Royal Enfield Hunter 350"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Registration Number
                </label>
                <input 
                  type="text" 
                  value={regNumber} 
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())} 
                  className="w-full glass-input rounded-2xl p-3.5 text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. MH 12 AB 1234"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Make
                  </label>
                  <input 
                    type="text" 
                    value={vehicleMake} 
                    onChange={(e) => setVehicleMake(e.target.value)} 
                    className="w-full glass-input rounded-2xl p-3 text-sm text-slate-900 dark:text-white outline-none"
                    placeholder="e.g. Yamaha"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Model
                  </label>
                  <input 
                    type="text" 
                    value={vehicleModel} 
                    onChange={(e) => setVehicleModel(e.target.value)} 
                    className="w-full glass-input rounded-2xl p-3 text-sm text-slate-900 dark:text-white outline-none"
                    placeholder="e.g. MT-15"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Save Machine Profile
              </button>
            </div>

            {/* Cloud User Credentials Banner */}
            {user && (
              <div className="p-4 rounded-2xl bg-slate-200/80 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-emerald-500" /> Authenticated Supabase User
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            )}

          </form>
        )}

        {/* 2. DATA & BACKUP */}
        {activeTab === 'backup' && (
          <div className="space-y-5">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Cloud size={18} className="text-emerald-500" /> Cloud Sync & Local Export
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All records, trips, and ledger entries are synchronized with your Supabase PostgreSQL instance. You can also export offline JSON backups anytime.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  onClick={downloadBackup}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-300 dark:border-white/10 hover:border-emerald-500/40 bg-white/50 dark:bg-white/5 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={16} /> Export JSON Backup
                </button>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onImport) onImport(file);
                    e.target.value = '';
                  }}
                  accept=".json,.xlsx,.xls,.csv" 
                  className="hidden" 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-300 dark:border-white/10 hover:border-cyan-500/40 bg-white/50 dark:bg-white/5 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload size={16} /> Import Excel / JSON
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-rose-500/20 shadow-lg space-y-3">
              <h3 className="font-black text-base text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Trash2 size={18} /> Danger Zone
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reset local cache and purge temporary device states.
              </p>
              <button 
                onClick={onResetData}
                className="py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
              >
                Clear Local Application Cache
              </button>
            </div>
          </div>
        )}

        {/* 3. TRASH BIN */}
        {activeTab === 'bin' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase font-extrabold text-slate-500 dark:text-slate-400">
                Soft-Deleted Fuel Logs ({bin.length})
              </span>
            </div>

            {bin.length === 0 ? (
              <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
                <Trash2 size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Trash bin is clean</p>
                <p className="text-xs text-slate-400 mt-0.5">Deleted records are kept here for recovery.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {bin.map((item) => (
                  <div 
                    key={item.id}
                    className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.date} • ₹{item.amount}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {item.oldReading} ➔ {item.newReading} (+{item.totalDriven} km)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onRestore(item.id)}
                        className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Restore to Logbook"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        onClick={() => onPermanentDelete(item.id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: ADD VEHICLE */}
      {showAddVehModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">Add Vehicle to Garage</h3>
            <form onSubmit={handleAddNewVehicle} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Vehicle Name*</label>
                <input
                  type="text"
                  required
                  value={newVehName}
                  onChange={(e) => setNewVehName(e.target.value)}
                  placeholder="e.g. Royal Enfield Hunter, Honda Activa"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Registration Number</label>
                <input
                  type="text"
                  value={newVehReg}
                  onChange={(e) => setNewVehReg(e.target.value.toUpperCase())}
                  placeholder="e.g. KA 01 EQ 5678"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Current Odometer (KM)</label>
                <input
                  type="number"
                  step="any"
                  value={newVehOdo}
                  onChange={(e) => setNewVehOdo(e.target.value)}
                  placeholder="e.g. 4200"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsScreen;
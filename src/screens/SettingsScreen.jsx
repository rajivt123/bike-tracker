// src/screens/SettingsScreen.jsx
import React, { useState, useRef } from 'react';
import { ArrowLeft, Cloud, Download, Upload, RotateCcw, X, Trash2 } from 'lucide-react';
import AvatarUpload from '../components/AvatarUpload';

const SettingsScreen = ({ onBack, userProfile, onUpdateProfile, onImport, records, bin, onRestore, onPermanentDelete, onResetData }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(userProfile.name);
  const [regNumber, setRegNumber] = useState(userProfile.regNumber);
  const [avatar, setAvatar] = useState(userProfile.avatar);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const fileInputRef = useRef(null);

  const handleProfileUpdate = () => {
    onUpdateProfile({ ...userProfile, name, regNumber, avatar });
    alert("Profile Updated!");
    onBack();
  };

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `bike_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-500">
      <div className="bg-white border-b border-slate-100 p-4 pt-10 flex items-center gap-2 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800">Settings</h2>
      </div>
      <div className="flex border-b border-slate-200 bg-white">
        <button onClick={() => setActiveTab('profile')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'profile' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>Profile</button>
        <button onClick={() => setActiveTab('backup')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'backup' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>Data</button>
        <button onClick={() => setActiveTab('bin')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'bin' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>Bin ({bin.length})</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <AvatarUpload currentImage={avatar} onImageChange={setAvatar} />
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Reg Number</label>
                <input type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200" />
              </div>
            </div>
            <button onClick={handleProfileUpdate} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Save Changes</button>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold mb-2">Backup & Sync</h3>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Cloud size={20}/></div>
                  <div>
                    <p className="font-bold text-sm">Google Drive</p>
                    <p className="text-xs text-slate-400">Auto-sync records</p>
                  </div>
                </div>
                <button
                  onClick={() => setSyncEnabled(!syncEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${syncEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${syncEnabled ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              <button onClick={downloadBackup} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg mb-2">
                <Download size={18} /> Local Backup (JSON)
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold mb-2">Import Data</h3>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => { if(e.target.files[0]) onImport(e.target.files[0]); }} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-lg">
                <Upload size={18} /> Import Excel/CSV
              </button>
            </div>

            {/* --- NEW: Danger Zone --- */}
            <div className="bg-white p-4 rounded-xl border border-red-100 mt-6">
              <h3 className="font-bold mb-2 text-red-600">Danger Zone</h3>
              <p className="text-xs text-slate-500 mb-4">Permanently remove all records, profile details, and settings.</p>
              <button 
                onClick={onResetData} 
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-bold rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={18} /> Reset All Data
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bin' && (
          <div className="space-y-3">
            {bin.length === 0 ? (
              <p className="text-center text-slate-400 py-10">Recycle Bin is empty</p>
            ) : (
              bin.map(record => (
                <div key={record.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{new Date(record.date).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">₹{record.amount} • {record.totalDriven} km</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onRestore(record.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><RotateCcw size={18}/></button>
                    <button onClick={() => onPermanentDelete(record.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><X size={18}/></button>
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
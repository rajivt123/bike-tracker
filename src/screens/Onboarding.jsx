import React, { useState, useRef } from 'react';
import { Upload, Gauge, ArrowRight, Sparkles } from 'lucide-react';
import AvatarUpload from '../components/AvatarUpload';

const Onboarding = ({ onComplete, onImport }) => {
  const [name, setName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [avatar, setAvatar] = useState(null);
  const fileInputRef = useRef(null);

  const handleComplete = (skip = false) => {
    onComplete({
      name: skip ? 'Rider' : (name.trim() || 'Rider'),
      regNumber: skip ? '' : regNumber.trim(),
      avatar: skip ? null : avatar,
      isSetup: true
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      onComplete({
        name: name.trim() || 'Rider',
        regNumber: regNumber.trim() || '',
        avatar: avatar,
        isSetup: true
      });
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8 bg-slate-100 dark:bg-[#090d16] bg-cyber-grid relative overflow-hidden text-slate-800 dark:text-slate-100">
      {/* Background ambient decorative glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel-glow p-6 md:p-8 rounded-3xl relative z-10 border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={13} /> Cockpit Initializer
          </div>
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/10">
            <Gauge size={30} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5">
            Apex Bike Tracker
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
            Configure your motorcycle profile to track fuel, mileage telemetry, and operational costs.
          </p>
        </div>

        <div className="space-y-5">
          <AvatarUpload currentImage={avatar} onImageChange={setAvatar} />
          
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Rider / Pilot Call-Sign
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full glass-input rounded-xl p-3.5 font-bold text-slate-900 dark:text-white text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Bike Registration Number
              </label>
              <input
                type="text"
                value={regNumber}
                onChange={e => setRegNumber(e.target.value.toUpperCase())}
                placeholder="e.g. MH 12 AB 1234"
                className="w-full glass-input rounded-xl p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm outline-none uppercase tracking-wider"
              />

              {/* Live Embossed Plate Preview */}
              {regNumber.trim() && (
                <div className="mt-3 flex flex-col items-center animate-in fade-in duration-300">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-1">Plate Preview</span>
                  <div className="license-plate px-4 py-1.5 rounded text-xs tracking-widest font-mono">
                    <span>IND 🇮🇳</span> {regNumber}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => handleComplete(false)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 py-3.5 rounded-xl font-black text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
            >
              <span>Initialize Cockpit</span>
              <ArrowRight size={16} />
            </button>
            
            <button
              type="button"
              onClick={() => handleComplete(true)}
              className="w-full py-2 text-slate-500 font-semibold text-xs hover:text-slate-700 dark:hover:text-slate-400 transition-colors text-center"
            >
              Skip setup (use guest profile)
            </button>

            {onImport && (
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Upload size={14} /> Already have records? Import Excel / CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
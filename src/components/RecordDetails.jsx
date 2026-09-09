// src/components/RecordDetails.jsx
import React, { useRef, useState } from 'react';
import { User, Share2, X, Calendar, Fuel, Gauge, Edit3, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

const RecordDetails = ({ record, onClose, onEdit, userProfile }) => {
  const shareRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  
  if (!record) return null;

  const handleShare = async () => {
    if (!shareRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareRef.current, {
        useCORS: true,
        backgroundColor: '#0f172a',
        scale: 2 // High Res
      });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharing(false);
          return;
        }

        const file = new File([blob], 'record-share.jpg', { type: 'image/jpeg' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `${userProfile?.name || 'Rider'}'s Refill Log`,
              text: `Refuel on ${record.date}: ₹${record.amount}, Mileage: ${record.mileage} km/L`,
              files: [file]
            });
          } catch (err) {
            if (err.name !== 'AbortError') {
              const link = document.createElement('a');
              link.href = canvas.toDataURL('image/jpeg');
              link.download = `bike-record-${record.date}.jpg`;
              link.click();
            }
          }
        } else {
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/jpeg');
          link.download = `bike-record-${record.date}.jpg`;
          link.click();
        }
        setIsSharing(false);
      }, 'image/jpeg', 0.95);
    } catch (e) {
      console.error("Share failed", e);
      setIsSharing(false);
      alert("Failed to generate image.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Hidden Share Card */}
      <div ref={shareRef} className="fixed -left-[9999px] top-0 w-[400px] bg-slate-900 text-white p-6 rounded-3xl">
        <div className="flex items-center gap-4 mb-6 border-b border-slate-700 pb-4">
          <div className="w-14 h-14 rounded-full border-2 border-emerald-500/30 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} className="w-full h-full object-cover" alt="Profile"/>
            ) : (
              <User size={32} className="text-emerald-400"/>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{userProfile?.name || 'Rider'}</h2>
            <p className="text-emerald-400 font-mono tracking-wider text-sm">{userProfile?.regNumber || 'No Reg Number'}</p>
          </div>
        </div>

        <div className="mb-4">
          <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {new Date(record.date.replace(/-/g, '/')).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Amount</p>
            <p className="text-2xl font-bold text-emerald-400">₹{record.amount}</p>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Mileage</p>
            <p className="text-2xl font-bold text-orange-400">{record.mileage} <span className="text-xs text-slate-400">km/L</span></p>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Fuel</p>
            <p className="text-xl font-bold text-blue-400">{record.quantity} L</p>
          </div>
          <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Cost/Km</p>
            <p className="text-xl font-bold text-purple-400">₹{record.ratePerKm}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-3.5 rounded-xl flex justify-between items-center border border-slate-700/50">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Distance</p>
            <p className="text-lg font-bold text-white">{record.totalDriven} km</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Odometer</p>
            <p className="text-sm font-mono text-slate-300">{record.oldReading} → {record.newReading}</p>
          </div>
        </div>
      </div>

      {/* Main Modal */}
      <div className="glass-panel-glow border border-slate-200 dark:border-white/15 w-full max-w-sm rounded-3xl shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-50 dark:bg-slate-900/90 p-6 text-slate-900 dark:text-white relative border-b border-slate-200 dark:border-white/10">
          <button 
            type="button"
            onClick={handleShare} 
            disabled={isSharing}
            className="absolute top-4 right-14 p-2 bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-300 dark:hover:bg-white/20 transition-colors border border-slate-300/60 dark:border-white/10"
            title="Share this record"
          >
            {isSharing ? <Loader2 size={18} className="animate-spin text-emerald-500" /> : <Share2 size={18} />}
          </button>
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-300 dark:hover:bg-white/20 transition-colors border border-slate-300/60 dark:border-white/10"
            title="Close"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Calendar size={20} />
            </div>
            <h3 className="text-xl font-black">Refill Telemetry</h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs ml-11 font-mono">
            {record.date}
          </p>
        </div>

        <div className="p-6 space-y-5 bg-white/95 dark:bg-[#090d16]/95">
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="space-y-0.5 p-3.5 glass-card rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-transparent">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-sans">Amount Paid</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{record.amount}</p>
            </div>
            <div className="space-y-0.5 p-3.5 glass-card rounded-2xl border border-cyan-500/30 bg-cyan-500/5 dark:bg-transparent">
              <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-sans">Driven</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">+{record.totalDriven} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">km</span></p>
            </div>
          </div>

          <div className="space-y-3 glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-sm bg-slate-50/70 dark:bg-transparent">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                <Fuel size={16} className="text-emerald-600 dark:text-emerald-400"/>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Fuel Details</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{record.quantity} L @ ₹{record.rate}/L</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                <Gauge size={16} className="text-cyan-600 dark:text-cyan-400"/>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Odometer</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/10">
                {record.oldReading} ➔ {record.newReading}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Mileage</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{record.mileage} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">km/L</span></span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Running Cost</span>
                <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">₹{record.ratePerKm} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/km</span></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { onClose(); onEdit(record); }}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Edit3 size={18} />
            Edit This Record
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordDetails;
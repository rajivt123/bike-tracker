// src/components/RecordDetails.jsx
import React, { useRef } from 'react';
import { User, Share2, X, Calendar, Fuel, Gauge, Edit3 } from 'lucide-react';

const RecordDetails = ({ record, onClose, onEdit, userProfile }) => {
  const shareRef = useRef(null);
  
  if (!record) return null;

  const handleShare = async () => {
    if (!shareRef.current || !window.html2canvas) {
      alert("Sharing module loading...");
      return;
    }
    try {
      const canvas = await window.html2canvas(shareRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2 // High Res
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'record-share.jpg', { type: 'image/jpeg' });
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Bike Record',
              text: `Refuel Record: ${new Date(record.date).toLocaleDateString()}`,
              files: [file]
            });
          } catch (err) {
            if (err.name !== 'AbortError') {
              const link = document.createElement('a');
              link.href = canvas.toDataURL('image/jpeg');
              link.download = 'record-share.jpg';
              link.click();
            }
          }
        } else {
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/jpeg');
          link.download = 'record-share.jpg';
          link.click();
        }
      }, 'image/jpeg');
    } catch (e) {
      console.error("Share failed", e);
      alert("Failed to generate image.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
      
      {/* Hidden Share Card */}
      <div ref={shareRef} className="fixed -left-[9999px] top-0 w-[400px] bg-slate-900 text-white p-6 rounded-3xl">
        <div className="flex items-center gap-4 mb-6 border-b border-slate-700 pb-4">
          <div className="w-14 h-14 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
            {userProfile?.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" alt="Profile"/> : <User size={32} className="text-emerald-400"/>}
          </div>
          <div>
            <h2 className="text-xl font-bold">{userProfile?.name || 'User'}</h2>
            <p className="text-emerald-400 font-mono tracking-wider text-sm">{userProfile?.regNumber}</p>
          </div>
        </div>

        <div className="mb-4">
          <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800 p-3 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Amount</p>
            <p className="text-2xl font-bold text-white">₹{record.amount}</p>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Mileage</p>
            <p className="text-2xl font-bold text-orange-400">{record.mileage}</p>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Fuel</p>
            <p className="text-xl font-bold text-blue-400">{record.quantity} L</p>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Cost/Km</p>
            <p className="text-xl font-bold text-purple-400">₹{record.ratePerKm}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-3 rounded-xl flex justify-between items-center">
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

      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 p-6 text-white relative">
          <button onClick={handleShare} className="absolute top-4 right-14 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <Share2 size={20} />
          </button>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Calendar size={20} className="text-emerald-400"/>
            </div>
            <h3 className="text-xl font-bold">Record Details</h3>
          </div>
          <p className="text-slate-400 text-sm ml-11">
            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Amount</p>
              <p className="text-2xl font-bold text-slate-800">₹{record.amount}</p>
            </div>
            <div className="space-y-1 p-3 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Driven</p>
              <p className="text-2xl font-bold text-slate-800">{record.totalDriven} <span className="text-sm font-medium text-slate-400">km</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-full text-slate-500"><Fuel size={16}/></div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Fuel Details</p>
                  <p className="text-sm font-semibold text-slate-700">{record.quantity} L @ ₹{record.rate}/L</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-full text-slate-500"><Gauge size={16}/></div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Odometer</p>
                  <p className="font-mono text-sm font-bold text-slate-700">{record.oldReading} → {record.newReading}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Mileage</p>
                <p className="text-lg font-bold text-orange-500">{record.mileage} <span className="text-xs text-slate-400">km/L</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-0.5">Cost Efficiency</p>
                <p className="text-lg font-bold text-purple-600">₹{record.ratePerKm} <span className="text-xs text-slate-400">/km</span></p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { onClose(); onEdit(record); }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Edit3 size={20} />
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordDetails;
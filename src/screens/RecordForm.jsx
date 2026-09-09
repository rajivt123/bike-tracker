// src/screens/RecordForm.jsx
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Trash2, AlertCircle, Calendar, IndianRupee, Gauge, RefreshCw, Save, CheckCircle2, Fuel, Zap, Sparkles } from 'lucide-react';

const RecordForm = ({ onSave, onCancel, initialData, lastRecord, allRecords, isEditMode = false, onDelete }) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    rate: initialData?.rate || (lastRecord ? lastRecord.rate : ''),
    amount: initialData?.amount || '',
    oldReading: initialData?.oldReading ?? (lastRecord ? lastRecord.newReading : ''),
    newReading: initialData?.newReading || '',
  });
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleQuickAmount = (val) => {
    setFormData(prev => ({ ...prev, amount: val.toString() }));
    setError(null);
  };

  const handleRateStep = (delta) => {
    const current = parseFloat(formData.rate) || 105;
    const updated = Math.max(1, current + delta);
    setFormData(prev => ({ ...prev, rate: updated.toFixed(2) }));
    setError(null);
  };

  const calculations = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const oldRead = parseFloat(formData.oldReading) || 0;
    const newRead = parseFloat(formData.newReading) || 0;
    
    const quantity = rate > 0 ? (amount / rate) : 0;
    const totalDriven = newRead > oldRead ? (newRead - oldRead) : 0;
    const mileage = quantity > 0 ? (totalDriven / quantity) : 0;
    const ratePerKm = totalDriven > 0 ? (amount / totalDriven) : 0;

    return {
      quantity: quantity.toFixed(2),
      totalDriven: totalDriven.toFixed(1),
      mileage: mileage.toFixed(2),
      ratePerKm: ratePerKm.toFixed(2)
    };
  }, [formData]);

  const efficiencyScore = useMemo(() => {
    const m = parseFloat(calculations.mileage) || 0;
    if (m >= 52) return { text: 'High Efficiency', color: 'emerald', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    if (m >= 42) return { text: 'Optimal Commute', color: 'cyan', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' };
    if (m > 0) return { text: 'Heavy Consumption', color: 'amber', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    return { text: 'Awaiting Readings', color: 'slate', bg: 'bg-slate-800 text-slate-400 border-slate-700' };
  }, [calculations.mileage]);

  const validateRecord = () => {
    const amount = parseFloat(formData.amount);
    const rate = parseFloat(formData.rate);
    const currentOldReading = parseFloat(formData.oldReading);
    const currentNewReading = parseFloat(formData.newReading);
    const currentDate = formData.date;

    if (isNaN(amount) || amount <= 0) {
      return "Please enter a valid fuel amount paid (₹).";
    }

    if (isNaN(rate) || rate <= 0) {
      return "Please enter a valid fuel rate per liter (₹/L).";
    }

    if (isNaN(currentOldReading) || currentOldReading < 0) {
      return "Please enter a valid previous/start odometer reading.";
    }

    if (isNaN(currentNewReading) || currentNewReading <= 0) {
      return "Please enter the current odometer reading.";
    }

    if (currentNewReading <= currentOldReading) {
      return `Current reading (${currentNewReading} km) must be strictly greater than previous reading (${currentOldReading} km).`;
    }

    const otherRecords = isEditMode
      ? allRecords.filter(r => r.id !== initialData.id)
      : allRecords;

    const sortedRecords = [...otherRecords].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return parseFloat(a.oldReading || 0) - parseFloat(b.oldReading || 0);
    });

    // Check chronological integrity with other records
    for (const other of sortedRecords) {
      const otherOld = parseFloat(other.oldReading);
      const otherNew = parseFloat(other.newReading);

      if (other.date > currentDate) {
        if (currentNewReading > otherOld) {
          return `Logic Error: Current reading (${currentNewReading} km) on ${currentDate} exceeds future start reading (${otherOld} km) on ${other.date}.`;
        }
      } else if (other.date < currentDate) {
        if (currentOldReading < otherNew) {
          return `Logic Error: Start reading (${currentOldReading} km) on ${currentDate} cannot be lower than previous finish reading (${otherNew} km) on ${other.date}.`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    const validationError = validateRecord();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    onSave({
      id: isEditMode ? initialData.id : Date.now(),
      ...formData,
      ...calculations
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 animate-in slide-in-from-bottom-6 duration-300 overflow-y-auto">
      
      {/* Top Header */}
      <div className="glass-panel-glow border-b border-slate-200 dark:border-white/10 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onCancel} 
            className="p-2.5 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 rounded-2xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10"
            title="Return to Cockpit"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <Fuel size={20} className="text-emerald-500 dark:text-emerald-400" />
              {isEditMode ? 'Edit Refill Log' : 'Fuel Station Log'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block font-medium">
              {isEditMode ? 'Adjust pump metrics and recalibrate telemetry' : 'Record purchase amount & pump odometer to compute performance in real-time'}
            </p>
          </div>
        </div>

        {isEditMode ? (
          <button 
            type="button"
            onClick={() => onDelete(initialData.id)} 
            className="px-3.5 py-2 text-rose-500 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={16} /> Delete Log
          </button>
        ) : (
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
            <Sparkles size={13} /> Auto-Calibrating
          </div>
        )}
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-16">
        
        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-rose-600 dark:text-rose-300 animate-in fade-in slide-in-from-top-2 shadow-lg">
            <AlertCircle className="shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" size={20} />
            <p className="text-sm font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Column: Interactive Pump Inputs */}
            <div className="md:col-span-7 glass-panel p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 space-y-6 shadow-xl">
              
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Zap size={14} className="text-emerald-500 dark:text-emerald-400" /> Fuel Transaction
                </h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">STEP 1 OF 2</span>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Refill Date</label>
                <div className="relative">
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full glass-input rounded-2xl p-3.5 pl-11 font-medium font-mono text-slate-900 dark:text-white text-sm outline-none transition-all"
                  />
                  <Calendar size={18} className="absolute left-3.5 top-4 text-slate-400" />
                </div>
              </div>

              {/* Amount with Quick Chips */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Amount Paid (₹)</label>
                  <span className="text-[11px] text-slate-400">Tap quick amount below</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    name="amount"
                    placeholder="500"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-4 pl-10 focus:ring-2 focus:ring-emerald-400 outline-none font-black text-2xl text-emerald-700 dark:text-emerald-300 font-mono"
                    autoFocus={!isEditMode}
                  />
                  <IndianRupee size={20} className="absolute left-3.5 top-5 text-emerald-500 dark:text-emerald-400 font-bold" />
                </div>

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[200, 300, 500, 700, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmount(val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                        formData.amount === val.toString() 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30 scale-105' 
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuel Rate with Adjustment Steppers */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Fuel Price Rate (₹ / Liter)</label>
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      type="button"
                      onClick={() => handleRateStep(-0.5)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded text-xs"
                    >
                      -0.5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRateStep(0.5)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded text-xs"
                    >
                      +0.5
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    name="rate"
                    placeholder="105.10"
                    value={formData.rate}
                    onChange={handleChange}
                    className="w-full glass-input rounded-2xl p-3.5 pl-10 font-bold font-mono text-slate-900 dark:text-white text-base outline-none"
                  />
                  <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold font-mono text-sm">₹</span>
                </div>
              </div>

              {/* Odometer Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                    <Gauge size={14} /> Odometer Cluster
                  </h3>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">STEP 2 OF 2</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Start / Previous Reading (km)</span>
                    {lastRecord && !isEditMode && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-sans">Auto-retrieved from last log</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      name="oldReading"
                      placeholder="e.g. 3891"
                      value={formData.oldReading}
                      onChange={handleChange}
                      className="w-full glass-input rounded-2xl p-3.5 pl-10 font-bold font-mono text-slate-900 dark:text-white text-base outline-none"
                    />
                    <Gauge size={18} className="absolute left-3.5 top-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Current Reading at Pump (km)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      name="newReading"
                      placeholder="e.g. 4130"
                      value={formData.newReading}
                      onChange={handleChange}
                      className="w-full bg-cyan-500/10 dark:bg-cyan-950/20 border border-cyan-500/40 rounded-2xl p-4 pl-10 focus:ring-2 focus:ring-cyan-400 outline-none font-black text-xl text-cyan-700 dark:text-cyan-300 font-mono"
                    />
                    <Gauge size={20} className="absolute left-3.5 top-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>

                {/* Real-time Distance Calculation pill */}
                {parseFloat(calculations.totalDriven) > 0 && (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Total Distance This Tank:</span>
                    <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">+{calculations.totalDriven} km</span>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Live Telemetry Computer Card */}
            <div className="md:col-span-5 flex flex-col gap-6">
              
              <div className="glass-panel-glow rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-2xl relative overflow-hidden space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <span className="text-xs font-black tracking-wider text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                    <Zap size={14} className="text-emerald-500 dark:text-emerald-400" /> Telemetry Compute
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${efficiencyScore.bg}`}>
                    {efficiencyScore.text}
                  </span>
                </div>

                {/* Fuel Volume */}
                <div className="glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Fuel Dispensed</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {calculations.quantity} <span className="text-xs font-bold text-slate-400">LITERS</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Fuel size={22} />
                  </div>
                </div>

                {/* Distance Driven */}
                <div className="glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Leg Distance</p>
                    <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                      {calculations.totalDriven} <span className="text-xs font-bold text-slate-400">KM</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Gauge size={22} />
                  </div>
                </div>

                {/* Mileage Result */}
                <div className="glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Leg Fuel Mileage</p>
                    <p className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                      {calculations.mileage} <span className="text-xs font-bold text-slate-400">KM / L</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Zap size={22} />
                  </div>
                </div>

                {/* Running Cost */}
                <div className="glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Per-Kilometer Expense</p>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                      ₹{calculations.ratePerKm} <span className="text-xs font-bold text-slate-400">/ KM</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <IndianRupee size={20} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-auto">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-1/3 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold rounded-2xl transition-colors border border-slate-300 dark:border-white/10 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-2/3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 py-4 rounded-2xl font-black text-base shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Calibrating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {isEditMode ? 'Update Log' : 'Save To Telemetry'}
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </form>
      </div>

    </div>
  );
};

export default RecordForm;
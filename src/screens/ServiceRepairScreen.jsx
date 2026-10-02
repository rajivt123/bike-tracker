// src/screens/ServiceRepairScreen.jsx
import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Calendar, 
  Gauge, 
  IndianRupee, 
  Sparkles,
  Settings2
} from 'lucide-react';

export default function ServiceRepairScreen({ onBack }) {
  const { 
    activeVehicle, 
    serviceSettings, 
    serviceRecords, 
    repairRecords, 
    nextServiceDue,
    addServiceRecord, 
    deleteServiceRecord, 
    addRepairRecord, 
    deleteRepairRecord, 
    updateServiceSettings 
  } = useAppData();

  const [activeTab, setActiveTab] = useState('service'); // 'service' | 'repairs'
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Service form state
  const [serviceOdo, setServiceOdo] = useState(activeVehicle?.current_odometer_km || '');
  const [serviceAmount, setServiceAmount] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceNotes, setServiceNotes] = useState('');

  // Repair form state
  const [repairDesc, setRepairDesc] = useState('');
  const [repairAmount, setRepairAmount] = useState('');
  const [repairOdo, setRepairOdo] = useState(activeVehicle?.current_odometer_km || '');
  const [repairDate, setRepairDate] = useState(new Date().toISOString().split('T')[0]);
  const [repairNotes, setRepairNotes] = useState('');

  // Interval setting state
  const [intervalKm, setIntervalKm] = useState(serviceSettings?.interval_km || 2000);

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!serviceOdo) return;
    await addServiceRecord({
      odometer_km: serviceOdo,
      amount: serviceAmount || 0,
      service_date: serviceDate,
      notes: serviceNotes,
    });
    setShowServiceModal(false);
    setServiceAmount('');
    setServiceNotes('');
  };

  const handleCreateRepair = async (e) => {
    e.preventDefault();
    if (!repairDesc) return;
    await addRepairRecord({
      description: repairDesc,
      amount: repairAmount || 0,
      odometer_km: repairOdo || null,
      repair_date: repairDate,
      notes: repairNotes,
    });
    setShowRepairModal(false);
    setRepairDesc('');
    setRepairAmount('');
    setRepairNotes('');
  };

  const handleSaveInterval = async (e) => {
    e.preventDefault();
    await updateServiceSettings({
      interval_km: intervalKm,
    });
    setShowSettingsModal(false);
  };

  // Badge styling for next service status
  const statusConfig = {
    add_first: {
      label: 'ADD FIRST SERVICE',
      color: 'slate',
      bg: 'bg-slate-500/15 border-slate-500/30 text-slate-600 dark:text-slate-400',
      icon: Plus,
    },
    good: {
      label: 'SYSTEM HEALTHY',
      color: 'emerald',
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
    },
    due_soon: {
      label: 'SERVICE DUE SOON',
      color: 'amber',
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
      icon: Clock,
    },
    overdue: {
      label: 'SERVICE OVERDUE',
      color: 'rose',
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
      icon: AlertTriangle,
    },
  }[nextServiceDue.status] || {
    label: 'CHECK SCHEDULE',
    color: 'slate',
    bg: 'bg-slate-200 border-slate-300 text-slate-700',
    icon: CheckCircle2,
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-y-auto pb-24 md:pb-8">
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <ChevronLeft size={16} /> Cockpit
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Wrench size={13} /> Maintenance Hub
          </div>
        </div>

        {/* 1. SERVICE STATUS OVERVIEW CARD */}
        <div className="glass-panel-glow rounded-3xl p-6 md:p-8 relative overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-xl mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${statusConfig.bg}`}>
                  <StatusIcon size={14} /> {statusConfig.label}
                </span>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Configure service intervals"
                >
                  <Settings2 size={16} />
                </button>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeVehicle?.name || 'My Motorcycle'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target Interval: every <span className="font-bold text-slate-700 dark:text-slate-300">{nextServiceDue.intervalKm} km</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setServiceOdo(activeVehicle?.current_odometer_km || '');
                  setShowServiceModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} /> Log Service
              </button>
              <button
                onClick={() => {
                  setRepairOdo(activeVehicle?.current_odometer_km || '');
                  setShowRepairModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-white/10 font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} /> Log Repair
              </button>
            </div>
          </div>

          {/* Odometer Milestone Progress */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10 text-center font-mono">
            <div className="glass-card p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Last Service Odo</span>
              <p className="text-base md:text-lg font-black text-slate-900 dark:text-white mt-1">
                {nextServiceDue.hasPreviousService ? (
                  <>{nextServiceDue.lastServiceOdometerKm} <span className="text-xs font-normal">KM</span></>
                ) : (
                  <span className="text-slate-400 text-sm font-sans font-medium">None</span>
                )}
              </p>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Current Odometer</span>
              <p className="text-base md:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {activeVehicle?.current_odometer_km || 0} <span className="text-xs font-normal">KM</span>
              </p>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Next Service Target</span>
              <p className={`text-base md:text-lg font-black mt-1 ${!nextServiceDue.hasPreviousService ? 'text-slate-400 text-sm font-sans font-medium' : nextServiceDue.remainingKm <= 0 ? 'text-rose-500' : 'text-cyan-600 dark:text-cyan-400'}`}>
                {nextServiceDue.hasPreviousService ? (
                  <>{nextServiceDue.nextTargetKm} <span className="text-xs font-normal">KM</span></>
                ) : (
                  'Add First Service'
                )}
              </p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                {!nextServiceDue.hasPreviousService
                  ? 'No service logged yet'
                  : nextServiceDue.remainingKm <= 0 
                    ? `${Math.abs(nextServiceDue.remainingKm)} km past target!` 
                    : `${nextServiceDue.remainingKm} km remaining`}
              </p>
            </div>
          </div>
        </div>

        {/* 2. TABS: SERVICE LOGS vs REPAIR LOGS */}
        <div className="flex items-center gap-2 p-1 bg-slate-200/80 dark:bg-slate-900/80 rounded-2xl border border-slate-300 dark:border-white/10 mb-4 text-xs font-bold w-fit">
          <button
            onClick={() => setActiveTab('service')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'service'
                ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench size={14} /> Service Records ({serviceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'repairs'
                ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={14} /> Repair Records ({repairRecords.length})
          </button>
        </div>

        {/* 3. LOG ENTRIES LIST */}
        {activeTab === 'service' ? (
          serviceRecords.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
              <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Wrench size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No scheduled service logs yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap "Log Service" after engine oil or periodic bike maintenance!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {serviceRecords.map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.service_date}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        <span>Odo: {item.odometer_km} KM</span>
                        {item.notes && <span className="font-sans">• {item.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <p className="font-black text-sm text-slate-900 dark:text-white">₹{parseFloat(item.amount || 0).toFixed(0)}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this service entry?')) {
                          deleteServiceRecord(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          repairRecords.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
              <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Sparkles size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No repair logs recorded</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap "Log Repair" to track unexpected repairs, puncture fixes, or parts replacements!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {repairRecords.map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        <span>{item.repair_date}</span>
                        {item.odometer_km && <span>• Odo: {item.odometer_km} KM</span>}
                        {item.notes && <span className="font-sans">• {item.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <p className="font-black text-sm text-slate-900 dark:text-white">₹{parseFloat(item.amount || 0).toFixed(0)}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this repair entry?')) {
                          deleteRepairRecord(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>

      {/* MODAL: LOG SERVICE */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">Log Periodic Service</h3>
            <form onSubmit={handleCreateService} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Service Odometer (KM)*</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={serviceOdo}
                  onChange={(e) => setServiceOdo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Service Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={serviceAmount}
                  onChange={(e) => setServiceAmount(e.target.value)}
                  placeholder="e.g. 850"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Notes / Items Serviced</label>
                <textarea
                  rows={2}
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  placeholder="Engine oil change, chain lube, air filter check..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG REPAIR */}
      {showRepairModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">Log Vehicle Repair</h3>
            <form onSubmit={handleCreateRepair} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Description*</label>
                <input
                  type="text"
                  required
                  value={repairDesc}
                  onChange={(e) => setRepairDesc(e.target.value)}
                  placeholder="e.g. Rear tyre puncture fix, Brake pad change"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Cost (₹)*</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={repairAmount}
                  onChange={(e) => setRepairAmount(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Odometer (Optional)</label>
                <input
                  type="number"
                  step="any"
                  value={repairOdo}
                  onChange={(e) => setRepairOdo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="Mechanic name, part serial number, etc."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRepairModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20"
                >
                  Save Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INTERVAL SETTINGS */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-2">Service Interval</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Set how frequently your bike requires periodic servicing.</p>
            <form onSubmit={handleSaveInterval} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Interval (KM)</label>
                <input
                  type="number"
                  step="100"
                  required
                  value={intervalKm}
                  onChange={(e) => setIntervalKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono"
                />
              </div>
              <div className="flex gap-2">
                {[1500, 2000, 2500, 3000, 5000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setIntervalKm(val)}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${
                      intervalKm === val 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500' 
                        : 'border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black"
                >
                  Update Interval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

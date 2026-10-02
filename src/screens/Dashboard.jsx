// src/screens/Dashboard.jsx
import React, { useMemo } from 'react';
import { 
  Settings, User, Plus, ChevronRight, History, Table, Fuel, 
  TrendingUp, Calendar, Zap, Compass, Activity, ArrowUpRight, Gauge,
  Clock, Wrench, ShieldCheck, BookOpen, AlertCircle, Sparkles, Navigation
} from 'lucide-react';
import { calculateStats } from '../utils/helpers';
import { useAppData } from '../context/AppDataContext';

const Dashboard = ({ records = [], userProfile, onNavigate, onCompletePendingRefill }) => {
  const { 
    vehicles, 
    activeVehicle, 
    selectVehicle, 
    pendingFuelRecord, 
    nextServiceDue, 
    trips, 
    reminders, 
    cashBookSummary,
    setActiveArea
  } = useAppData();

  const stats = useMemo(() => calculateStats(records), [records]);
  
  const recentRecords = useMemo(() => {
    return [...records].reverse().slice(0, 5);
  }, [records]);

  // Latest odometer reading from vehicle or records
  const currentOdometer = useMemo(() => {
    if (activeVehicle?.current_odometer_km) {
      return parseFloat(activeVehicle.current_odometer_km);
    }
    if (records.length === 0) return 0;
    const lastRecord = records[records.length - 1];
    return parseFloat(lastRecord.newReading) || 0;
  }, [activeVehicle, records]);

  // Mini sparkline data generator for mileage trend
  const sparklinePoints = useMemo(() => {
    if (records.length < 2) return '';
    const lastSix = records.slice(-8);
    const mileages = lastSix.map(r => parseFloat(r.mileage) || 0);
    const min = Math.min(...mileages) * 0.9;
    const max = Math.max(...mileages) * 1.1;
    const range = max - min || 1;
    const width = 120;
    const height = 36;
    
    return mileages.map((m, idx) => {
      const x = (idx / (mileages.length - 1)) * width;
      const y = height - ((m - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [records]);

  // Efficiency classification badge
  const efficiencyBadge = useMemo(() => {
    const avg = stats.avgMileage;
    if (avg >= 50) return { label: 'ECO CHAMPION', color: 'emerald', text: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' };
    if (avg >= 40) return { label: 'OPTIMAL DRIVE', color: 'cyan', text: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/40' };
    if (avg > 0) return { label: 'HEAVY FUEL BURN', color: 'amber', text: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' };
    return { label: 'NO DATA YET', color: 'slate', text: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' };
  }, [stats.avgMileage]);

  // Gauge calculations for 0 - 80 km/L
  const gaugePercent = Math.min(Math.max((stats.avgMileage / 80) * 100, 0), 100);
  const strokeDash = 150.8;
  const strokeOffset = strokeDash - (strokeDash * (gaugePercent / 100));

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 animate-in fade-in duration-300 overflow-y-auto pb-24 md:pb-8">
      
      {/* 1. TOP INSTRUMENT CLUSTER / VIRTUAL COCKPIT */}
      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
        
        {/* PENDING FUEL RECORD BANNER (Reserve-to-Reserve Workflow) */}
        {pendingFuelRecord && (
          <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/30 text-amber-700 dark:text-amber-300 rounded-2xl">
                <Clock size={20} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Pending Refill Leg Active</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                    Awaiting Next Reserve
                  </span>
                </p>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Filled at <strong className="font-mono">{pendingFuelRecord.start_odometer_km} km</strong> (₹{pendingFuelRecord.total_cost} @ ₹{pendingFuelRecord.fuel_rate_per_litre}/L). Hit reserve again?
                </p>
              </div>
            </div>
            <button
              onClick={() => onCompletePendingRefill ? onCompletePendingRefill(pendingFuelRecord) : onNavigate('add')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black tracking-wide shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Zap size={15} /> Complete Leg (Enter Odo)
            </button>
          </div>
        )}

        <div className="glass-panel-glow rounded-3xl p-5 md:p-8 relative overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Profile & Number Plate Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
            <div className="flex items-center gap-4">
              {/* Rider Avatar with Status Dot */}
              <div className="relative">
                <div className="w-16 h-16 md:w-18 md:h-18 rounded-2xl border-2 border-emerald-500/40 overflow-hidden bg-slate-100 dark:bg-slate-900/80 flex items-center justify-center shrink-0 shadow-md dark:shadow-lg dark:shadow-emerald-500/10">
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={30} className="text-emerald-500 dark:text-emerald-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0c121e] flex items-center justify-center" title="System Operational">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-ping"></div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {activeVehicle?.name || userProfile?.name || 'Rider'}'s Machine
                  </h1>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${efficiencyBadge.bg} ${efficiencyBadge.text}`}>
                    {efficiencyBadge.label}
                  </span>
                </div>

                {/* Embossed License Plate & Vehicle Selector */}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <div className="license-plate px-3 py-0.5 rounded-md text-xs md:text-sm font-mono flex items-center gap-2">
                    <span className="text-[9px] font-bold text-blue-800 tracking-tighter flex items-center gap-0.5 border-r border-slate-300 pr-1.5">
                      IND 🇮🇳
                    </span>
                    <span>{activeVehicle?.registration_number || userProfile?.regNumber || 'MH • BIKE • 2026'}</span>
                  </div>

                  {vehicles.length > 1 && (
                    <select
                      value={activeVehicle?.id || ''}
                      onChange={(e) => selectVehicle(e.target.value)}
                      className="text-xs bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-2 py-0.5 font-bold cursor-pointer"
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.registration_number || 'No plate'})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Right Cluster: Digital Odometer Display & Settings */}
            <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-slate-200 dark:border-white/5 md:border-0">
              <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-2xl text-right shadow-xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Current Odometer</p>
                <div className="flex items-baseline gap-1 justify-end font-mono">
                  <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {currentOdometer.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">KM</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('settings')}
                className="p-3 bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-2xl transition-all border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 shadow-xs cursor-pointer"
                title="Vehicle Configuration"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          {/* 2. TELEMETRY KPI TILES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
            
            {/* Tile 1: Total Spent */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Total Spent</span>
                <span className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                  <Activity size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹</span>
                <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-mono">{stats.totalAmount.toFixed(0)}</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Avg ₹{stats.count > 0 ? (stats.totalAmount / stats.count).toFixed(0) : 0} per refill
              </p>
            </div>

            {/* Tile 2: Total Driven */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Distance</span>
                <span className="p-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg border border-cyan-500/20">
                  <Compass size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{stats.totalDriven.toFixed(0)}</p>
                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold">KM</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Across {stats.count} refill legs
              </p>
            </div>

            {/* Tile 3: Avg Mileage */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Avg Mileage</span>
                <span className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
                  <Zap size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <p className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400">{stats.avgMileage.toFixed(1)}</p>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">km/L</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {stats.totalQuantity.toFixed(1)} Litres combusted
              </p>
            </div>

            {/* Tile 4: Rate Per Km */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Cost / KM</span>
                <span className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20">
                  <TrendingUp size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">₹</span>
                <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{stats.avgRatePerKm.toFixed(2)}</p>
                <span className="text-xs text-slate-400 font-bold">/km</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Running expense index
              </p>
            </div>

          </div>
        </div>

        {/* 3. QUICK NAV SHORTCUTS (Speedometer, Service Hub, Documents, Cash Book) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {/* Speedometer & Trips */}
          <button
            onClick={() => onNavigate('trips')}
            className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2.5 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                <Navigation size={20} />
              </div>
              <ArrowUpRight size={18} className="text-slate-400 group-hover:text-cyan-500 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Live Speedometer</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{trips.length} recorded GPS trips</p>
            </div>
          </button>

          {/* Service & Repairs */}
          <button
            onClick={() => onNavigate('service')}
            className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                <Wrench size={20} />
              </div>
              <ArrowUpRight size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Service & Repairs</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {!nextServiceDue.hasPreviousService
                  ? 'Add First Service'
                  : nextServiceDue.remainingKm <= 0
                    ? 'Service Overdue!'
                    : `${nextServiceDue.remainingKm} km to service`}
              </p>
            </div>
          </button>

          {/* Documents & Vault */}
          <button
            onClick={() => onNavigate('documents')}
            className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-purple-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <ArrowUpRight size={18} className="text-slate-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Vault & Reminders</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{reminders.filter(r => r.status === 'active').length} active alerts</p>
            </div>
          </button>

          {/* Cash Book Switcher */}
          <button
            onClick={() => {
              setActiveArea('cash_book');
              onNavigate('cash_book');
            }}
            className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-amber-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs cursor-pointer bg-gradient-to-br from-amber-500/5 to-transparent"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen size={20} />
              </div>
              <ArrowUpRight size={18} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cash Book Ledger</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                ₹{cashBookSummary.netBalance.toLocaleString('en-IN')} net
              </p>
            </div>
          </button>
        </div>

        {/* 4. MAIN COCKPIT SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
          
          {/* Left Column (7 Cols on PC): Analog Gauge + Quick Actions */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Efficiency Telemetry Dial Card */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400" /> Fuel Economy Gauge
                </span>
                <span className="text-[11px] font-mono text-slate-400">Scale: 0 - 80 km/L</span>
              </div>

              {/* Semi-Circle SVG Radial Gauge */}
              <div className="relative w-48 h-28 mx-auto flex flex-col items-center justify-end">
                <svg viewBox="0 0 120 70" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="45%" stopColor="#f59e0b" />
                      <stop offset="70%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <path
                    d="M 12 60 A 48 48 0 0 1 108 60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-slate-200 dark:text-white/10"
                  />
                  {/* Dynamic Colored Track */}
                  <path
                    d="M 12 60 A 48 48 0 0 1 108 60"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="8"
                    strokeDasharray={strokeDash}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Central Digital Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-0 pointer-events-none">
                  <span className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                    {stats.avgMileage > 0 ? stats.avgMileage.toFixed(1) : '--'}
                  </span>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">
                    KM / LITRE
                  </span>
                </div>
              </div>

              {/* Sparkline Visualizer */}
              {sparklinePoints && (
                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Recent Trend: </span>
                    <span>Last {records.slice(-8).length} refills</span>
                  </div>
                  <svg className="w-28 h-8 overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklinePoints}
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Quick Action Tiles */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
                Refill Actions
              </h2>

              <div className="grid grid-cols-3 gap-3">
                {/* Tile 1: Quick Add Record */}
                <button
                  onClick={() => onNavigate('add')}
                  className="glass-card hover:bg-emerald-500/10 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                      <Plus size={20} />
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Log Refill</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Add fuel & odometer</p>
                  </div>
                </button>

                {/* Tile 2: Analytics & Reports */}
                <button
                  onClick={() => onNavigate('history')}
                  className="glass-card hover:bg-cyan-500/10 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                      <History size={20} />
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400 group-hover:text-cyan-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Analytics</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Charts & share card</p>
                  </div>
                </button>

                {/* Tile 3: Logs Data Table */}
                <button
                  onClick={() => onNavigate('detailed_list')}
                  className="glass-card hover:bg-purple-500/10 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-purple-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
                      <Table size={20} />
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400 group-hover:text-purple-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Records</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Import / Export data</p>
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column (5 Cols on PC): Recent Refill Activity Timeline */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Activity size={14} className="text-cyan-600 dark:text-cyan-400" /> Recent Refills Feed
              </h2>
              {records.length > 0 && (
                <button
                  onClick={() => onNavigate('detailed_list')}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All ({records.length}) <ChevronRight size={14} />
                </button>
              )}
            </div>

            <div className="glass-panel rounded-3xl p-3 border border-slate-200/80 dark:border-white/10 overflow-hidden divide-y divide-slate-200/60 dark:divide-white/5 shadow-lg">
              {recentRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400 dark:text-slate-500">
                    <Fuel size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No refill records logged</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap "Log Refill" to initialize your bike's telemetry journal!</p>
                </div>
              ) : (
                recentRecords.map(record => (
                  <div 
                    key={record.id}
                    onClick={() => onNavigate('detailed_list')}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-white/5 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-105 transition-transform">
                        <Fuel size={17} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          {record.date}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          <span>{record.oldReading} ➔ {record.newReading || 'Reserve'}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{record.totalDriven} km</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <p className="font-black text-sm text-slate-900 dark:text-white">₹{record.amount}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          {record.mileage} km/L
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Dashboard;
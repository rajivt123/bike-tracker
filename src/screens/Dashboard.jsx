// src/screens/Dashboard.jsx
import React, { useMemo } from 'react';
import { 
  Settings, User, Plus, ChevronRight, History, Table, Fuel, 
  TrendingUp, Calendar, Zap, Compass, Activity, ArrowUpRight, Gauge
} from 'lucide-react';
import { calculateStats } from '../utils/helpers';

const Dashboard = ({ records, userProfile, onNavigate }) => {
  const stats = useMemo(() => calculateStats(records), [records]);
  
  const recentRecords = useMemo(() => {
    return [...records].reverse().slice(0, 5);
  }, [records]);

  // Latest odometer reading
  const currentOdometer = useMemo(() => {
    if (records.length === 0) return 0;
    const lastRecord = records[records.length - 1];
    return parseFloat(lastRecord.newReading) || 0;
  }, [records]);

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
  // Semi-circle stroke dash calculation (radius 48, circumference = pi * 48 = ~150.8)
  const strokeDash = 150.8;
  const strokeOffset = strokeDash - (strokeDash * (gaugePercent / 100));

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 animate-in fade-in duration-300 overflow-y-auto pb-8">
      
      {/* 1. TOP INSTRUMENT CLUSTER / VIRTUAL COCKPIT */}
      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
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
                  {userProfile.avatar ? (
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
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">{userProfile.name}'s Machine</h1>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${efficiencyBadge.bg} ${efficiencyBadge.text}`}>
                    {efficiencyBadge.label}
                  </span>
                </div>

                {/* Embossed License Plate */}
                <div className="mt-1.5 inline-flex items-center">
                  <div className="license-plate px-3 py-0.5 rounded-md text-xs md:text-sm font-mono flex items-center gap-2">
                    <span className="text-[9px] font-bold text-blue-800 tracking-tighter flex items-center gap-0.5 border-r border-slate-300 pr-1.5">
                      IND 🇮🇳
                    </span>
                    <span>{userProfile.regNumber || 'MH • BIKE • 2026'}</span>
                  </div>
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
                className="p-3 bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-2xl transition-all border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 shadow-xs"
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
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">KM/L</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Efficiency score: {stats.avgMileage >= 45 ? 'Optimal' : 'Standard'}
              </p>
            </div>

            {/* Tile 4: Running Cost */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Cost / Km</span>
                <span className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20">
                  <TrendingUp size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">₹</span>
                <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{stats.avgRatePerKm.toFixed(2)}</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Per kilometer driven
              </p>
            </div>

          </div>

          {/* Quick Telemetry Footnote with Fuel Volume */}
          <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-white/10 flex flex-wrap justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-2 relative z-10">
            <span className="flex items-center gap-2">
              <Fuel size={14} className="text-cyan-600 dark:text-cyan-400" /> Total Fuel Consumed: <strong className="text-slate-900 dark:text-white font-mono">{stats.totalQuantity.toFixed(2)} Liters</strong>
            </span>
            <span className="flex items-center gap-2">
              <Activity size={14} className="text-emerald-600 dark:text-emerald-400" /> Refill Sessions: <strong className="text-slate-900 dark:text-white font-mono">{stats.count} Logs</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN COCKPIT BODY: GAUGE + QUICK ACTIONS + RECENT ACTIVITY */}
      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pt-0 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left Column (7 Cols on PC): Efficiency Gauge + Command Tiles */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Visual Mileage HUD Card with Speedometer Arc */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Gauge size={14} /> Telemetry Efficiency Gauge
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Engine Performance Meter</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                  Real-time fuel-to-distance ratio calibrated on historical refill logs. Target range: 45 - 65 km/L.
                </p>
                
                {/* Mini Sparkline Visualization */}
                {sparklinePoints && (
                  <div className="pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Recent Trajectory</p>
                    <svg className="w-32 h-9 overflow-visible">
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

              {/* Gauge Graphic */}
              <div className="relative w-40 h-28 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 120 70" className="w-40 h-28">
                  {/* Gauge Background Track */}
                  <path
                    d="M 12 60 A 48 48 0 0 1 108 60"
                    fill="none"
                    stroke="currentColor"
                    className="text-slate-200 dark:text-white/10"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Gauge Active Progress Arc */}
                  <path
                    d="M 12 60 A 48 48 0 0 1 108 60"
                    fill="none"
                    stroke="url(#gauge-grad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="150.8"
                    strokeDashoffset={strokeOffset}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Readout in center */}
                <div className="absolute bottom-1 text-center font-mono">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.avgMileage.toFixed(1)}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">KM/L</p>
                </div>
              </div>
            </div>

            {/* Quick Action Command Tiles */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 flex items-center gap-2">
                <Zap size={14} className="text-emerald-500 dark:text-emerald-400" /> Command Actions
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tile 1: Log Refill */}
                <button
                  onClick={() => onNavigate('add')}
                  className="glass-card hover:bg-emerald-500/10 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                      <Plus size={20} />
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Log Refill</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Add fuel & odometer</p>
                  </div>
                </button>

                {/* Tile 2: Analytics & Reports */}
                <button
                  onClick={() => onNavigate('history')}
                  className="glass-card hover:bg-cyan-500/10 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                      <History size={20} />
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Analytics</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Charts & share card</p>
                  </div>
                </button>

                {/* Tile 3: Logs Data Table */}
                <button
                  onClick={() => onNavigate('detailed_list')}
                  className="glass-card hover:bg-purple-500/10 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-purple-500/40 text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 shadow-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
                      <Table size={20} />
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
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
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:underline flex items-center gap-1"
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
                          <span>{record.oldReading} ➔ {record.newReading}</span>
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
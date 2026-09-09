// src/screens/HistoryReport.jsx
import React, { useRef, useMemo, useState } from 'react';
import { ArrowLeft, Share2, User, List, Download, Sparkles, TrendingUp, BarChart2, Calendar, Zap, Award, Compass, Fuel } from 'lucide-react';
import html2canvas from 'html2canvas';
import FilterBar from '../components/FilterBar';
import { calculateStats, getDateRangeString, parseLocalDate } from '../utils/helpers';

const HistoryReport = ({ records, filterConfig, onFilterChange, onNavigateList, onBack, userProfile }) => {
  const cardRef = useRef(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('mileage'); // 'mileage' or 'spending'
  
  const availableYears = useMemo(() => {
    const years = new Set(records.map(r => parseLocalDate(r.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    let filtered = [...records];
    const { dateMode, dateRange, year, month, amountFilter, costFilter, mileageFilter } = filterConfig;

    if (dateMode === 'month') {
      filtered = filtered.filter(r => {
        const d = parseLocalDate(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
    } else if (dateMode === 'year') {
      filtered = filtered.filter(r => {
        const d = parseLocalDate(r.date);
        return d.getFullYear() === year;
      });
    } else if (dateMode === 'custom') {
      filtered = filtered.filter(r => {
        return r.date >= dateRange.start && r.date <= dateRange.end;
      });
    }

    [
      { filter: amountFilter, key: 'amount' },
      { filter: costFilter, key: 'ratePerKm' },
      { filter: mileageFilter, key: 'mileage' }
    ].forEach(({ filter, key }) => {
      if (filter.value !== undefined && filter.value !== '') {
        const val = parseFloat(filter.value);
        if (!isNaN(val)) {
          filtered = filtered.filter(r => {
            const rVal = parseFloat(r[key]);
            if (isNaN(rVal)) return false;
            if (filter.operator === 'gt') return rVal > val;
            if (filter.operator === 'gte') return rVal >= val;
            if (filter.operator === 'lt') return rVal < val;
            if (filter.operator === 'lte') return rVal <= val;
            return Math.abs(rVal - val) < 0.5;
          });
        }
      }
    });

    return filtered;
  }, [records, filterConfig]);

  const stats = calculateStats(filteredRecords);
  const dateRangeString = filterConfig.dateMode === 'all' ? 'All Time Telemetry' : getDateRangeString(filteredRecords);

  // Performance Highlights
  const highlights = useMemo(() => {
    if (filteredRecords.length === 0) return { bestMileage: 0, furthestTrip: 0, lowestCost: 0 };
    const mileages = filteredRecords.map(r => parseFloat(r.mileage) || 0);
    const trips = filteredRecords.map(r => parseFloat(r.totalDriven) || 0);
    const costs = filteredRecords.map(r => parseFloat(r.ratePerKm) || 0).filter(c => c > 0);
    
    return {
      bestMileage: Math.max(...mileages, 0).toFixed(1),
      furthestTrip: Math.max(...trips, 0).toFixed(0),
      lowestCost: costs.length > 0 ? Math.min(...costs).toFixed(2) : '0.00'
    };
  }, [filteredRecords]);

  // Monthly Aggregated Data for Charts
  const monthlyData = useMemo(() => {
    const map = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    filteredRecords.forEach(r => {
      const d = parseLocalDate(r.date);
      const key = `${months[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
      if (!map[key]) {
        map[key] = { label: key, totalAmount: 0, totalDriven: 0, totalFuel: 0, count: 0 };
      }
      map[key].totalAmount += (parseFloat(r.amount) || 0);
      map[key].totalDriven += (parseFloat(r.totalDriven) || 0);
      map[key].totalFuel += (parseFloat(r.quantity) || 0);
      map[key].count += 1;
    });

    return Object.values(map).map(m => ({
      ...m,
      avgMileage: m.totalFuel > 0 ? (m.totalDriven / m.totalFuel).toFixed(1) : '0.0'
    }));
  }, [filteredRecords]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGeneratingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: '#090d16',
        scale: 2
      });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGeneratingImage(false);
          return;
        }
        const file = new File([blob], 'bike-telemetry-report.jpg', { type: 'image/jpeg' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `${userProfile.name}'s Apex Telemetry Report`,
              text: `Check out my bike fuel efficiency report! Reg: ${userProfile.regNumber}`,
              files: [file]
            });
          } catch (err) {
            if (err.name !== 'AbortError') {
              const link = document.createElement('a');
              link.href = canvas.toDataURL('image/jpeg');
              link.download = 'bike-telemetry-report.jpg';
              link.click();
            }
          }
        } else {
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/jpeg');
          link.download = 'bike-telemetry-report.jpg';
          link.click();
        }
        setIsGeneratingImage(false);
      }, 'image/jpeg', 0.95);
    } catch (e) {
      console.error("Share failed", e);
      setIsGeneratingImage(false);
      alert("Failed to export image.");
    }
  };

  // SVG Chart rendering helpers
  const maxMileage = Math.max(...monthlyData.map(m => parseFloat(m.avgMileage) || 0), 60);
  const maxExpense = Math.max(...monthlyData.map(m => m.totalAmount || 0), 1000);

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 animate-in slide-in-from-right duration-300 overflow-y-auto">
      
      {/* Header */}
      <div className="glass-panel-glow border-b border-slate-200 dark:border-white/10 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 rounded-2xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10"
            title="Return to Cockpit"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={20} className="text-cyan-600 dark:text-cyan-400" />
              Telemetry Analytics & Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block font-medium">
              Performance trajectories, fuel consumption patterns & shareable telemetry cards
            </p>
          </div>
        </div>

        <button 
          onClick={handleShare} 
          disabled={isGeneratingImage}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
        >
          <Share2 size={16} />
          <span>{isGeneratingImage ? 'Exporting...' : 'Export Card'}</span>
        </button>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 pb-16">
        
        {/* Filter Toolbar */}
        <div className="glass-panel rounded-3xl p-3 md:p-5 border border-slate-200/80 dark:border-white/10 shadow-lg">
          <FilterBar config={filterConfig} onChange={onFilterChange} availableYears={availableYears} showSort={false} />
        </div>

        {/* Telemetry Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 flex items-center gap-3.5 shadow-xs">
            <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Award size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Peak Mileage Record</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{highlights.bestMileage} <span className="text-xs font-normal text-slate-400">km/L</span></p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-cyan-500/30 flex items-center gap-3.5 shadow-xs">
            <div className="p-3 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Compass size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Longest Refill Leg</p>
              <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{highlights.furthestTrip} <span className="text-xs font-normal text-slate-400">km</span></p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-purple-500/30 flex items-center gap-3.5 shadow-xs">
            <div className="p-3 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-xl">
              <Zap size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Best Running Cost</p>
              <p className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">₹{highlights.lowestCost} <span className="text-xs font-normal text-slate-400">/ km</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (7 Cols): Interactive Charts & Aggregates */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Visual Performance Chart */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500 dark:text-emerald-400" />
                    Historical Telemetry Trajectory
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Month-by-month trends derived from verified refill logs</p>
                </div>

                {/* Tab Switcher: Mileage vs Expenses */}
                <div className="bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-white/10 flex items-center text-xs self-start">
                  <button
                    onClick={() => setActiveChartTab('mileage')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeChartTab === 'mileage' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Mileage (km/L)
                  </button>
                  <button
                    onClick={() => setActiveChartTab('spending')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeChartTab === 'spending' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Expenses (₹)
                  </button>
                </div>
              </div>

              {/* Chart Canvas */}
              {monthlyData.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 size={36} className="opacity-40 mb-2" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No chart data available for this range</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Log more refills to unlock visual graphs.</p>
                </div>
              ) : activeChartTab === 'mileage' ? (
                /* Mileage Line/Point Chart */
                <div className="space-y-4">
                  <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 px-2 overflow-x-auto">
                    {monthlyData.map((m, idx) => {
                      const val = parseFloat(m.avgMileage) || 0;
                      const heightPercent = Math.min(Math.max((val / maxMileage) * 100, 10), 100);
                      return (
                        <div key={idx} className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end group">
                          {/* Value pill on hover or default */}
                          <span className="text-[11px] font-mono font-black text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform">
                            {val}
                          </span>
                          
                          {/* Bar / Column */}
                          <div className="w-full max-w-[28px] bg-slate-200 dark:bg-slate-800 rounded-t-xl overflow-hidden relative" style={{ height: `${heightPercent}%` }}>
                            <div className="w-full h-full bg-gradient-to-t from-emerald-600/60 to-emerald-400 rounded-t-xl group-hover:brightness-125 transition-all"></div>
                          </div>

                          {/* Month Label */}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-2 truncate w-full text-center">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Spending Bar Chart */
                <div className="space-y-4">
                  <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 px-2 overflow-x-auto">
                    {monthlyData.map((m, idx) => {
                      const heightPercent = Math.min(Math.max((m.totalAmount / maxExpense) * 100, 10), 100);
                      return (
                        <div key={idx} className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end group">
                          {/* Amount */}
                          <span className="text-[11px] font-mono font-black text-cyan-600 dark:text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform">
                            ₹{m.totalAmount.toFixed(0)}
                          </span>

                          <div className="w-full max-w-[28px] bg-slate-200 dark:bg-slate-800 rounded-t-xl overflow-hidden relative" style={{ height: `${heightPercent}%` }}>
                            <div className="w-full h-full bg-gradient-to-t from-cyan-600/60 to-cyan-400 rounded-t-xl group-hover:brightness-125 transition-all"></div>
                          </div>

                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-2 truncate w-full text-center">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Link to Detailed Records */}
            <button
              onClick={onNavigateList}
              className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white py-4 rounded-2xl font-bold border border-slate-200 dark:border-white/10 active:scale-[0.98] transition-all text-sm shadow-xs"
            >
              <List size={18} className="text-emerald-500 dark:text-emerald-400" />
              Open Detailed Data Grid & Records Table
            </button>

          </div>

          {/* Right Column (5 Cols): Holographic Shareable Telemetry Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full mb-2 flex items-center justify-between text-xs text-slate-400 font-bold px-1">
              <span className="flex items-center gap-1.5 text-emerald-400"><Sparkles size={14} /> Telemetry Pass Preview</span>
              <span>{filteredRecords.length} records active</span>
            </div>

            {/* Visual Telemetry Card (Captured by html2canvas) */}
            <div 
              ref={cardRef}
              className="w-full max-w-[420px] bg-[#0c121e] text-white p-6 md:p-7 rounded-3xl shadow-2xl border-2 border-slate-700/80 relative overflow-hidden ring-1 ring-white/10"
            >
              {/* Background gradient & mesh */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-500/20 via-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

              {/* Rider and License Plate */}
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-16 h-16 rounded-2xl border-2 border-emerald-400/60 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} className="w-full h-full object-cover" alt="Profile"/>
                  ) : (
                    <User size={30} className="text-emerald-400"/>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">{userProfile.name || 'Apex Rider'}</h3>
                  
                  {/* Plate */}
                  <div className="mt-1 inline-flex items-center">
                    <div className="license-plate px-2.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1.5">
                      <span className="text-[8px] font-bold text-blue-800 pr-1 border-r border-slate-300">IND</span>
                      <span>{userProfile.regNumber || 'MH • 12 • 2026'}</span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-[10px] font-mono mt-1.5 tracking-wider">{dateRangeString}</p>
                </div>
              </div>

              {/* Telemetry Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-6 relative z-10 font-mono">
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 font-sans">Total Spent</p>
                  <p className="text-xl font-black text-emerald-400">₹{stats.totalAmount.toFixed(0)}</p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 font-sans">Distance</p>
                  <p className="text-xl font-black text-cyan-400">{stats.totalDriven.toFixed(0)} <span className="text-xs text-slate-500">km</span></p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 font-sans">Avg Mileage</p>
                  <p className="text-xl font-black text-amber-400">{stats.avgMileage.toFixed(1)} <span className="text-xs text-slate-500">km/L</span></p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 font-sans">Running Cost</p>
                  <p className="text-xl font-black text-purple-400">₹{stats.avgRatePerKm.toFixed(2)} <span className="text-xs text-slate-500">/km</span></p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 font-sans">Fuel Burned</p>
                  <p className="text-xl font-black text-white">{stats.totalQuantity.toFixed(1)} <span className="text-xs text-slate-500">L</span></p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 font-sans">Refill Logs</p>
                  <p className="text-xl font-black text-white">{stats.count} <span className="text-xs text-slate-500">entries</span></p>
                </div>
              </div>

              {/* Watermark Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-white/10 text-[10px] text-slate-500 font-mono">
                <span className="uppercase tracking-widest font-black text-emerald-400 flex items-center gap-1">
                  <Fuel size={12} /> APEX BIKE TELEMETRY
                </span>
                <span className="text-slate-400">VERIFIED DATA</span>
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleShare}
              disabled={isGeneratingImage}
              className="mt-3.5 w-full max-w-[420px] py-3 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-colors"
            >
              <Download size={15} className="text-emerald-400" /> Save Telemetry Pass to Gallery
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default HistoryReport;
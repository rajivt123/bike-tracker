// src/screens/HistoryReport.jsx
import React, { useRef, useMemo } from 'react';
import { ArrowLeft, Share2, User, List } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import StatCard from '../components/StatCard';
import { calculateStats, getDateRangeString } from '../utils/helpers';

const HistoryReport = ({ records, filterConfig, onFilterChange, onNavigateList, onBack, userProfile }) => {
  const cardRef = useRef(null);
  
  const availableYears = useMemo(() => {
    const years = new Set(records.map(r => new Date(r.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    let filtered = [...records];
    const { dateMode, dateRange, year, month, amountFilter, costFilter, mileageFilter } = filterConfig;

    if (dateMode === 'month') {
      filtered = filtered.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
    } else if (dateMode === 'year') {
      filtered = filtered.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === year;
      });
    } else if (dateMode === 'custom') {
      filtered = filtered.filter(r => {
        return r.date >= dateRange.start && r.date <= dateRange.end;
      });
    }

    // Apply Numeric Filters
    [
      { filter: amountFilter, key: 'amount' },
      { filter: costFilter, key: 'ratePerKm' },
      { filter: mileageFilter, key: 'mileage' }
    ].forEach(({ filter, key }) => {
        if (filter.value) {
            const val = parseFloat(filter.value);
            if (!isNaN(val)) {
                filtered = filtered.filter(r => {
                    const rVal = parseFloat(r[key]);
                    if (filter.operator === 'gt') return rVal > val;
                    if (filter.operator === 'lt') return rVal < val;
                    return Math.abs(rVal - val) < 0.01;
                });
            }
        }
    });

    return filtered;
  }, [records, filterConfig]);

  const stats = calculateStats(filteredRecords);
  const dateRangeString = filterConfig.dateMode === 'all' ? 'All Time Report' : getDateRangeString(filteredRecords);

  const handleShare = async () => {
    if (!cardRef.current || !window.html2canvas) {
      alert("Sharing module loading...");
      return;
    }
    try {
      const canvas = await window.html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'bike-report.jpg', { type: 'image/jpeg' });
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${userProfile.name}'s Bike Report`,
              text: `Check out my bike mileage report! Reg: ${userProfile.regNumber}`,
              files: [file]
            });
          } catch (err) {
            if (err.name !== 'AbortError') {
              const link = document.createElement('a');
              link.href = canvas.toDataURL('image/jpeg');
              link.download = 'bike-report.jpg';
              link.click();
            }
          }
        } else {
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/jpeg');
          link.download = 'bike-report.jpg';
          link.click();
        }
      }, 'image/jpeg');
    } catch (e) {
      console.error("Share failed", e);
      alert("Failed to generate image.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-500">
      <div className="bg-white border-b border-slate-100 p-4 pt-10 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold text-lg text-slate-800">History & Reports</h2>
        </div>
        <button onClick={handleShare} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">
          <Share2 size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <FilterBar config={filterConfig} onChange={onFilterChange} availableYears={availableYears} showSort={false} />
        </div>

        {/* Hidden Card for Screenshot */}
        <div className="fixed -left-[9999px] top-0 w-[450px] bg-slate-900 text-white p-8 rounded-3xl" ref={cardRef}>
          <div className="flex items-center gap-5 mb-8">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
              {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" alt="Profile"/> : <User size={40} className="text-emerald-400"/>}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">{userProfile.name}</h2>
              <p className="text-emerald-400 font-mono tracking-wider text-sm mb-1">{userProfile.regNumber}</p>
              <p className="text-slate-400 text-xs font-medium bg-slate-800 px-2 py-1 rounded inline-block">{dateRangeString}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-emerald-400">₹{stats.totalAmount.toFixed(0)}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Driven</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalDriven.toFixed(0)} <span className="text-sm font-normal text-slate-500">km</span></p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Mileage</p>
              <p className="text-2xl font-bold text-orange-400">{stats.avgMileage.toFixed(1)} <span className="text-sm font-normal text-slate-500">km/L</span></p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Cost Efficiency</p>
              <p className="text-2xl font-bold text-purple-400">₹{stats.avgRatePerKm.toFixed(2)} <span className="text-sm font-normal text-slate-500">/km</span></p>
            </div>
             <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Fuel</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.totalQuantity.toFixed(1)} <span className="text-sm font-normal text-slate-500">L</span></p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Records</p>
                <p className="text-2xl font-bold text-white">{stats.count}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Bike Tracker Report</p>
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Amount" value={`₹${stats.totalAmount.toFixed(0)}`} colorClass="bg-emerald-50 border-emerald-100 text-emerald-700" valueClass="text-emerald-700" />
          <StatCard label="Total Driven" value={`${stats.totalDriven.toFixed(0)}`} sub="km" colorClass="bg-blue-50 border-blue-100 text-blue-700" valueClass="text-blue-700" />
          <StatCard label="Avg Mileage" value={stats.avgMileage.toFixed(1)} sub="km/L" colorClass="bg-orange-50 border-orange-100 text-orange-700" valueClass="text-orange-700" />
          <StatCard label="Cost / Km" value={`₹${stats.avgRatePerKm.toFixed(2)}`} colorClass="bg-purple-50 border-purple-100 text-purple-700" valueClass="text-purple-700" />
          <StatCard label="Total Fuel" value={`${stats.totalQuantity.toFixed(1)}`} sub="L" colorClass="bg-cyan-50 border-cyan-100 text-cyan-700" valueClass="text-cyan-700" />
          <StatCard label="Records" value={stats.count} colorClass="bg-slate-50 border-slate-100 text-slate-700" valueClass="text-slate-700" />
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <button
          onClick={onNavigateList}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-all"
        >
          <List size={20} />
          View Detailed List
        </button>
      </div>
    </div>
  );
};

export default HistoryReport;
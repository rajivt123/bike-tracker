import React, { useState } from 'react';
import { Sliders, ArrowUpDown, IndianRupee, Activity, TrendingUp, XCircle } from 'lucide-react';

const NumericFilterInput = ({ label, filterKey, icon: Icon, colorClass, config, handleNumericChange }) => (
  <div className={`p-2 rounded-xl border ${colorClass} space-y-1`}>
    <div className="flex items-center gap-1 text-[10px] font-bold uppercase opacity-80 mb-1">
      <Icon size={10} /> {label}
    </div>
    <div className="flex gap-1 font-mono">
      <select
        value={config[filterKey].operator}
        onChange={(e) => handleNumericChange(filterKey, 'operator', e.target.value)}
        className="w-16 p-1 rounded-lg border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-950 outline-none"
      >
        <option value="gte">≥</option>
        <option value="lte">≤</option>
        <option value="gt">&gt;</option>
        <option value="lt">&lt;</option>
        <option value="eq">=</option>
      </select>
      <input
        type="number"
        value={config[filterKey].value}
        onChange={(e) => handleNumericChange(filterKey, 'value', e.target.value)}
        className="flex-1 min-w-0 p-1 pl-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-950"
        placeholder="All"
      />
    </div>
  </div>
);

const FilterBar = ({ config, onChange, availableYears, showSort = true }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDateModeChange = (mode) => {
    onChange({ ...config, dateMode: mode });
  };

  const handleNumericChange = (filterKey, field, value) => {
    onChange({
      ...config,
      [filterKey]: { ...config[filterKey], [field]: value }
    });
  };

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-inner">
      <div className="p-3 border-b border-slate-100 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
            {['all', 'month', 'year', 'custom'].map(mode => (
              <button
                key={mode}
                onClick={() => handleDateModeChange(mode)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${
                  config.dateMode === mode
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 scale-105'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {mode === 'all' ? 'All Dates' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded-xl border transition-colors ${
              showAdvanced
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Toggle Advanced Filters"
          >
            <Sliders size={15} />
          </button>
          
          {showSort && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
              <ArrowUpDown size={12} className="text-emerald-600 dark:text-emerald-400" />
              <select
                value={config.sortBy}
                onChange={(e) => onChange({ ...config, sortBy: e.target.value })}
                className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none w-16"
              >
                <option value="date" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Date</option>
                <option value="amount" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Amt</option>
                <option value="cost" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">C/Km</option>
                <option value="mileage" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Mil</option>
              </select>
            </div>
          )}
        </div>

        {(config.dateMode === 'year' || config.dateMode === 'month') && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 p-2.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Year</label>
              <select
                value={config.year}
                onChange={(e) => onChange({ ...config, year: parseInt(e.target.value) })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">{year}</option>
                ))}
              </select>
            </div>
            {config.dateMode === 'month' && (
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Month</label>
                <select
                  value={config.month}
                  onChange={(e) => onChange({ ...config, month: parseInt(e.target.value) })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {config.dateMode === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 p-2.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5">
            <input
              type="date"
              value={config.dateRange.start}
              onChange={e => onChange({ ...config, dateRange: { ...config.dateRange, start: e.target.value } })}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none"
            />
            <span className="text-slate-400 dark:text-slate-500 font-mono">→</span>
            <input
              type="date"
              value={config.dateRange.end}
              onChange={e => onChange({ ...config, dateRange: { ...config.dateRange, end: e.target.value } })}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none"
            />
          </div>
        )}
      </div>

      {showAdvanced && (
        <div className="p-3 bg-slate-50/80 dark:bg-slate-950/60 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 border-t border-slate-200 dark:border-white/5">
          <NumericFilterInput
            label="Amount (₹)"
            filterKey="amountFilter"
            icon={IndianRupee}
            colorClass="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            config={config}
            handleNumericChange={handleNumericChange}
          />
          <NumericFilterInput
            label="Mileage (km/L)"
            filterKey="mileageFilter"
            icon={Activity}
            colorClass="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
            config={config}
            handleNumericChange={handleNumericChange}
          />
          <NumericFilterInput
            label="Cost (₹/km)"
            filterKey="costFilter"
            icon={TrendingUp}
            colorClass="bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
            config={config}
            handleNumericChange={handleNumericChange}
          />
          <div className="flex items-end">
            <button
              onClick={() => onChange({
                ...config,
                amountFilter: { operator: 'eq', value: '' },
                costFilter: { operator: 'eq', value: '' },
                mileageFilter: { operator: 'eq', value: '' }
              })}
              className="w-full p-2 h-[58px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
            >
              <XCircle size={14} />
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
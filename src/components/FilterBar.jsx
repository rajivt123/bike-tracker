import React, { useState } from 'react';
import { Sliders, ArrowUpDown, IndianRupee, Activity, TrendingUp, XCircle } from 'lucide-react';

const NumericFilterInput = ({ label, filterKey, icon: Icon, colorClass, config, handleNumericChange }) => (
  <div className={`p-2 rounded-xl border ${colorClass} space-y-1`}>
    <div className="flex items-center gap-1 text-[10px] font-bold uppercase opacity-70 mb-1">
      <Icon size={10} /> {label}
    </div>
    <div className="flex gap-1">
      <select
        value={config[filterKey].operator}
        onChange={(e) => handleNumericChange(filterKey, 'operator', e.target.value)}
        className="w-16 p-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 bg-white"
      >
        <option value="eq">=</option>
        <option value="gt">&gt;</option>
        <option value="lt">&lt;</option>
      </select>
      <input
        type="number"
        value={config[filterKey].value}
        onChange={(e) => handleNumericChange(filterKey, 'value', e.target.value)}
        className="flex-1 min-w-0 p-1 pl-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 outline-none bg-white"
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-3 border-b border-slate-50 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
            {['all', 'month', 'year', 'custom'].map(mode => (
              <button
                key={mode}
                onClick={() => handleDateModeChange(mode)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border ${
                  config.dateMode === mode
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {mode === 'all' ? 'All Dates' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-1.5 rounded-lg border transition-colors ${showAdvanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}
          >
            <Sliders size={16} />
          </button>
          {showSort && (
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 shrink-0">
              <ArrowUpDown size={12} className="text-slate-400" />
              <select
                value={config.sortBy}
                onChange={(e) => onChange({ ...config, sortBy: e.target.value })}
                className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-16"
              >
                <option value="date">Date</option>
                <option value="amount">Amt</option>
                <option value="cost">C/Km</option>
                <option value="mileage">Mil</option>
              </select>
            </div>
          )}
        </div>
        {(config.dateMode === 'year' || config.dateMode === 'month') && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Year</label>
              <select
                value={config.year}
                onChange={(e) => onChange({ ...config, year: parseInt(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {config.dateMode === 'month' && (
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Month</label>
                <select
                  value={config.month}
                  onChange={(e) => onChange({ ...config, month: parseInt(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        {config.dateMode === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
            <input
              type="date"
              value={config.dateRange.start}
              onChange={e => onChange({ ...config, dateRange: { ...config.dateRange, start: e.target.value } })}
              className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={config.dateRange.end}
              onChange={e => onChange({ ...config, dateRange: { ...config.dateRange, end: e.target.value } })}
              className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
            />
          </div>
        )}
      </div>
      {showAdvanced && (
        <div className="p-3 bg-slate-50/50 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
          <NumericFilterInput
            label="Amount (₹)"
            filterKey="amountFilter"
            icon={IndianRupee}
            colorClass="bg-emerald-50/50 border-emerald-100 text-emerald-800"
            config={config}
            handleNumericChange={handleNumericChange}
          />
          <NumericFilterInput
            label="Mileage (km/L)"
            filterKey="mileageFilter"
            icon={Activity}
            colorClass="bg-orange-50/50 border-orange-100 text-orange-800"
            config={config}
            handleNumericChange={handleNumericChange}
          />
          <NumericFilterInput
            label="Cost (₹/km)"
            filterKey="costFilter"
            icon={TrendingUp}
            colorClass="bg-purple-50/50 border-purple-100 text-purple-800"
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
              className="w-full p-2 h-[58px] rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 text-xs font-bold transition-colors flex flex-col items-center justify-center gap-1"
            >
              <XCircle size={14} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
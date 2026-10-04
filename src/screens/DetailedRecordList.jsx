import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileSpreadsheet, File as FileIcon, Download, Upload, ArrowLeft, Filter, Eye, Edit3, TableProperties } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import FilterBar from '../components/FilterBar';
import RecordDetails from '../components/RecordDetails';
import { calculateStats, getDateRangeString, parseLocalDate } from '../utils/helpers';
import { useAppData } from '../context/AppDataContext';

const DetailedRecordList = ({ records, filterConfig, onFilterChange, onBack, onEdit, onImport, userProfile }) => {
  const { refreshFuelRecords } = useAppData();
  const [viewingRecord, setViewingRecord] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const rootRef = useRef(null);

  // Refresh fuel records from Supabase on entry to prevent stale records state
  useEffect(() => {
    if (refreshFuelRecords) {
      refreshFuelRecords();
    }
  }, [refreshFuelRecords]);

  // Ensure list starts at the top (scrollTop = 0) immediately on component mount
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        if (typeof containerRef.current.scrollTo === 'function') {
          containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      }
      if (rootRef.current) {
        rootRef.current.scrollTop = 0;
        let el = rootRef.current.parentElement;
        while (el) {
          if (el.scrollTop > 0) {
            el.scrollTop = 0;
          }
          el = el.parentElement;
        }
      }
    };
    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);
    const timerId = setTimeout(scrollToTop, 50);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, []);

  // Reset scroll position to top whenever records or filters change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      if (typeof containerRef.current.scrollTo === 'function') {
        containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [records, filterConfig?.dateMode, filterConfig?.sortBy]);

  const availableYears = useMemo(() => {
    const years = new Set(records.map(r => parseLocalDate(r.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    let filtered = [...records];
    const { dateMode, sortBy, dateRange, year, month, amountFilter, costFilter, mileageFilter } = filterConfig;
    
    // Date Filtering
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

    // Numeric Filtering
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

    return filtered.sort((a, b) => {
      if (sortBy === 'amount') return parseFloat(b.amount) - parseFloat(a.amount);
      if (sortBy === 'cost') return parseFloat(b.ratePerKm) - parseFloat(a.ratePerKm);
      if (sortBy === 'mileage') return parseFloat(b.mileage) - parseFloat(a.mileage);
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const timeDiff = new Date(b.refill_at || b.date).getTime() - new Date(a.refill_at || a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      const odoDiff = (parseFloat(b.current_reserve_odometer ?? b.newReading) || 0) - (parseFloat(a.current_reserve_odometer ?? a.newReading) || 0);
      if (odoDiff !== 0) return odoDiff;
      return (b.id && a.id) ? String(b.id).localeCompare(String(a.id)) : 0;
    });
  }, [records, filterConfig]);

  const handleExport = (type) => {
    if (filteredRecords.length === 0) {
      alert("No records to export.");
      return;
    }

    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(filteredRecords.map(r => ({
        Date: r.date,
        Amount: r.amount,
        Rate: r.rate,
        Quantity: r.quantity,
        OldReading: r.oldReading,
        NewReading: r.newReading,
        TotalDriven: r.totalDriven,
        Mileage: r.mileage,
        CostPerKm: r.ratePerKm
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");
      XLSX.writeFile(wb, `Bike_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (type === 'pdf') {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text(`${userProfile.name || 'Rider'}'s Bike Report`, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Reg Number: ${userProfile.regNumber || 'N/A'}`, 14, 26);
      doc.text(`Period: ${filterConfig.dateMode === 'all' ? 'All Time' : getDateRangeString(filteredRecords)}`, 14, 32);

      const stats = calculateStats(filteredRecords);
      const startY = 38;
      const boxHeight = 22;

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, startY, 182, boxHeight, 3, 3, 'FD');

      const addSummaryItem = (label, val, x) => {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(label, x, startY + 7);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(val.toString(), x, startY + 16);
      };

      addSummaryItem("AMOUNT", `Rs. ${stats.totalAmount.toFixed(0)}`, 18);
      addSummaryItem("DRIVEN", `${stats.totalDriven.toFixed(0)} km`, 50);
      addSummaryItem("MILEAGE", `${stats.avgMileage.toFixed(1)} km/L`, 82);
      addSummaryItem("COST/KM", `Rs. ${stats.avgRatePerKm.toFixed(2)}`, 118);
      addSummaryItem("FUEL", `${stats.totalQuantity.toFixed(1)} L`, 150);
      addSummaryItem("LOGS", `${stats.count}`, 178);

      const tableData = filteredRecords.map(r => [
        r.date, `Rs.${r.amount}`, `${r.quantity} L`, `${r.totalDriven} km`, `${r.mileage} km/L`, `Rs.${r.ratePerKm}`, `${r.oldReading} - ${r.newReading}`
      ]);
      
      autoTable(doc, {
        head: [['Date', 'Amount', 'Fuel', 'Distance', 'Mileage', 'Cost/Km', 'Odometer']],
        body: tableData,
        startY: startY + boxHeight + 8,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save(`Bike_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
    setShowExportMenu(false);
  };

  return (
    <div ref={rootRef} className="flex flex-col h-full bg-[#090d16] text-slate-100 animate-in slide-in-from-right duration-300 relative overflow-hidden">
      {viewingRecord && (
        <RecordDetails
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEdit={onEdit}
          userProfile={userProfile}
        />
      )}

      {/* Header */}
      <div className="glass-panel-glow border-b border-slate-200 dark:border-white/10 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 rounded-2xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <TableProperties size={20} className="text-emerald-500 dark:text-emerald-400" />
              Telemetry Logs & Records Data
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block font-medium">
              Inspect individual refill legs, compare efficiencies, or export spreadsheet datasets
            </p>
          </div>
        </div>

        {/* Hidden File Input for Import */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => { 
            if (e.target.files?.[0] && onImport) { 
              onImport(e.target.files[0]); 
            } 
            e.target.value = ''; 
          }} 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
        />

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {onImport && (
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
              title="Import records from Excel or CSV file"
            >
              <Upload size={15} /> Import Excel / CSV
            </button>
          )}
          <button 
            onClick={() => handleExport('excel')} 
            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet size={15} /> Export Excel (.xlsx)
          </button>
          <button 
            onClick={() => handleExport('pdf')} 
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <FileIcon size={15} /> Export PDF Report
          </button>
        </div>

        {/* Mobile Actions Menu Trigger */}
        <div className="md:hidden relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)} 
            className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            title="Import & Export Options"
          >
            <Download size={18} />
          </button>
          {showExportMenu && (
            <div className="absolute top-12 right-0 glass-panel-glow shadow-2xl border border-slate-200 dark:border-white/15 rounded-2xl z-30 p-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100">
              {onImport && (
                <button 
                  onClick={() => { setShowExportMenu(false); fileInputRef.current?.click(); }} 
                  className="w-full text-left px-3 py-2.5 hover:bg-cyan-500/10 rounded-xl flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-300"
                >
                  <Upload size={16}/> Import Excel / CSV
                </button>
              )}
              <button 
                onClick={() => handleExport('excel')} 
                className="w-full text-left px-3 py-2.5 hover:bg-emerald-500/10 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-300"
              >
                <FileSpreadsheet size={16}/> Export Excel
              </button>
              <button 
                onClick={() => handleExport('pdf')} 
                className="w-full text-left px-3 py-2.5 hover:bg-rose-500/10 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-300"
              >
                <FileIcon size={16}/> Export PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3 md:p-8 max-w-6xl mx-auto w-full">
        {/* Filter Bar */}
        <div className="glass-panel rounded-3xl p-3 md:p-5 border border-slate-200/80 dark:border-white/10 shadow-lg mb-4">
          <FilterBar config={filterConfig} onChange={onFilterChange} availableYears={availableYears} />
        </div>

        {/* Counter and info */}
        <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono flex justify-between items-center">
          <span>Active Filter: <strong className="text-emerald-600 dark:text-emerald-400">{filteredRecords.length}</strong> record(s)</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">Tap any record to inspect full telemetry breakdown</span>
        </div>

        {/* Container for Responsive Views */}
        <div ref={containerRef} className="flex-1 overflow-auto glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Filter size={36} className="mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No records match this query</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try resetting filters or adjusting the date range.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP DATA TABLE (Visible on md:) */}
              <div className="hidden md:block">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-white/10 sticky top-0 z-10 font-bold backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4 text-emerald-600 dark:text-emerald-400">Amount</th>
                      <th className="px-5 py-4">Fuel Vol</th>
                      <th className="px-5 py-4 text-cyan-600 dark:text-cyan-400">Distance</th>
                      <th className="px-5 py-4 text-amber-600 dark:text-amber-400">Mileage</th>
                      <th className="px-5 py-4 text-purple-600 dark:text-purple-400">Cost / Km</th>
                      <th className="px-5 py-4 text-slate-500 dark:text-slate-400">Odometer Span</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 font-mono">
                    {filteredRecords.map((record) => {
                      const m = parseFloat(record.mileage) || 0;
                      const mileageChipClass = m >= 50 
                        ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40' 
                        : m >= 40 
                          ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 dark:border-cyan-500/40' 
                          : 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40';

                      return (
                        <tr
                          key={record.id}
                          onClick={() => setViewingRecord(record)}
                          className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-4 text-slate-800 dark:text-slate-200 font-sans">
                            <div className="font-bold">{record.date}</div>
                          </td>
                          <td className="px-5 py-4 font-black text-emerald-600 dark:text-emerald-400">₹{record.amount}</td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{record.quantity} <span className="text-xs text-slate-400">L</span></td>
                          <td className="px-5 py-4 font-black text-cyan-600 dark:text-cyan-400">+{record.totalDriven} <span className="text-xs text-slate-400">km</span></td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${mileageChipClass}`}>
                              {record.mileage} km/L
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-purple-600 dark:text-purple-400">₹{record.ratePerKm}</td>
                          <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                            <span className="bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                              {record.oldReading} ➔ {record.newReading}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setViewingRecord(record)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors border border-slate-200 dark:border-transparent"
                                title="Inspect Telemetry"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => onEdit(record)}
                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors border border-emerald-500/20"
                                title="Edit Record"
                              >
                                <Edit3 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD LIST (Visible on < md:) */}
              <div className="md:hidden p-3 space-y-3">
                {filteredRecords.map((record) => {
                  const m = parseFloat(record.mileage) || 0;
                  const mileageChipClass = m >= 50 
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40' 
                    : m >= 40 
                      ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 dark:border-cyan-500/40' 
                      : 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40';

                  return (
                    <div
                      key={record.id}
                      onClick={() => setViewingRecord(record)}
                      className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 active:scale-[0.99] transition-all space-y-3 shadow-xs"
                    >
                      {/* Top Row: Date & Amount */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{record.date}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({record.quantity} L)</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">₹{record.amount}</span>
                      </div>

                      {/* Middle Row: Odometer & Distance */}
                      <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <span>{record.oldReading} ➔ {record.newReading}</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold">+{record.totalDriven} km</span>
                      </div>

                      {/* Bottom Row: Mileage Badge & Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border font-mono ${mileageChipClass}`}>
                          {record.mileage} km/L
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs font-mono text-purple-600 dark:text-purple-400 mr-2 font-bold">₹{record.ratePerKm}/km</span>
                          <button
                            onClick={() => onEdit(record)}
                            className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailedRecordList;
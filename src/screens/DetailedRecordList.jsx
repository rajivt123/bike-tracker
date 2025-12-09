// src/screens/DetailedRecordList.jsx
import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, File as FileIcon, Download, ArrowLeft, Filter } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import RecordDetails from '../components/RecordDetails';
import { calculateStats, getDateRangeString } from '../utils/helpers';

const DetailedRecordList = ({ records, filterConfig, onFilterChange, onBack, onEdit, userProfile }) => {
  const [viewingRecord, setViewingRecord] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set(records.map(r => new Date(r.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    let filtered = [...records];
    const { dateMode, sortBy, dateRange, year, month, amountFilter, costFilter, mileageFilter } = filterConfig;
    
    // Date Filtering
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

    // Numeric Filtering (Simplified logic for brevity, matches HistoryReport)
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

    return filtered.sort((a, b) => {
      if (sortBy === 'amount') return parseFloat(b.amount) - parseFloat(a.amount);
      if (sortBy === 'cost') return parseFloat(b.ratePerKm) - parseFloat(a.ratePerKm);
      if (sortBy === 'mileage') return parseFloat(b.mileage) - parseFloat(a.mileage);
      return new Date(b.date) - new Date(a.date);
    });
  }, [records, filterConfig]);

  const handleExport = (type) => {
    if (type === 'excel') {
      if (!window.XLSX) { alert("Excel library loading..."); return; }
      const ws = window.XLSX.utils.json_to_sheet(filteredRecords.map(r => ({
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
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Records");
      window.XLSX.writeFile(wb, `Bike_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (type === 'pdf') {
      if (!window.jspdf) { alert("PDF library loading..."); return; }
      const doc = new window.jspdf.jsPDF();

      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text(`${userProfile.name}'s Report`, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Reg: ${userProfile.regNumber}`, 14, 26);
      doc.text(`Period: ${filterConfig.dateMode === 'all' ? 'All Time' : getDateRangeString(filteredRecords)}`, 14, 32);

      const stats = calculateStats(filteredRecords);
      const startY = 40;
      const boxHeight = 25;

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, startY, 182, boxHeight, 3, 3, 'FD');
      const addSummaryItem = (label, val, x) => {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(label, x, startY + 8);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(val.toString(), x, startY + 18);
      };
      addSummaryItem("AMOUNT", `Rs.${stats.totalAmount.toFixed(0)}`, 20);
      addSummaryItem("DRIVEN", `${stats.totalDriven.toFixed(0)} km`, 50);
      addSummaryItem("MILEAGE", `${stats.avgMileage.toFixed(1)}`, 80);
      addSummaryItem("COST/KM", `${stats.avgRatePerKm.toFixed(2)}`, 110);
      addSummaryItem("FUEL (L)", `${stats.totalQuantity.toFixed(1)}`, 140);
      addSummaryItem("RECORDS", `${stats.count}`, 170);

      const tableData = filteredRecords.map(r => [
        r.date, r.amount, r.quantity, r.totalDriven, r.mileage, r.ratePerKm
      ]);
      
      if(doc.autoTable) {
        doc.autoTable({
            head: [['Date', 'Amt', 'Fuel(L)', 'Km', 'Mil', 'C/Km']],
            body: tableData,
            startY: startY + boxHeight + 10,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 9 }
        });
        doc.save(`Bike_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
          alert("PDF AutoTable plugin not loaded yet.");
      }
    }
    setShowExportMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-500 relative">
      {viewingRecord && (
        <RecordDetails
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEdit={onEdit}
          userProfile={userProfile}
        />
      )}
      {showExportMenu && (
        <div className="absolute top-16 right-4 bg-white shadow-xl border border-slate-100 rounded-xl z-30 p-2 min-w-[150px] animate-in fade-in zoom-in-95 duration-100">
          <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-sm font-bold text-emerald-700">
            <FileSpreadsheet size={16}/> Export Excel
          </button>
          <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-sm font-bold text-red-700">
            <FileIcon size={16}/> Export PDF
          </button>
        </div>
      )}
      <div className="bg-white border-b border-slate-100 p-4 pt-10 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold text-lg text-slate-800">Detailed List</h2>
        </div>
        <button onClick={() => setShowExportMenu(!showExportMenu)} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">
          <Download size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <FilterBar config={filterConfig} onChange={onFilterChange} availableYears={availableYears} />

        <div className="p-2 bg-slate-50 text-[10px] text-center text-slate-400 font-medium">
          Showing {filteredRecords.length} record(s)
        </div>
        <div className="flex-1 overflow-auto bg-slate-50">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Filter size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No records match this filter</p>
            </div>
          ) : (
            <div className="min-w-max">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold sticky left-0 bg-slate-100 shadow-sm z-10">Date</th>
                    <th className="px-4 py-3 font-bold text-emerald-600">₹Amt</th>
                    <th className="px-4 py-3 font-bold">Liters</th>
                    <th className="px-4 py-3 font-bold text-blue-600">Km</th>
                    <th className="px-4 py-3 font-bold text-orange-600">Mil</th>
                    <th className="px-4 py-3 font-bold text-purple-600">C/Km</th>
                    <th className="px-4 py-3 font-bold text-slate-500">Readings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setViewingRecord(record)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white shadow-sm">
                        {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        <div className="text-[10px] text-slate-400 font-normal">{new Date(record.date).getFullYear()}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{record.amount}</td>
                      <td className="px-4 py-3 text-slate-600">{record.quantity}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{record.totalDriven}</td>
                      <td className="px-4 py-3 font-bold text-orange-500">{record.mileage}</td>
                      <td className="px-4 py-3 font-bold text-purple-500">{record.ratePerKm}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {record.oldReading}-{record.newReading}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailedRecordList;
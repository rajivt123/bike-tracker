// src/screens/CashBookReportsScreen.jsx
import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Landmark,
  Wallet,
  Smartphone,
  CreditCard,
  Building2,
  Car,
  Search,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Layers,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CashBookReportsScreen({ onBack }) {
  const {
    financialAccounts = [],
    cashBookCategories = [],
    cashBookEntries = [],
    vehicles = []
  } = useAppData();

  // ----------------------------------------------------
  // FILTER STATES
  // ----------------------------------------------------
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'income' | 'expense' | 'transfer'
  const [categoryTypeFilter, setCategoryTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ----------------------------------------------------
  // DATE PRESET HANDLER
  // ----------------------------------------------------
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const toISO = (d) => d.toISOString().split('T')[0];

    switch (preset) {
      case 'today': {
        const dStr = toISO(today);
        setStartDate(dStr);
        setEndDate(dStr);
        break;
      }
      case 'this_week': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(today);
        monday.setDate(diff);
        setStartDate(toISO(monday));
        setEndDate(toISO(today));
        break;
      }
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(toISO(start));
        setEndDate(toISO(end));
        break;
      }
      case 'last_month': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(toISO(start));
        setEndDate(toISO(end));
        break;
      }
      case 'this_quarter': {
        const qMonth = Math.floor(today.getMonth() / 3) * 3;
        const start = new Date(today.getFullYear(), qMonth, 1);
        setStartDate(toISO(start));
        setEndDate(toISO(today));
        break;
      }
      case 'this_year': {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear(), 11, 31);
        setStartDate(toISO(start));
        setEndDate(toISO(end));
        break;
      }
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  const handleCustomDateChange = (type, val) => {
    setDatePreset('custom');
    if (type === 'start') setStartDate(val);
    if (type === 'end') setEndDate(val);
  };

  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedAccountId('all');
    setFilterType('all');
    setCategoryTypeFilter('all');
    setSelectedCategory('all');
    setSelectedVehicleId('all');
    setSearchQuery('');
  };

  // ----------------------------------------------------
  // ENTITY LOOKUP MAPS
  // ----------------------------------------------------
  const accountsMap = useMemo(() => {
    const map = {};
    (financialAccounts || []).forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [financialAccounts]);

  const vehiclesMap = useMemo(() => {
    const map = {};
    (vehicles || []).forEach(v => {
      map[v.id] = v;
    });
    return map;
  }, [vehicles]);

  const categoriesMap = useMemo(() => {
    const map = {};
    (cashBookCategories || []).forEach(c => {
      map[c.id] = c;
    });
    return map;
  }, [cashBookCategories]);

  // Available categories for dropdown filter
  const availableCategoriesForFilter = useMemo(() => {
    let cats = [...(cashBookCategories || [])];
    if (categoryTypeFilter !== 'all') {
      cats = cats.filter(c => c.category_type === categoryTypeFilter);
    }
    return cats.sort((a, b) => a.name.localeCompare(b.name));
  }, [cashBookCategories, categoryTypeFilter]);

  // Legacy categories from existing entries
  const legacyCategories = useMemo(() => {
    const masterNames = new Set((cashBookCategories || []).map(c => c.name.toLowerCase()));
    const items = [];
    const seen = new Set();
    (cashBookEntries || []).forEach(e => {
      if (e.category && !e.category_id && !masterNames.has(e.category.toLowerCase())) {
        const type = e.entry_type || 'expense';
        const key = `${type}:${e.category.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            name: e.category,
            type
          });
        }
      }
    });
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [cashBookCategories, cashBookEntries]);

  // ----------------------------------------------------
  // UNIFIED FILTERED DATASET
  // ----------------------------------------------------
  const filteredEntries = useMemo(() => {
    const list = (cashBookEntries || []).filter(entry => {
      // 1. Account Filter
      if (selectedAccountId !== 'all' && entry.account_id !== selectedAccountId) {
        return false;
      }

      // 2. Transaction Type Filter
      if (filterType !== 'all' && entry.entry_type !== filterType) {
        return false;
      }

      // 3. Category Type Filter
      if (categoryTypeFilter !== 'all') {
        if (entry.entry_type !== categoryTypeFilter) return false;
      }

      // 4. Category Filter
      if (selectedCategory !== 'all') {
        if (selectedCategory.startsWith('legacy:')) {
          const parts = selectedCategory.split(':');
          const legType = parts[1];
          const legName = parts[2];
          const eCat = (entry.category || '').toLowerCase();
          const eType = entry.entry_type || 'expense';
          if (!(!entry.category_id && eCat === legName && eType === legType)) {
            return false;
          }
        } else {
          // Master category matching
          const selCatObj = categoriesMap[selectedCategory];
          if (entry.category_id) {
            if (entry.category_id !== selectedCategory) return false;
          } else if (selCatObj) {
            const eCat = (entry.category || '').toLowerCase();
            const eType = entry.entry_type || 'expense';
            if (!(eCat === selCatObj.name.toLowerCase() && eType === selCatObj.category_type)) {
              return false;
            }
          } else {
            return false;
          }
        }
      }

      // 5. Vehicle Filter
      if (selectedVehicleId !== 'all') {
        if (selectedVehicleId === 'unassigned') {
          if (entry.vehicle_id) return false;
        } else if (entry.vehicle_id !== selectedVehicleId) {
          return false;
        }
      }

      // 6. Date Range Filter
      if (startDate && entry.entry_date < startDate) return false;
      if (endDate && entry.entry_date > endDate) return false;

      // 7. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const desc = (entry.description || '').toLowerCase();
        const cat = (entry.category || '').toLowerCase();
        const ref = (entry.reference || '').toLowerCase();
        const nts = (entry.notes || '').toLowerCase();
        const accName = (accountsMap[entry.account_id]?.name || '').toLowerCase();
        const vehName = (vehiclesMap[entry.vehicle_id]?.name || '').toLowerCase();
        if (!desc.includes(q) && !cat.includes(q) && !ref.includes(q) && !nts.includes(q) && !accName.includes(q) && !vehName.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
  }, [
    cashBookEntries,
    selectedAccountId,
    filterType,
    categoryTypeFilter,
    selectedCategory,
    selectedVehicleId,
    startDate,
    endDate,
    searchQuery,
    categoriesMap,
    accountsMap,
    vehiclesMap
  ]);

  // ----------------------------------------------------
  // SECTION 1: EXECUTIVE OVERVIEW (KPI CARDS)
  // ----------------------------------------------------
  const kpis = useMemo(() => {
    let income = 0;
    let incomeCount = 0;
    let expense = 0;
    let expenseCount = 0;
    let transferVolume = 0;
    let transferCount = 0;

    filteredEntries.forEach(entry => {
      const amt = parseFloat(entry.amount) || 0;
      if (entry.entry_type === 'income') {
        income += amt;
        incomeCount += 1;
      } else if (entry.entry_type === 'expense') {
        expense += amt;
        expenseCount += 1;
      } else if (entry.entry_type === 'transfer') {
        // Measure unique transfer volume via 'in' direction to avoid double counting
        if (entry.transfer_direction === 'in') {
          transferVolume += amt;
          transferCount += 1;
        } else if (!entry.transfer_direction) {
          transferVolume += amt / 2;
          transferCount += 0.5;
        }
      }
    });

    const net = income - expense;

    return {
      income,
      incomeCount,
      expense,
      expenseCount,
      net,
      transferVolume,
      transferCount: Math.round(transferCount),
      totalCount: filteredEntries.length
    };
  }, [filteredEntries]);

  // ----------------------------------------------------
  // SECTION 2: CATEGORY BREAKDOWN (INCOME & EXPENSE)
  // ----------------------------------------------------
  const { incomeCategoriesAnalysis, expenseCategoriesAnalysis } = useMemo(() => {
    const incMap = {};
    const expMap = {};

    filteredEntries.forEach(entry => {
      const amt = parseFloat(entry.amount) || 0;
      if (entry.entry_type === 'income') {
        const catObj = entry.category_id ? categoriesMap[entry.category_id] : null;
        const catName = catObj ? catObj.name : (entry.category || 'General Income');
        const icon = catObj?.icon || '💰';
        if (!incMap[catName]) incMap[catName] = { name: catName, icon, total: 0, count: 0 };
        incMap[catName].total += amt;
        incMap[catName].count += 1;
      } else if (entry.entry_type === 'expense') {
        const catObj = entry.category_id ? categoriesMap[entry.category_id] : null;
        const catName = catObj ? catObj.name : (entry.category || 'General Expense');
        const icon = catObj?.icon || '📦';
        if (!expMap[catName]) expMap[catName] = { name: catName, icon, total: 0, count: 0 };
        expMap[catName].total += amt;
        expMap[catName].count += 1;
      }
    });

    const incomeList = Object.values(incMap).map(c => ({
      ...c,
      percentage: kpis.income > 0 ? (c.total / kpis.income) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    const expenseList = Object.values(expMap).map(c => ({
      ...c,
      percentage: kpis.expense > 0 ? (c.total / kpis.expense) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    return {
      incomeCategoriesAnalysis: incomeList,
      expenseCategoriesAnalysis: expenseList
    };
  }, [filteredEntries, categoriesMap, kpis.income, kpis.expense]);

  // ----------------------------------------------------
  // SECTION 3: ACCOUNT CASHFLOW & RECONCILIATION
  // ----------------------------------------------------
  const accountsReconciliation = useMemo(() => {
    const accountsToAnalyze = selectedAccountId === 'all'
      ? (financialAccounts || [])
      : (financialAccounts || []).filter(a => a.id === selectedAccountId);

    const result = accountsToAnalyze.map(account => {
      const initialOpening = parseFloat(account.opening_balance) || 0;

      // Calculate prior transactions before startDate if startDate is defined
      let priorNet = 0;
      if (startDate) {
        (cashBookEntries || []).forEach(e => {
          if (e.account_id === account.id && e.entry_date < startDate) {
            const amt = parseFloat(e.amount) || 0;
            if (e.entry_type === 'income') priorNet += amt;
            else if (e.entry_type === 'expense') priorNet -= amt;
            else if (e.entry_type === 'transfer') {
              if (e.transfer_direction === 'in') priorNet += amt;
              else if (e.transfer_direction === 'out') priorNet -= amt;
            }
          }
        });
      }

      const periodOpeningBalance = initialOpening + priorNet;

      // Period movements from filtered entries for this account
      let periodIncome = 0;
      let periodExpense = 0;
      let periodTransferIn = 0;
      let periodTransferOut = 0;

      filteredEntries.forEach(e => {
        if (e.account_id === account.id) {
          const amt = parseFloat(e.amount) || 0;
          if (e.entry_type === 'income') periodIncome += amt;
          else if (e.entry_type === 'expense') periodExpense += amt;
          else if (e.entry_type === 'transfer') {
            if (e.transfer_direction === 'in') periodTransferIn += amt;
            else if (e.transfer_direction === 'out') periodTransferOut += amt;
          }
        }
      });

      const netChange = (periodIncome + periodTransferIn) - (periodExpense + periodTransferOut);
      const periodClosingBalance = periodOpeningBalance + netChange;

      return {
        id: account.id,
        name: account.name,
        type: account.account_type || 'cash',
        isDefault: account.is_default,
        periodOpeningBalance,
        periodIncome,
        periodTransferIn,
        periodExpense,
        periodTransferOut,
        netChange,
        periodClosingBalance
      };
    });

    const totals = result.reduce((acc, curr) => ({
      periodOpeningBalance: acc.periodOpeningBalance + curr.periodOpeningBalance,
      periodIncome: acc.periodIncome + curr.periodIncome,
      periodTransferIn: acc.periodTransferIn + curr.periodTransferIn,
      periodExpense: acc.periodExpense + curr.periodExpense,
      periodTransferOut: acc.periodTransferOut + curr.periodTransferOut,
      netChange: acc.netChange + curr.netChange,
      periodClosingBalance: acc.periodClosingBalance + curr.periodClosingBalance
    }), {
      periodOpeningBalance: 0,
      periodIncome: 0,
      periodTransferIn: 0,
      periodExpense: 0,
      periodTransferOut: 0,
      netChange: 0,
      periodClosingBalance: 0
    });

    return { accounts: result, totals };
  }, [financialAccounts, selectedAccountId, cashBookEntries, filteredEntries, startDate]);

  // ----------------------------------------------------
  // SECTION 4: VEHICLE EXPENSE ATTRIBUTION
  // ----------------------------------------------------
  const vehicleExpenseAnalysis = useMemo(() => {
    const vehMap = {};
    let totalExpenseForVehicles = 0;

    filteredEntries.forEach(e => {
      if (e.entry_type === 'expense') {
        const amt = parseFloat(e.amount) || 0;
        totalExpenseForVehicles += amt;
        const vId = e.vehicle_id || 'unassigned';
        if (!vehMap[vId]) {
          const vehObj = vehiclesMap[vId];
          vehMap[vId] = {
            id: vId,
            name: vehObj ? `${vehObj.name} (${vehObj.registration_number || 'N/A'})` : 'Personal / Non-Vehicle Expense',
            total: 0,
            count: 0
          };
        }
        vehMap[vId].total += amt;
        vehMap[vId].count += 1;
      }
    });

    return Object.values(vehMap).map(v => ({
      ...v,
      percentage: totalExpenseForVehicles > 0 ? (v.total / totalExpenseForVehicles) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredEntries, vehiclesMap]);

  // ----------------------------------------------------
  // SECTION 5: PERIOD TREND / TIMELINE (MONTHLY BREAKDOWN)
  // ----------------------------------------------------
  const monthlyTrends = useMemo(() => {
    const months = {};

    filteredEntries.forEach(e => {
      if (!e.entry_date) return;
      const mKey = e.entry_date.substring(0, 7); // YYYY-MM
      if (!months[mKey]) {
        const [y, m] = mKey.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months[mKey] = {
          key: mKey,
          label,
          income: 0,
          expense: 0,
          transfers: 0
        };
      }

      const amt = parseFloat(e.amount) || 0;
      if (e.entry_type === 'income') {
        months[mKey].income += amt;
      } else if (e.entry_type === 'expense') {
        months[mKey].expense += amt;
      } else if (e.entry_type === 'transfer' && e.transfer_direction === 'in') {
        months[mKey].transfers += amt;
      }
    });

    const sorted = Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
    const maxVal = Math.max(...sorted.map(m => Math.max(m.income, m.expense)), 1);

    return sorted.map(m => ({
      ...m,
      net: m.income - m.expense,
      incomePercent: (m.income / maxVal) * 100,
      expensePercent: (m.expense / maxVal) * 100
    }));
  }, [filteredEntries]);

  // ----------------------------------------------------
  // EXPORT HANDLERS (CSV, EXCEL, PDF)
  // ----------------------------------------------------
  const getPeriodLabel = () => {
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return 'All Time';
  };

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      alert('No transactions found to export.');
      return;
    }

    const headers = [
      'Date',
      'Entry Type',
      'Description',
      'Category',
      'Account',
      'Vehicle',
      'Inflow (Income)',
      'Outflow (Expense)',
      'Transfer Direction',
      'Amount',
      'Reference',
      'Notes'
    ];

    const rows = filteredEntries.map(e => {
      const acc = accountsMap[e.account_id]?.name || 'N/A';
      const veh = vehiclesMap[e.vehicle_id]?.name || '';
      const cat = e.category_id ? (categoriesMap[e.category_id]?.name || e.category) : (e.category || '');
      const amt = parseFloat(e.amount) || 0;
      const inflow = e.entry_type === 'income' ? amt.toFixed(2) : (e.entry_type === 'transfer' && e.transfer_direction === 'in' ? amt.toFixed(2) : '');
      const outflow = e.entry_type === 'expense' ? amt.toFixed(2) : (e.entry_type === 'transfer' && e.transfer_direction === 'out' ? amt.toFixed(2) : '');

      return [
        e.entry_date || '',
        e.entry_type || '',
        `"${(e.description || '').replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        `"${acc.replace(/"/g, '""')}"`,
        `"${veh.replace(/"/g, '""')}"`,
        inflow,
        outflow,
        e.transfer_direction || '',
        amt.toFixed(2),
        `"${(e.reference || '').replace(/"/g, '""')}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Cash_Book_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredEntries.length === 0) {
      alert('No transactions found to export.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // 1. Transactions Sheet
    const txData = filteredEntries.map(e => ({
      Date: e.entry_date || '',
      Type: (e.entry_type || '').toUpperCase(),
      Description: e.description || '',
      Category: e.category_id ? (categoriesMap[e.category_id]?.name || e.category) : (e.category || ''),
      Account: accountsMap[e.account_id]?.name || 'N/A',
      Vehicle: vehiclesMap[e.vehicle_id]?.name || '',
      Amount: parseFloat(e.amount) || 0,
      'Inflow (Income)': e.entry_type === 'income' ? parseFloat(e.amount) : '',
      'Outflow (Expense)': e.entry_type === 'expense' ? parseFloat(e.amount) : '',
      'Transfer Direction': e.transfer_direction || '',
      Reference: e.reference || '',
      Notes: e.notes || ''
    }));
    const wsTx = XLSX.utils.json_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

    // 2. Summary Sheet
    const summaryData = [
      { Metric: 'Report Period', Value: getPeriodLabel() },
      { Metric: 'Selected Account', Value: selectedAccountId === 'all' ? 'All Accounts' : accountsMap[selectedAccountId]?.name || '' },
      { Metric: 'Total Income (₹)', Value: kpis.income },
      { Metric: 'Income Transactions', Value: kpis.incomeCount },
      { Metric: 'Total Expense (₹)', Value: kpis.expense },
      { Metric: 'Expense Transactions', Value: kpis.expenseCount },
      { Metric: 'Net Cashflow (₹)', Value: kpis.net },
      { Metric: 'Total Internal Transfers (₹)', Value: kpis.transferVolume },
      { Metric: 'Transfer Count', Value: kpis.transferCount },
      { Metric: 'Total Filtered Entries', Value: kpis.totalCount }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // 3. Account Reconciliation Sheet
    const accData = accountsReconciliation.accounts.map(a => ({
      Account: a.name,
      Type: a.type.toUpperCase(),
      'Period Opening Balance': a.periodOpeningBalance,
      'Inflow (Income)': a.periodIncome,
      'Inflow (Transfer In)': a.periodTransferIn,
      'Outflow (Expense)': a.periodExpense,
      'Outflow (Transfer Out)': a.periodTransferOut,
      'Net Change': a.netChange,
      'Period Closing Balance': a.periodClosingBalance
    }));
    accData.push({
      Account: 'TOTAL RECONCILED',
      Type: '-',
      'Period Opening Balance': accountsReconciliation.totals.periodOpeningBalance,
      'Inflow (Income)': accountsReconciliation.totals.periodIncome,
      'Inflow (Transfer In)': accountsReconciliation.totals.periodTransferIn,
      'Outflow (Expense)': accountsReconciliation.totals.periodExpense,
      'Outflow (Transfer Out)': accountsReconciliation.totals.periodTransferOut,
      'Net Change': accountsReconciliation.totals.netChange,
      'Period Closing Balance': accountsReconciliation.totals.periodClosingBalance
    });
    const wsAcc = XLSX.utils.json_to_sheet(accData);
    XLSX.utils.book_append_sheet(wb, wsAcc, 'Accounts Reconciliation');

    // 4. Category Breakdown Sheet
    const catData = [
      ...incomeCategoriesAnalysis.map(c => ({
        Type: 'INCOME',
        Category: c.name,
        Total: c.total,
        Count: c.count,
        'Percentage (%)': c.percentage.toFixed(1)
      })),
      ...expenseCategoriesAnalysis.map(c => ({
        Type: 'EXPENSE',
        Category: c.name,
        Total: c.total,
        Count: c.count,
        'Percentage (%)': c.percentage.toFixed(1)
      }))
    ];
    const wsCat = XLSX.utils.json_to_sheet(catData);
    XLSX.utils.book_append_sheet(wb, wsCat, 'Categories');

    // 5. Vehicle Breakdown Sheet
    const vehData = vehicleExpenseAnalysis.map(v => ({
      Vehicle: v.name,
      'Total Expense': v.total,
      'Transaction Count': v.count,
      'Percentage (%)': v.percentage.toFixed(1)
    }));
    const wsVeh = XLSX.utils.json_to_sheet(vehData);
    XLSX.utils.book_append_sheet(wb, wsVeh, 'Vehicle Expenses');

    XLSX.writeFile(wb, `Cash_Book_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    if (filteredEntries.length === 0) {
      alert('No transactions found to export.');
      return;
    }

    const doc = new jsPDF();

    // Title & Header
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Cash Book Financial Report', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${getPeriodLabel()}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 25);
    doc.text(`Account Scope: ${selectedAccountId === 'all' ? 'All Accounts' : accountsMap[selectedAccountId]?.name || 'Specific Account'}`, 14, 30);

    // Summary Metric Box
    const startY = 35;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, startY, 182, 20, 2, 2, 'FD');

    const addBoxItem = (label, val, x) => {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(label, x, startY + 6);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(val, x, startY + 14);
    };

    addBoxItem('TOTAL INCOME', `Rs. ${kpis.income.toFixed(2)}`, 18);
    addBoxItem('TOTAL EXPENSE', `Rs. ${kpis.expense.toFixed(2)}`, 65);
    addBoxItem('NET CASHFLOW', `${kpis.net >= 0 ? '+' : ''}Rs. ${kpis.net.toFixed(2)}`, 112);
    addBoxItem('TRANSFERS', `Rs. ${kpis.transferVolume.toFixed(2)}`, 158);

    let nextY = startY + 26;

    // Table 1: Account Reconciliation
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Account Reconciliation', 14, nextY);

    const accountRows = accountsReconciliation.accounts.map(a => [
      a.name,
      a.type.toUpperCase(),
      `Rs.${a.periodOpeningBalance.toFixed(2)}`,
      `+Rs.${(a.periodIncome + a.periodTransferIn).toFixed(2)}`,
      `-Rs.${(a.periodExpense + a.periodTransferOut).toFixed(2)}`,
      `Rs.${a.periodClosingBalance.toFixed(2)}`
    ]);

    accountRows.push([
      'TOTAL',
      '-',
      `Rs.${accountsReconciliation.totals.periodOpeningBalance.toFixed(2)}`,
      `+Rs.${(accountsReconciliation.totals.periodIncome + accountsReconciliation.totals.periodTransferIn).toFixed(2)}`,
      `-Rs.${(accountsReconciliation.totals.periodExpense + accountsReconciliation.totals.periodTransferOut).toFixed(2)}`,
      `Rs.${accountsReconciliation.totals.periodClosingBalance.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [['Account', 'Type', 'Opening', 'Inflow', 'Outflow', 'Closing']],
      body: accountRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    nextY = doc.lastAutoTable.finalY + 10;

    // Table 2: Top Expense Categories
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Expense Breakdown by Category', 14, nextY);

    const expenseCatRows = expenseCategoriesAnalysis.slice(0, 8).map(c => [
      c.name,
      `Rs.${c.total.toFixed(2)}`,
      `${c.count}`,
      `${c.percentage.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [['Category', 'Amount', 'Count', 'Share']],
      body: expenseCatRows.length > 0 ? expenseCatRows : [['No expense records', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    nextY = doc.lastAutoTable.finalY + 10;

    // Check if new page needed for Transactions table
    if (nextY > 220) {
      doc.addPage();
      nextY = 20;
    }

    // Table 3: Filtered Transactions Ledger
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Transaction Ledger (${filteredEntries.length} records)`, 14, nextY);

    const txRows = filteredEntries.slice(0, 100).map(e => [
      e.entry_date || '',
      e.description || '',
      e.category_id ? (categoriesMap[e.category_id]?.name || e.category) : (e.category || '-'),
      accountsMap[e.account_id]?.name || 'N/A',
      e.entry_type.toUpperCase(),
      `${e.entry_type === 'income' ? '+' : e.entry_type === 'expense' ? '-' : ''}Rs.${parseFloat(e.amount || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [['Date', 'Description', 'Category', 'Account', 'Type', 'Amount']],
      body: txRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Cash_Book_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Helper for Account Type Icon
  const getAccountIcon = (type) => {
    switch (type) {
      case 'bank':
      case 'savings':
        return <Landmark size={14} />;
      case 'wallet':
        return <Smartphone size={14} />;
      case 'credit':
        return <CreditCard size={14} />;
      case 'cash':
      default:
        return <Wallet size={14} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-y-auto pb-24 md:pb-12">
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">

        {/* ---------------------------------------------------- */}
        {/* HEADER & EXPORT ACTIONS */}
        {/* ---------------------------------------------------- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer mb-1 border border-slate-300/80 dark:border-white/10 active:scale-95"
            >
              <ArrowLeft size={14} /> Back to Cash Book
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
                <BarChart3 size={24} />
              </span>
              Cash Book Reports & Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Financial summaries, period trends, and multi-account cashflow reconciliation
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300/80 dark:border-white/10 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Download raw transaction data as CSV"
            >
              <FileCode size={14} className="text-cyan-600 dark:text-cyan-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Export structured multi-sheet Excel workbook"
            >
              <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Export formatted PDF financial statement"
            >
              <FileText size={14} className="text-rose-600 dark:text-rose-400" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* GLOBAL FILTER BAR */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4 md:p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calendar size={15} />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Report Period & Filters
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_quarter', label: 'Quarter' },
              { id: 'this_year', label: 'Year' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filter Dropdowns & Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
            {/* From Date */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Account Selector */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Financial Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Accounts ({financialAccounts.length})</option>
                {financialAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.account_type || 'cash'})
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Transaction Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Types (Income / Expense / Transfer)</option>
                <option value="income">Income Only (+)</option>
                <option value="expense">Expense Only (-)</option>
                <option value="transfer">Transfers Only (⇄)</option>
              </select>
            </div>

            {/* Category Type Filter */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Category Type
              </label>
              <select
                value={categoryTypeFilter}
                onChange={(e) => {
                  setCategoryTypeFilter(e.target.value);
                  setSelectedCategory('all');
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Category Types</option>
                <option value="income">Income Categories</option>
                <option value="expense">Expense Categories</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Categories</option>
                {availableCategoriesForFilter.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon || (c.category_type === 'income' ? '💰' : '📦')} {c.name} ({c.category_type})
                  </option>
                ))}
                {legacyCategories.length > 0 && (
                  <optgroup label="Other Logged Categories">
                    {legacyCategories
                      .filter(l => categoryTypeFilter === 'all' || l.type === categoryTypeFilter)
                      .map(l => (
                        <option key={`legacy:${l.type}:${l.name.toLowerCase()}`} value={`legacy:${l.type}:${l.name.toLowerCase()}`}>
                          {l.name} ({l.type} - unmapped)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Vehicle Filter */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Vehicle Attribution
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Vehicles & General</option>
                <option value="unassigned">General / Non-Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.registration_number || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Query */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Search Entries
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Notes, ref, keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-emerald-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SECTION 1: EXECUTIVE OVERVIEW (4 KPI CARDS) */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Total Income */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4.5 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ArrowDownLeft size={16} /> Total Income
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {kpis.incomeCount} entries
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ₹{kpis.income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total revenue & deposits received</p>
          </div>

          {/* 2. Total Expense */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4.5 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <ArrowUpRight size={16} /> Total Expense
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {kpis.expenseCount} entries
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              ₹{kpis.expense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fuel, maintenance, & living costs</p>
          </div>

          {/* 3. Net Cashflow */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4.5 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp size={16} /> Net Cashflow
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                kpis.net >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}>
                {kpis.net >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className={`text-2xl font-black font-mono ${
              kpis.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {kpis.net >= 0 ? '+' : ''}₹{kpis.net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Income minus expenses for period</p>
          </div>

          {/* 4. Internal Transfers */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4.5 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <ArrowLeftRight size={16} /> Internal Transfers
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                {kpis.transferCount} transfers
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              ₹{kpis.transferVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Inter-account movement (neutral)</p>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SECTION 2: CATEGORY BREAKDOWN */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Income Categories */}
          {(categoryTypeFilter === 'all' || categoryTypeFilter === 'income') && (
            <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ArrowDownLeft size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Income by Category
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Distribution of revenue streams
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{kpis.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {incomeCategoriesAnalysis.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No income entries recorded for this period.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {incomeCategoriesAnalysis.map(cat => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <span>{cat.icon}</span> {cat.name}
                          <span className="text-[10px] font-normal text-slate-400">({cat.count})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-900 dark:text-white">
                            ₹{cat.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono w-10 text-right">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expense Categories */}
          {(categoryTypeFilter === 'all' || categoryTypeFilter === 'expense') && (
            <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <ArrowUpRight size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Expenses by Category
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Cost breakdown across categories
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                  ₹{kpis.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {expenseCategoriesAnalysis.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No expense entries recorded for this period.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {expenseCategoriesAnalysis.map(cat => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <span>{cat.icon}</span> {cat.name}
                          <span className="text-[10px] font-normal text-slate-400">({cat.count})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-900 dark:text-white">
                            ₹{cat.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono w-10 text-right">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* SECTION 3: ACCOUNT CASHFLOW & RECONCILIATION */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Building2 size={16} />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Account Reconciliation & Liquid Cashflow
                </h3>
                <p className="text-[11px] text-slate-400">
                  Opening, inflows, outflows, and closing balances by account
                </p>
              </div>
            </div>

            {/* Reconciliation Audit Formula Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={14} />
              <span>Balanced: Opening + Inflow - Outflow = Closing</span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-black uppercase text-[10px] tracking-wider">
                  <th className="p-3">Account</th>
                  <th className="p-3 text-right">Period Opening</th>
                  <th className="p-3 text-right">Inflows (Income / Transfer In)</th>
                  <th className="p-3 text-right">Outflows (Expense / Transfer Out)</th>
                  <th className="p-3 text-right">Net Change</th>
                  <th className="p-3 text-right">Period Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold">
                {accountsReconciliation.accounts.map(acc => {
                  const totalIn = acc.periodIncome + acc.periodTransferIn;
                  const totalOut = acc.periodExpense + acc.periodTransferOut;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                            {getAccountIcon(acc.type)}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {acc.name}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {acc.type} {acc.isDefault ? '• Default' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        ₹{acc.periodOpeningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        +₹{totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="block text-[10px] text-slate-400">
                          (₹{acc.periodIncome.toFixed(0)} inc + ₹{acc.periodTransferIn.toFixed(0)} trf)
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        -₹{totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="block text-[10px] text-slate-400">
                          (₹{acc.periodExpense.toFixed(0)} exp + ₹{acc.periodTransferOut.toFixed(0)} trf)
                        </span>
                      </td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        acc.netChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {acc.netChange >= 0 ? '+' : ''}₹{acc.netChange.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        ₹{acc.periodClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Table Total Row */}
              <tfoot>
                <tr className="bg-slate-100 dark:bg-white/10 font-black text-slate-900 dark:text-white border-t border-slate-300 dark:border-white/20">
                  <td className="p-3 uppercase text-[10px] tracking-wider">
                    Total Reconciled
                  </td>
                  <td className="p-3 text-right font-mono">
                    ₹{accountsReconciliation.totals.periodOpeningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    +₹{(accountsReconciliation.totals.periodIncome + accountsReconciliation.totals.periodTransferIn).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                    -₹{(accountsReconciliation.totals.periodExpense + accountsReconciliation.totals.periodTransferOut).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`p-3 text-right font-mono ${
                    accountsReconciliation.totals.netChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {accountsReconciliation.totals.netChange >= 0 ? '+' : ''}₹{accountsReconciliation.totals.netChange.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-900 dark:text-white">
                    ₹{accountsReconciliation.totals.periodClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {accountsReconciliation.accounts.map(acc => {
              const totalIn = acc.periodIncome + acc.periodTransferIn;
              const totalOut = acc.periodExpense + acc.periodTransferOut;

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300">
                        {getAccountIcon(acc.type)}
                      </span>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {acc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {acc.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 block">Closing</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{acc.periodClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-white/10 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Opening</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        ₹{acc.periodOpeningBalance.toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Inflows</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        +₹{totalIn.toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Outflows</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400">
                        -₹{totalOut.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SECTION 4 & 5: VEHICLE ATTRIBUTION & MONTHLY TREND */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Vehicle Attribution */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Car size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Vehicle Expense Attribution
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Expenditure attributed to bikes and cars
                  </p>
                </div>
              </div>
              <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">
                ₹{vehicleExpenseAnalysis.reduce((sum, v) => sum + v.total, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {vehicleExpenseAnalysis.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No vehicle expenses logged in this period.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {vehicleExpenseAnalysis.map(v => (
                  <div key={v.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">
                        {v.name}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">({v.count} logs)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 dark:text-white">
                          ₹{v.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono w-10 text-right">
                          {v.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, v.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Trend Timeline */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <TrendingUp size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Monthly Cashflow Trends
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Comparative timeline across active period
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                {monthlyTrends.length} months
              </span>
            </div>

            {monthlyTrends.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No timeline data available for active filters.
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {monthlyTrends.map(m => (
                  <div key={m.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                        {m.label}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +₹{m.income.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          -₹{m.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`font-bold ${m.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          Net: {m.net >= 0 ? '+' : ''}₹{m.net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    {/* Visual Comparison Bar */}
                    <div className="grid grid-cols-2 gap-1.5 h-2.5 bg-slate-100 dark:bg-white/5 p-0.5 rounded-full overflow-hidden">
                      <div className="w-full flex justify-end">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, m.incomePercent))}%` }}
                        />
                      </div>
                      <div className="w-full flex justify-start">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, m.expensePercent))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SECTION 6: DETAILED FILTERED TRANSACTION LEDGER */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Layers size={16} />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Filtered Transaction Ledger
                </h3>
                <p className="text-[11px] text-slate-400">
                  Showing {filteredEntries.length} entries matching current filter criteria
                </p>
              </div>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <p>No transactions match the selected filters.</p>
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-3">Date</th>
                      <th className="p-3">Description & Notes</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Account</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3 text-center">Type</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold">
                    {filteredEntries.map(entry => {
                      const acc = accountsMap[entry.account_id];
                      const veh = vehiclesMap[entry.vehicle_id];
                      const catObj = entry.category_id ? categoriesMap[entry.category_id] : null;
                      const catName = catObj ? catObj.name : (entry.category || 'General');
                      const catIcon = catObj?.icon || (entry.entry_type === 'income' ? '💰' : '📦');
                      const amt = parseFloat(entry.amount) || 0;

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {entry.entry_date}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {entry.description || '-'}
                            </span>
                            {entry.reference && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Ref: {entry.reference}
                              </span>
                            )}
                            {entry.notes && (
                              <span className="text-[10px] text-slate-400 block italic">
                                {entry.notes}
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                              <span>{catIcon}</span> {catName}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400">{getAccountIcon(acc?.account_type)}</span>
                              <span>{acc?.name || 'N/A'}</span>
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-500">
                            {veh ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                <Car size={11} /> {veh.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              entry.entry_type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : entry.entry_type === 'expense'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {entry.entry_type === 'transfer' ? `Transfer (${entry.transfer_direction || '⇄'})` : entry.entry_type}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-mono font-black text-xs whitespace-nowrap ${
                            entry.entry_type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : entry.entry_type === 'expense'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-cyan-600 dark:text-cyan-400'
                          }`}>
                            {entry.entry_type === 'income' ? '+' : entry.entry_type === 'expense' ? '-' : '⇄'}
                            ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {filteredEntries.map(entry => {
                  const acc = accountsMap[entry.account_id];
                  const veh = vehiclesMap[entry.vehicle_id];
                  const catObj = entry.category_id ? categoriesMap[entry.category_id] : null;
                  const catName = catObj ? catObj.name : (entry.category || 'General');
                  const catIcon = catObj?.icon || (entry.entry_type === 'income' ? '💰' : '📦');
                  const amt = parseFloat(entry.amount) || 0;

                  return (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {entry.entry_date}
                        </span>
                        <span className={`text-xs font-black font-mono ${
                          entry.entry_type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : entry.entry_type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-cyan-600 dark:text-cyan-400'
                        }`}>
                          {entry.entry_type === 'income' ? '+' : entry.entry_type === 'expense' ? '-' : '⇄'}
                          ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {entry.description || '-'}
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                          {catIcon} {catName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                          {getAccountIcon(acc?.account_type)} {acc?.name || 'N/A'}
                        </span>
                        {veh && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Car size={10} /> {veh.name}
                          </span>
                        )}
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
}

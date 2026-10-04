// src/screens/CashBookScreen.jsx
import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { 
  BookOpen, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  Plus, 
  Trash2, 
  Edit2, 
  CreditCard, 
  Wallet, 
  Building2, 
  Search, 
  X, 
  Landmark, 
  Smartphone,
  BarChart3
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'General',
  'Fuel',
  'Maintenance',
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Bills & Utilities',
  'Salary',
  'Rent',
  'Medical',
  'Travel',
  'Business',
  'Other'
];

const INCOME_CATEGORIES = [
  'Salary',
  'Business',
  'Freelance',
  'Investment',
  'Refund',
  'Gift',
  'General',
  'Other'
];

export default function CashBookScreen() {
  const { 
    financialAccounts, 
    cashBookCategories, 
    cashBookEntries, 
    vehicles, 
    addAccount, 
    updateAccount, 
    deleteAccount, 
    addCashBookEntry, 
    createTransfer, 
    updateCashBookEntry, 
    deleteCashBookEntry 
  } = useAppData();

  // Filters State
  const [filterType, setFilterType] = useState('all'); // 'all' | 'income' | 'expense' | 'transfer'
  const [selectedAccountId, setSelectedAccountId] = useState('all'); // 'all' | accountId
  const [selectedVehicleId, setSelectedVehicleId] = useState('all'); // 'all' | 'none' | vehicleId
  const [categoryTypeFilter, setCategoryTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | category_id
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);

  // Transaction Form State
  const [entryType, setEntryType] = useState('expense'); // 'expense' | 'income' | 'transfer'
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState(''); // For transfers
  const [vehicleId, setVehicleId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [category, setCategory] = useState('General');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Account Form State
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('bank');
  const [accOpeningBalance, setAccOpeningBalance] = useState('');
  const [accIsDefault, setAccIsDefault] = useState(false);
  const [accNotes, setAccNotes] = useState('');

  // Find default account
  const defaultAccount = useMemo(() => {
    if (!financialAccounts || financialAccounts.length === 0) return null;
    return financialAccounts.find(a => a.is_default) ||
           financialAccounts.find(a => a.name.toLowerCase() === 'cash') ||
           financialAccounts[0];
  }, [financialAccounts]);

  // Account Balances Map (Requirement 6: opening_balance + income + transfer-in - expense - transfer-out)
  const accountBalances = useMemo(() => {
    const balances = {};
    (financialAccounts || []).forEach(acc => {
      const opening = parseFloat(acc.opening_balance) || 0;
      let income = 0;
      let expense = 0;
      let xferIn = 0;
      let xferOut = 0;

      (cashBookEntries || []).forEach(e => {
        if (e.account_id === acc.id) {
          const amt = parseFloat(e.amount) || 0;
          if (e.entry_type === 'income') {
            income += amt;
          } else if (e.entry_type === 'expense') {
            expense += amt;
          } else if (e.entry_type === 'transfer') {
            if (e.transfer_direction === 'in') {
              xferIn += amt;
            } else if (e.transfer_direction === 'out') {
              xferOut += amt;
            }
          }
        }
      });

      const currentBalance = opening + income + xferIn - expense - xferOut;
      balances[acc.id] = {
        opening,
        income,
        expense,
        xferIn,
        xferOut,
        currentBalance,
      };
    });
    return balances;
  }, [financialAccounts, cashBookEntries]);

  // Total balance across all accounts
  const totalAccountsBalance = useMemo(() => {
    return Object.values(accountBalances).reduce((sum, b) => sum + b.currentBalance, 0);
  }, [accountBalances]);

  // Total opening balance across all accounts
  const totalOpeningBalance = useMemo(() => {
    return Object.values(accountBalances).reduce((sum, b) => sum + b.opening, 0);
  }, [accountBalances]);

  // Vehicles map for fast lookup
  const vehiclesMap = useMemo(() => {
    const map = {};
    (vehicles || []).forEach(v => {
      map[v.id] = v;
    });
    return map;
  }, [vehicles]);

  // Accounts map for fast lookup
  const accountsMap = useMemo(() => {
    const map = {};
    (financialAccounts || []).forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [financialAccounts]);

  // Master categories divided by type (Phase 3)
  const expenseMasterCategories = useMemo(() => {
    return (cashBookCategories || [])
      .filter(c => c.category_type === 'expense' && c.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name));
  }, [cashBookCategories]);

  const incomeMasterCategories = useMemo(() => {
    return (cashBookCategories || [])
      .filter(c => c.category_type === 'income' && c.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name));
  }, [cashBookCategories]);

  // Fallback defaults if master records haven't loaded or are not populated yet
  const effectiveExpenseCategories = useMemo(() => {
    if (expenseMasterCategories.length > 0) return expenseMasterCategories;
    return EXPENSE_CATEGORIES.map((name, i) => ({
      id: `default-exp-${name}`,
      name,
      category_type: 'expense',
      sort_order: i
    }));
  }, [expenseMasterCategories]);

  const effectiveIncomeCategories = useMemo(() => {
    if (incomeMasterCategories.length > 0) return incomeMasterCategories;
    return INCOME_CATEGORIES.map((name, i) => ({
      id: `default-inc-${name}`,
      name,
      category_type: 'income',
      sort_order: i
    }));
  }, [incomeMasterCategories]);

  // Legacy categories present in entries without master matching
  const legacyCategories = useMemo(() => {
    const masterNames = new Set((cashBookCategories || []).map(c => c.name.toLowerCase()));
    const items = [];
    const seen = new Set();
    (cashBookEntries || []).forEach(e => {
      if (e.category && !e.category_id && !masterNames.has(e.category.toLowerCase())) {
        const key = `${e.entry_type || 'expense'}:${e.category.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            name: e.category,
            type: e.entry_type || 'expense'
          });
        }
      }
    });
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [cashBookCategories, cashBookEntries]);

  // Handle category type switcher with intelligent category preservation/mapping (Phase 3)
  const handleCategoryTypeChange = (newType) => {
    setCategoryTypeFilter(newType);
    if (selectedCategory === 'all') return;

    if (selectedCategory.startsWith('legacy:')) {
      const parts = selectedCategory.split(':');
      const legacyType = parts[1];
      if (newType !== 'all' && legacyType !== newType) {
        setSelectedCategory('all');
      }
      return;
    }

    const currentCat = (cashBookCategories || []).find(c => c.id === selectedCategory) ||
      effectiveExpenseCategories.find(c => c.id === selectedCategory) ||
      effectiveIncomeCategories.find(c => c.id === selectedCategory);

    if (currentCat) {
      if (newType === 'all') {
        // Keep selected category as is
      } else if (currentCat.category_type === newType) {
        // Already matching new type
      } else {
        // Attempt to match counterpart category with identical name in the new type
        const targetList = newType === 'income' ? effectiveIncomeCategories : effectiveExpenseCategories;
        const counterpart = targetList.find(c => c.name.toLowerCase() === currentCat.name.toLowerCase());
        if (counterpart) {
          setSelectedCategory(counterpart.id);
        } else {
          setSelectedCategory('all');
        }
      }
    } else {
      setSelectedCategory('all');
    }
  };

  // Calculate Ledger Rows with Running Balances (Requirement 5)
  const ledgerRows = useMemo(() => {
    // 1. Sort all entries chronologically (oldest first)
    const sortedChronological = [...(cashBookEntries || [])].sort((a, b) => {
      const dateA = new Date(a.entry_date).getTime();
      const dateB = new Date(b.entry_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const createdA = new Date(a.created_at || 0).getTime();
      const createdB = new Date(b.created_at || 0).getTime();
      return createdA - createdB;
    });

    // 2. Compute running balance for each entry based on active account filter
    const isSingleAccount = selectedAccountId !== 'all';
    let balance = isSingleAccount 
      ? (parseFloat(accountsMap[selectedAccountId]?.opening_balance) || 0)
      : totalOpeningBalance;

    const entriesWithBalances = [];
    for (let i = 0; i < sortedChronological.length; i++) {
      const entry = sortedChronological[i];
      const amt = parseFloat(entry.amount) || 0;

      if (isSingleAccount) {
        if (entry.account_id === selectedAccountId) {
          if (entry.entry_type === 'income') {
            balance += amt;
          } else if (entry.entry_type === 'expense') {
            balance -= amt;
          } else if (entry.entry_type === 'transfer') {
            if (entry.transfer_direction === 'in') balance += amt;
            else if (entry.transfer_direction === 'out') balance -= amt;
          }
        }
      } else {
        // Across all accounts:
        // Income increases total balance
        // Expense decreases total balance
        // Internal transfer between accounts has net 0 impact on combined balance
        if (entry.entry_type === 'income') {
          balance += amt;
        } else if (entry.entry_type === 'expense') {
          balance -= amt;
        }
      }

      entriesWithBalances.push({
        ...entry,
        _runningBalance: balance,
      });
    }

    // 3. Filter entries based on user filter controls
    const filtered = entriesWithBalances.filter(entry => {
      // Account filter
      if (selectedAccountId !== 'all' && entry.account_id !== selectedAccountId) {
        return false;
      }

      // Entry type filter
      if (filterType !== 'all' && entry.entry_type !== filterType) {
        return false;
      }

      // Vehicle filter
      if (selectedVehicleId !== 'all') {
        if (selectedVehicleId === 'none' && entry.vehicle_id) return false;
        if (selectedVehicleId !== 'none' && entry.vehicle_id !== selectedVehicleId) return false;
      }

      // Category Type filter (Phase 3)
      if (categoryTypeFilter !== 'all' && entry.entry_type !== categoryTypeFilter) {
        return false;
      }

      // Category filter (Phase 3: category_id + entry_type & legacy fallback)
      if (selectedCategory !== 'all') {
        if (selectedCategory.startsWith('legacy:')) {
          const parts = selectedCategory.split(':');
          const legType = parts[1];
          const legName = parts[2];
          if (entry.entry_type !== legType) return false;
          if ((entry.category || '').toLowerCase() !== legName.toLowerCase()) return false;
        } else {
          const targetCat = (cashBookCategories || []).find(c => c.id === selectedCategory) ||
            effectiveExpenseCategories.find(c => c.id === selectedCategory) ||
            effectiveIncomeCategories.find(c => c.id === selectedCategory);

          if (targetCat) {
            // Must match entry_type
            if (entry.entry_type !== targetCat.category_type) {
              return false;
            }
            // Match category_id, or if null, match category string (legacy compatibility)
            const idMatches = entry.category_id && entry.category_id === targetCat.id;
            const nameMatches = (!entry.category_id || entry.category_id === targetCat.id) &&
              (entry.category || '').toLowerCase() === targetCat.name.toLowerCase();

            if (!idMatches && !nameMatches) {
              return false;
            }
          } else {
            if ((entry.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
              return false;
            }
          }
        }
      }

      // Date range filter
      if (startDate && entry.entry_date < startDate) return false;
      if (endDate && entry.entry_date > endDate) return false;

      // Text search filter
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

    // 4. Reverse to show newest first in the UI
    return filtered.reverse();
  }, [
    cashBookEntries, 
    selectedAccountId, 
    filterType, 
    selectedVehicleId, 
    categoryTypeFilter, 
    selectedCategory, 
    startDate, 
    endDate, 
    searchQuery, 
    accountsMap, 
    totalOpeningBalance, 
    vehiclesMap,
    cashBookCategories,
    effectiveExpenseCategories,
    effectiveIncomeCategories
  ]);

  // Summary for Reports Modal (Phase 2 preview)
  const reportsSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    (ledgerRows || []).forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      if (e.entry_type === 'income') income += amt;
      else if (e.entry_type === 'expense') expense += amt;
    });
    return {
      income,
      expense,
      net: income - expense,
      count: ledgerRows.length,
    };
  }, [ledgerRows]);

  // Open modal for recording a new transaction
  const openNewTransactionModal = (type = 'expense') => {
    setEditingEntry(null);
    setEntryType(type);
    setAmount('');
    const activeAccs = (financialAccounts || []).filter(a => a.is_active !== false);
    const chosenAcc = activeAccs.find(a => a.is_default) || activeAccs[0] || defaultAccount;
    setAccountId(chosenAcc?.id || '');
    setToAccountId(activeAccs.length > 1 ? activeAccs.find(a => a.id !== chosenAcc?.id)?.id || '' : '');
    setVehicleId('');

    // Default category from active categories of this type
    const matchingCats = (cashBookCategories || []).filter(c => c.category_type === type && c.is_active);
    const defaultCat = matchingCats[0];
    setCategoryId(defaultCat?.id || '');
    setCategory(defaultCat?.name || (type === 'income' ? 'Salary' : 'General'));

    setEntryDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setReference('');
    setNotes('');
    setShowTransactionModal(true);
  };

  // Open modal for editing an existing transaction
  const openEditTransactionModal = (entry) => {
    setEditingEntry(entry);
    setEntryType(entry.entry_type);
    setAmount(String(entry.amount));
    setAccountId(entry.account_id || '');
    setVehicleId(entry.vehicle_id || '');
    setCategoryId(entry.category_id || '');
    setCategory(entry.category || 'General');
    setEntryDate(entry.entry_date);
    setDescription(entry.description || '');
    setReference(entry.reference || '');
    setNotes(entry.notes || '');
    setShowTransactionModal(true);
  };

  // Save Transaction (Create or Edit)
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    try {
      if (entryType === 'transfer') {
        if (!accountId || !toAccountId) {
          alert('Please select both Source and Destination accounts.');
          return;
        }
        if (accountId === toAccountId) {
          alert('Source and Destination accounts cannot be the same.');
          return;
        }

        if (editingEntry) {
          await updateCashBookEntry(editingEntry.id, {
            amount: parsedAmount,
            entry_date: entryDate,
            description: description || `Transfer: ${accountsMap[accountId]?.name} → ${accountsMap[toAccountId]?.name}`,
            notes,
          });
        } else {
          await createTransfer({
            from_account_id: accountId,
            to_account_id: toAccountId,
            amount: parsedAmount,
            entry_date: entryDate,
            description: description || `Transfer: ${accountsMap[accountId]?.name} → ${accountsMap[toAccountId]?.name}`,
            notes,
            vehicle_id: vehicleId || null,
          });
        }
      } else {
        // Income or Expense
        const selectedCatObj = (cashBookCategories || []).find(c => c.id === categoryId || c.name === category);
        const resolvedCatName = selectedCatObj ? selectedCatObj.name : category;
        const resolvedCatId = selectedCatObj ? selectedCatObj.id : (categoryId || null);

        const payload = {
          account_id: accountId || defaultAccount?.id || null,
          vehicle_id: vehicleId || null,
          entry_type: entryType,
          amount: parsedAmount,
          category_id: resolvedCatId,
          category: resolvedCatName || 'General',
          entry_date: entryDate,
          description,
          reference,
          notes,
        };

        if (editingEntry) {
          await updateCashBookEntry(editingEntry.id, payload);
        } else {
          await addCashBookEntry(payload);
        }
      }

      setShowTransactionModal(false);
      setEditingEntry(null);
    } catch (err) {
      alert('Could not save transaction: ' + err.message);
    }
  };

  // Open modal for Account Management
  const openNewAccountModal = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('bank');
    setAccOpeningBalance('0');
    setAccIsDefault(financialAccounts.length === 0);
    setAccNotes('');
    setShowAccountModal(true);
  };

  const openEditAccountModal = (acc) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.account_type || 'cash');
    setAccOpeningBalance(String(acc.opening_balance || 0));
    setAccIsDefault(Boolean(acc.is_default));
    setAccNotes(acc.notes || '');
    setShowAccountModal(true);
  };

  // Save Account
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accName.trim()) {
      alert('Please enter an account name.');
      return;
    }

    try {
      const payload = {
        name: accName.trim(),
        account_type: accType,
        opening_balance: parseFloat(accOpeningBalance) || 0,
        is_default: accIsDefault,
        notes: accNotes,
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
      } else {
        await addAccount(payload);
      }

      setShowAccountModal(false);
      setEditingAccount(null);
    } catch (err) {
      alert('Could not save account: ' + err.message);
    }
  };

  // Account Type Helper Icon
  const getAccountIcon = (type) => {
    switch (type) {
      case 'bank':
      case 'savings':
        return <Landmark size={15} />;
      case 'wallet':
        return <Smartphone size={15} />;
      case 'credit':
        return <CreditCard size={15} />;
      case 'cash':
      default:
        return <Wallet size={15} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-y-auto pb-24 md:pb-8">
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <BookOpen size={13} /> Financial Ledger & Accounts
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Cash Book
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-Account Cashflow, Transaction Ledger & Transfers
            </p>
          </div>

          {/* Phase 2 Header Actions: [ + Expense ] [ + Income ] [ Transfer ] [ Reports ] */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => openNewTransactionModal('expense')}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight size={15} /> + Expense
            </button>
            <button
              onClick={() => openNewTransactionModal('income')}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft size={15} /> + Income
            </button>
            <button
              onClick={() => openNewTransactionModal('transfer')}
              className="px-3.5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight size={15} /> Transfer
            </button>
            <button
              onClick={() => setShowReportsModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300/80 dark:border-white/10"
            >
              <BarChart3 size={15} /> Reports
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* PHASE 1: FINANCIAL ACCOUNTS SECTION */}
        {/* ==================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Building2 size={15} />
              </span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Financial Accounts
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Select an account to filter the transaction ledger below
                </p>
              </div>
            </div>
            <button
              onClick={openNewAccountModal}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={13} /> Add Account
            </button>
          </div>

          {/* Accounts: Responsive Grid on Desktop, Horizontal Scroll on Mobile */}
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none snap-x">
            {/* "All Accounts" Aggregate Card */}
            <div
              onClick={() => setSelectedAccountId('all')}
              className={`min-w-[240px] md:min-w-0 p-4 rounded-2xl border transition-all cursor-pointer relative snap-start shrink-0 md:shrink select-none ${
                selectedAccountId === 'all'
                  ? 'bg-slate-900 text-white dark:bg-emerald-950/40 border-slate-700 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/50'
                  : 'glass-card text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded-xl ${
                    selectedAccountId === 'all'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                  }`}>
                    <Wallet size={16} />
                  </span>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">All Accounts</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Aggregate Liquid</div>
                  </div>
                </div>
                {selectedAccountId === 'all' && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="text-[11px] text-slate-400 font-medium">Combined Balance</div>
                <div className={`text-xl font-black font-mono tracking-tight ${
                  totalAccountsBalance >= 0
                    ? selectedAccountId === 'all' ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
                }`}>
                  ₹{totalAccountsBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                <span>{financialAccounts.length} accounts configured</span>
                <span className="font-mono">Open: ₹{totalOpeningBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Individual Accounts Cards */}
            {financialAccounts.map((acc) => {
              const bal = accountBalances[acc.id]?.currentBalance || 0;
              const isSelected = selectedAccountId === acc.id;

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`min-w-[240px] md:min-w-0 p-4 rounded-2xl border transition-all cursor-pointer relative snap-start shrink-0 md:shrink group select-none ${
                    isSelected
                      ? 'bg-emerald-950/20 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500 text-slate-900 dark:text-white'
                      : 'glass-card text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`p-2 rounded-xl shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-500'
                      }`}>
                        {getAccountIcon(acc.account_type)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-black truncate">{acc.name}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                          {acc.account_type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {acc.is_default && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                          Def
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditAccountModal(acc);
                        }}
                        title="Edit Account"
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] text-slate-400 font-medium">Current Balance</div>
                    <div className={`text-xl font-black font-mono tracking-tight ${
                      bal >= 0
                        ? isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}>
                      ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Open: ₹{(parseFloat(acc.opening_balance) || 0).toLocaleString('en-IN')}</span>
                    {isSelected && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Filtered</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================================================== */}
        {/* PHASE 2 & 3: SEARCH & ADVANCED FILTER TOOLBAR */}
        {/* ==================================================== */}
        <div className="glass-panel p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 space-y-3">
          {/* Row 1: Search + Entry Type Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description, reference, notes, category, account..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-xs font-medium focus:outline-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Entry Type Switcher Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl text-xs font-bold shrink-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All ({cashBookEntries.length})
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === 'income'
                    ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <ArrowDownLeft size={13} className="text-emerald-500" /> Income
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === 'expense'
                    ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <ArrowUpRight size={13} className="text-rose-500" /> Expense
              </button>
              <button
                onClick={() => setFilterType('transfer')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === 'transfer'
                    ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <ArrowLeftRight size={13} className="text-cyan-500" /> Transfer
              </button>
            </div>
          </div>

          {/* Row 2: Category Type [All][Income][Expense] + Category Dropdown + Vehicle + Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
            {/* Category Type Filter & Category Dropdown (Phase 3) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Category Filter</label>
                {/* Category Type Pills */}
                <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800/70 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleCategoryTypeChange('all')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      categoryTypeFilter === 'all'
                        ? 'bg-white dark:bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryTypeChange('income')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      categoryTypeFilter === 'income'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryTypeChange('expense')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      categoryTypeFilter === 'expense'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 font-medium"
              >
                <option value="all">
                  {categoryTypeFilter === 'all' 
                    ? 'All Categories' 
                    : categoryTypeFilter === 'income' 
                      ? 'All Income Categories' 
                      : 'All Expense Categories'}
                </option>

                {categoryTypeFilter === 'all' && (
                  <>
                    <optgroup label="Expense Categories">
                      {effectiveExpenseCategories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Expense)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Income Categories">
                      {effectiveIncomeCategories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Income)
                        </option>
                      ))}
                    </optgroup>
                    {legacyCategories.length > 0 && (
                      <optgroup label="Legacy Categories">
                        {legacyCategories.map(c => (
                          <option key={`legacy-${c.type}-${c.name}`} value={`legacy:${c.type}:${c.name}`}>
                            {c.name} ({c.type === 'income' ? 'Income' : 'Expense'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}

                {categoryTypeFilter === 'income' && (
                  <>
                    {effectiveIncomeCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    {legacyCategories.filter(c => c.type === 'income').map(c => (
                      <option key={`legacy-inc-${c.name}`} value={`legacy:income:${c.name}`}>
                        {c.name} (Legacy)
                      </option>
                    ))}
                  </>
                )}

                {categoryTypeFilter === 'expense' && (
                  <>
                    {effectiveExpenseCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    {legacyCategories.filter(c => c.type === 'expense').map(c => (
                      <option key={`legacy-exp-${c.name}`} value={`legacy:expense:${c.name}`}>
                        {c.name} (Legacy)
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Vehicle Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 font-medium"
              >
                <option value="all">All (Vehicle & Personal)</option>
                <option value="none">Personal Only (No Vehicle)</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.registration_number ? `(${v.registration_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 font-medium"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">To Date</label>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 font-medium"
                />
                {(startDate || endDate || selectedCategory !== 'all' || categoryTypeFilter !== 'all' || selectedVehicleId !== 'all') && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSelectedCategory('all');
                      setCategoryTypeFilter('all');
                      setSelectedVehicleId('all');
                    }}
                    title="Reset filters"
                    className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* PHASE 2: TRANSACTION LEDGER DISPLAY */}
        {/* ==================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transaction Records ({ledgerRows.length})
            </span>
            {selectedAccountId !== 'all' && (
              <span className="text-xs text-slate-400">
                Filtered by <span className="font-bold text-emerald-500">{accountsMap[selectedAccountId]?.name}</span>
                <button
                  onClick={() => setSelectedAccountId('all')}
                  className="ml-1 text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  (show all)
                </button>
              </span>
            )}
          </div>

          {ledgerRows.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
              <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400">
                <BookOpen size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No transactions match current filters</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Adjust search criteria or record a new transaction above.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP / TABLET STRUCTURED TABLE (hidden on mobile) */}
              <div className="hidden md:block glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-200/60 dark:bg-white/5 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/10 tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Account</th>
                        <th className="py-3 px-3">Vehicle</th>
                        <th className="py-3 px-4 text-right">Income (₹)</th>
                        <th className="py-3 px-4 text-right">Expense (₹)</th>
                        <th className="py-3 px-4 text-right font-mono">Balance (₹)</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {ledgerRows.map((entry) => {
                        const isIncome = entry.entry_type === 'income';
                        const isExpense = entry.entry_type === 'expense';
                        const isTransfer = entry.entry_type === 'transfer';
                        const isTransferIn = isTransfer && entry.transfer_direction === 'in';
                        const isTransferOut = isTransfer && entry.transfer_direction === 'out';
                        const numAmount = parseFloat(entry.amount) || 0;
                        const account = accountsMap[entry.account_id];
                        const vehicle = vehiclesMap[entry.vehicle_id];

                        return (
                          <tr 
                            key={entry.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors group"
                          >
                            {/* Date */}
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {entry.entry_date}
                            </td>

                            {/* Description */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                {isTransfer && (
                                  <ArrowLeftRight size={13} className="text-cyan-500 shrink-0" />
                                )}
                                <span className="truncate">{entry.description || entry.category}</span>
                              </div>
                              {(entry.reference || entry.notes) && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {entry.reference && <span className="font-mono mr-1">Ref: {entry.reference}</span>}
                                  {entry.notes}
                                </p>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                isTransfer 
                                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' 
                                  : isIncome
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                              }`}>
                                {entry.category || 'General'}
                              </span>
                            </td>

                            {/* Account */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                                <span className="text-slate-400">{getAccountIcon(account?.account_type)}</span>
                                <span>{account?.name || 'Cash'}</span>
                              </div>
                            </td>

                            {/* Vehicle */}
                            <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                              {vehicle ? (
                                <span className="text-[11px] font-medium bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                  {vehicle.name}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>

                            {/* Income Column */}
                            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                              {isIncome || isTransferIn ? (
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                  +₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>

                            {/* Expense Column */}
                            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                              {isExpense || isTransferOut ? (
                                <span className="font-black text-rose-600 dark:text-rose-400">
                                  -₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>

                            {/* Running Balance Column */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-slate-800 dark:text-slate-200">
                              ₹{entry._runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => openEditTransactionModal(entry)}
                                  title="Edit entry"
                                  className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(isTransfer ? 'Delete this transfer (both legs will be removed)?' : 'Delete this cash book entry?')) {
                                      deleteCashBookEntry(entry.id);
                                    }
                                  }}
                                  title="Delete entry"
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE TOUCH-FRIENDLY TRANSACTION CARDS (hidden on desktop) */}
              <div className="block md:hidden space-y-3">
                {ledgerRows.map((entry) => {
                  const isIncome = entry.entry_type === 'income';
                  const isTransfer = entry.entry_type === 'transfer';
                  const isTransferIn = isTransfer && entry.transfer_direction === 'in';
                  const numAmount = parseFloat(entry.amount) || 0;
                  const account = accountsMap[entry.account_id];
                  const vehicle = vehiclesMap[entry.vehicle_id];

                  return (
                    <div
                      key={entry.id}
                      className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xs"
                    >
                      {/* Top row: Date, Category badge, Transfer badge, Vehicle */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {entry.entry_date}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isTransfer ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              <ArrowLeftRight size={10} /> {isTransferIn ? 'Transfer In' : 'Transfer Out'}
                            </span>
                          ) : (
                            <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}>
                              {entry.category || 'General'}
                            </span>
                          )}
                          {vehicle && (
                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md">
                              {vehicle.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle row: Description + Amount */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {entry.description || entry.category}
                          </h4>
                          {(entry.reference || entry.notes) && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                              {entry.reference && <span className="font-mono mr-1">Ref: {entry.reference}</span>}
                              {entry.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-base font-black font-mono ${
                            isIncome || isTransferIn
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isIncome || isTransferIn ? '+' : '-'}₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Account, Running balance, Actions */}
                      <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400">{getAccountIcon(account?.account_type)}</span>
                          <span className="font-semibold text-[11px]">{account?.name || 'Cash'}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 mr-1">Bal:</span>
                            <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200">
                              ₹{entry._runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditTransactionModal(entry)}
                              title="Edit entry"
                              className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(isTransfer ? 'Delete this transfer (both legs will be removed)?' : 'Delete this cash book entry?')) {
                                  deleteCashBookEntry(entry.id);
                                }
                              }}
                              title="Delete entry"
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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

      {/* ==================================================== */}
      {/* MODAL: RECORD / EDIT TRANSACTION (Income, Expense, Transfer) */}
      {/* ==================================================== */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">
              {editingEntry ? 'Edit Transaction' : 'Record Transaction'}
            </h3>

            <form onSubmit={handleSaveTransaction} className="space-y-3.5">
              
              {/* Type Switcher: Expense | Income | Transfer */}
              {!editingEntry && (
                <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('expense');
                      if (category === 'Salary' || category === 'Transfer') setCategory('General');
                    }}
                    className={`py-2 rounded-lg transition-all ${
                      entryType === 'expense'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('income');
                      setCategory('Salary');
                    }}
                    className={`py-2 rounded-lg transition-all ${
                      entryType === 'income'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('transfer');
                      setCategory('Transfer');
                    }}
                    className={`py-2 rounded-lg transition-all ${
                      entryType === 'transfer'
                        ? 'bg-cyan-500 text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Transfer
                  </button>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Amount (₹)*
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-base font-black font-mono focus:outline-emerald-500"
                />
              </div>

              {/* Transfer Mode Fields */}
              {entryType === 'transfer' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        From Account*
                      </label>
                      <select
                        required
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                      >
                        <option value="">Select Source Account</option>
                        {financialAccounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        To Account*
                      </label>
                      <select
                        required
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                      >
                        <option value="">Select Destination</option>
                        {financialAccounts.map(a => (
                          <option key={a.id} value={a.id} disabled={a.id === accountId}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20">
                    ⇄ Transfers move balances between your accounts and do not impact overall income or expense.
                  </p>
                </>
              ) : (
                /* Income / Expense Mode Fields */
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Account Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Account*
                      </label>
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                      >
                        {financialAccounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} {a.is_default ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Vehicle Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Vehicle (Optional)
                      </label>
                      <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-medium"
                      >
                        <option value="">None (Personal)</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Category*
                      </label>
                      <select
                        value={categoryId || category}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = (cashBookCategories || []).find(c => c.id === val || c.name === val);
                          if (found) {
                            setCategoryId(found.id);
                            setCategory(found.name);
                          } else {
                            setCategoryId('');
                            setCategory(val);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                      >
                        {(() => {
                          const typeCategories = (cashBookCategories || []).filter(c => c.category_type === entryType);
                          const activeList = typeCategories.filter(c => c.is_active || c.id === categoryId);
                          
                          if (activeList.length === 0) {
                            const fallbackList = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                            return fallbackList.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ));
                          }
                          return activeList.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {!c.is_active ? '(Archived)' : ''}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Description / Payee
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={entryType === 'transfer' ? 'e.g. ATM Cash Withdrawal' : 'e.g. Grocery store, Client payment...'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                />
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Reference / Bill #
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. UPI Ref, Invoice #"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional memo"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20"
                >
                  {editingEntry ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT ACCOUNT */}
      {/* ==================================================== */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">
              {editingAccount ? 'Edit Financial Account' : 'Add Financial Account'}
            </h3>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Account Name*
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. HDFC Salary, Cash in Hand, Paytm"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Account Type
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank">Bank Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="wallet">Digital Wallet / UPI</option>
                    <option value="credit">Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={accOpeningBalance}
                    onChange={(e) => setAccOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="accIsDefault"
                  checked={accIsDefault}
                  onChange={(e) => setAccIsDefault(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="accIsDefault" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Set as Primary Default Account
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={accNotes}
                  onChange={(e) => setAccNotes(e.target.value)}
                  placeholder="e.g. Account ending in 4092"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                {editingAccount && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Delete account "${editingAccount.name}"?`)) {
                        try {
                          await deleteAccount(editingAccount.id);
                          setShowAccountModal(false);
                        } catch (err) {
                          alert(err.message);
                        }
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-500 text-xs font-bold hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20"
                >
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: REPORTS PREVIEW & PERIOD SUMMARY (Phase 2) */}
      {/* ==================================================== */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    Cash Book Summary
                  </h3>
                  <p className="text-xs text-slate-400">
                    Active Filters Period Summary
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportsModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Total Income
                </span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{reportsSummary.income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                  Total Expense
                </span>
                <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                  ₹{reportsSummary.expense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Net Cashflow
                </span>
                <span className={`text-base font-black font-mono ${
                  reportsSummary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}>
                  {reportsSummary.net >= 0 ? '+' : ''}₹{reportsSummary.net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <span>{reportsSummary.count} entries</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs">
              <p className="font-semibold">Phase 4 Reports & Analytics</p>
              <p className="text-[11px] text-cyan-600/80 dark:text-cyan-400/80 mt-0.5">
                Full visual charts, monthly trends, vehicle cost breakdowns, and CSV export will be available in Phase 4.
              </p>
            </div>

            <button
              onClick={() => setShowReportsModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black text-xs cursor-pointer active:scale-95 transition-transform"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

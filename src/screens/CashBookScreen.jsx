// src/screens/CashBookScreen.jsx
import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { 
  BookOpen, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Trash2, 
  Calendar, 
  Filter, 
  CreditCard, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Sparkles
} from 'lucide-react';

export default function CashBookScreen() {
  const { 
    cashBookEntries, 
    cashBookSummary, 
    addCashBookEntry, 
    deleteCashBookEntry 
  } = useAppData();

  const [filterType, setFilterType] = useState('all'); // 'all' | 'income' | 'expense'
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [entryType, setEntryType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const filteredEntries = cashBookEntries.filter(e => {
    if (filterType === 'all') return true;
    return e.entry_type === filterType;
  });

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      await addCashBookEntry({
        entry_type: entryType,
        amount: parseFloat(amount),
        category,
        payment_mode: paymentMode,
        entry_date: entryDate,
        description,
      });
      setShowAddModal(false);
      setAmount('');
      setDescription('');
    } catch (err) {
      alert('Could not add cash book entry: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-y-auto pb-24 md:pb-8">
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        
        {/* Header Title & Log Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <BookOpen size={13} /> Financial Ledger
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Cash Book
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personal Income & Expense Cashflow Management
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer w-fit"
          >
            <Plus size={16} /> Record Transaction
          </button>
        </div>

        {/* 1. FINANCIAL KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Net Balance */}
          <div className="glass-panel-glow p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">Net Cash Balance</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                <Wallet size={16} />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-500">₹</span>
              <p className={`text-2xl md:text-3xl font-black font-mono ${cashBookSummary.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {cashBookSummary.netBalance.toLocaleString('en-IN')}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {cashBookSummary.entriesCount} total recorded transactions
            </p>
          </div>

          {/* Total Income */}
          <div className="glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">Total Income</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                <TrendingUp size={16} />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹</span>
              <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {cashBookSummary.totalIncome.toLocaleString('en-IN')}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Credits & earnings
            </p>
          </div>

          {/* Total Expense */}
          <div className="glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">Total Outflow</span>
              <span className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
                <TrendingDown size={16} />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">₹</span>
              <p className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {cashBookSummary.totalExpense.toLocaleString('en-IN')}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Expenses & debits
            </p>
          </div>
        </div>

        {/* 2. FILTER BAR */}
        <div className="flex items-center gap-2 p-1 bg-slate-200/80 dark:bg-slate-900/80 rounded-2xl border border-slate-300 dark:border-white/10 mb-4 text-xs font-bold w-fit">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filterType === 'all'
                ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Ledger ({cashBookEntries.length})
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              filterType === 'income'
                ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownLeft size={14} className="text-emerald-500" /> Income
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              filterType === 'expense'
                ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight size={14} className="text-rose-500" /> Outflow
          </button>
        </div>

        {/* 3. ENTRIES LIST */}
        {filteredEntries.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
            <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400">
              <BookOpen size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No cash transactions logged</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap "Record Transaction" to add your daily cashbook entries.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredEntries.map((item) => {
              const isIncome = item.entry_type === 'income';
              return (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl border ${
                      isIncome 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }`}>
                      {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.description || item.category}
                        </p>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                        <span>{item.entry_date}</span>
                        {item.payment_mode && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/5 text-[10px]">
                            {item.payment_mode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <p className={`font-black text-base ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {isIncome ? '+' : '-'}₹{parseFloat(item.amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this cash book entry?')) {
                          deleteCashBookEntry(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL: ADD TRANSACTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">Record Transaction</h3>
            <form onSubmit={handleCreateEntry} className="space-y-3.5">
              
              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEntryType('expense')}
                  className={`py-2 rounded-lg transition-all ${
                    entryType === 'expense'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Expense / Outflow
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('income')}
                  className={`py-2 rounded-lg transition-all ${
                    entryType === 'income'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Income / Credit
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Amount (₹)*</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-base font-black font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                  >
                    <option value="General">General</option>
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Salary">Salary</option>
                    <option value="Business">Business</option>
                    <option value="Bills & Utilities">Bills & Utilities</option>
                    <option value="Medical">Medical</option>
                    <option value="Rent">Rent</option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                  >
                    <option value="UPI">UPI / GPay</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Grocery shopping, Client invoice..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

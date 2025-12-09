// src/screens/Dashboard.jsx
import React, { useMemo } from 'react';
import { Settings, User, Plus, ChevronRight, History } from 'lucide-react';
import { calculateStats } from '../utils/helpers';

const Dashboard = ({ records, userProfile, onNavigate }) => {
  const stats = useMemo(() => calculateStats(records), [records]);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 pt-12 rounded-b-[2rem] shadow-xl z-10 relative">
        <button
          onClick={() => onNavigate('settings')}
          className="absolute top-12 right-6 p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors z-20"
        >
          <Settings size={20} className="text-slate-300" />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full border-2 border-slate-600 overflow-hidden bg-slate-800 flex items-center justify-center">
            {userProfile.avatar ? (
              <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-emerald-400" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{userProfile.name}'s Bike Tracker</h1>
            <p className="text-slate-400 text-xs font-medium tracking-wider">{userProfile.regNumber ? `Reg. Number : ${userProfile.regNumber}` : 'No Reg. Number'}</p>
          </div>
        </div>
        
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Total Spent</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-emerald-400 font-bold">₹</span>
              <p className="text-2xl font-bold text-emerald-400">{stats.totalAmount.toFixed(0)}</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Total Driven</p>
            <p className="text-2xl font-bold text-blue-400">{stats.totalDriven.toFixed(0)} <span className="text-sm font-normal text-slate-500">km</span></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Avg Mileage</p>
            <p className="text-2xl font-bold text-orange-400">{stats.avgMileage.toFixed(1)} <span className="text-sm font-normal text-slate-500">km/L</span></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Cost / Km</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-purple-400 font-bold">₹</span>
              <p className="text-2xl font-bold text-purple-400">{stats.avgRatePerKm.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center text-xs text-slate-400 px-1">
          <span>Total Fuel: {stats.totalQuantity.toFixed(1)} L</span>
          <span>Records: {stats.count}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-1 p-6 flex flex-col justify-center gap-4">
        <button
          onClick={() => onNavigate('add')}
          className="group relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 z-10">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Plus size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-slate-800">New Record</h3>
              <p className="text-slate-500 text-sm">Log fuel & reading</p>
            </div>
          </div>
          <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('history')}
          className="group relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 z-10">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <History size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-slate-800">Total Records</h3>
              <p className="text-slate-500 text-sm">View full history & reports</p>
            </div>
          </div>
          <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
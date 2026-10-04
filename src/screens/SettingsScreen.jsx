// src/screens/SettingsScreen.jsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Sun, Moon, LogOut, Plus, Edit2, Trash2, Check, X, 
  ShieldCheck, AlertTriangle, Download, Bell, BellOff, Landmark, 
  Wallet, Smartphone, CreditCard, Tag, Archive, RefreshCw, FileText, 
  Layers, Fuel, Wrench, Bike, Settings, CheckCircle2
} from 'lucide-react';
import AvatarUpload from '../components/AvatarUpload';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { notificationService } from '../services/notificationService';

export default function SettingsScreen({ 
  onBack, 
  userProfile, 
  onUpdateProfile, 
  theme, 
  onToggleTheme 
}) {
  const { user, signOut, updateProfile } = useAuth();
  const { 
    vehicles, 
    activeVehicle, 
    selectVehicle, 
    addVehicle, 
    updateVehicle, 
    deleteVehicle,
    serviceSettings,
    serviceRecords,
    nextServiceDue,
    updateServiceSettings,
    records,
    repairRecords,
    trips,
    documents,
    reminders,
    financialAccounts,
    cashBookCategories,
    cashBookEntries,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
    deactivateAccount,
    addCategory,
    updateCategory,
    archiveCategory,
    deleteCategory,
    getCategoryUsageCounts,
    resetAllAppData,
  } = useAppData();

  // Navigation tab: 'general' | 'bikes' | 'accounts' | 'categories' | 'export' | 'danger'
  const [activeTab, setActiveTab] = useState('general');

  // ==========================================
  // 1. GENERAL TAB STATE
  // ==========================================
  const [displayName, setDisplayName] = useState(userProfile?.name || user?.user_metadata?.name || '');
  const [avatar, setAvatar] = useState(userProfile?.avatar || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Notification status state
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    setNotifSupported(notificationService.isSupported());
    setNotifPermission(notificationService.getPermission());
    setNotifEnabled(notificationService.isNotificationsEnabled());
  }, []);

  const handleToggleNotifications = async () => {
    if (!notifSupported) {
      alert('Browser notifications are not supported on this device or browser.');
      return;
    }
    if (notifEnabled) {
      notificationService.setNotificationsEnabled(false);
      setNotifEnabled(false);
    } else {
      if (notifPermission !== 'granted') {
        const res = await notificationService.requestPermission();
        setNotifPermission(res);
        if (res === 'granted') {
          setNotifEnabled(true);
        } else {
          alert('Notification permission was denied. Please allow notifications in your browser site permissions.');
        }
      } else {
        notificationService.setNotificationsEnabled(true);
        setNotifEnabled(true);
      }
    }
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);
    try {
      if (updateProfile) {
        await updateProfile({ display_name: displayName });
      }
      if (onUpdateProfile) {
        onUpdateProfile({ ...userProfile, name: displayName, avatar });
      }
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error saving profile: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ==========================================
  // 2. BIKE MANAGEMENT STATE
  // ==========================================
  const [showBikeModal, setShowBikeModal] = useState(false);
  const [editingBike, setEditingBike] = useState(null);
  const [bikeForm, setBikeForm] = useState({
    name: '',
    registration_number: '',
    make: '',
    model: '',
    current_odometer_km: '0',
  });

  // Service Settings State for active vehicle
  const currentIntervalKm = serviceSettings?.interval_km || 2500;
  const [serviceInterval, setServiceInterval] = useState(String(currentIntervalKm));
  const [customIntervalInput, setCustomIntervalInput] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceSaveSuccess, setServiceSaveSuccess] = useState(false);

  useEffect(() => {
    if (serviceSettings?.interval_km) {
      setServiceInterval(String(serviceSettings.interval_km));
    }
  }, [serviceSettings]);

  const openAddBikeModal = () => {
    setEditingBike(null);
    setBikeForm({
      name: '',
      registration_number: '',
      make: '',
      model: '',
      current_odometer_km: '0',
    });
    setShowBikeModal(true);
  };

  const openEditBikeModal = (bike) => {
    setEditingBike(bike);
    setBikeForm({
      name: bike.name || '',
      registration_number: bike.registration_number || '',
      make: bike.make || '',
      model: bike.model || '',
      current_odometer_km: String(bike.current_odometer_km || 0),
    });
    setShowBikeModal(true);
  };

  const handleSaveBike = async (e) => {
    e.preventDefault();
    if (!bikeForm.name.trim()) {
      alert('Bike name is required.');
      return;
    }
    try {
      const payload = {
        name: bikeForm.name.trim(),
        registration_number: bikeForm.registration_number.trim(),
        make: bikeForm.make.trim(),
        model: bikeForm.model.trim(),
        current_odometer_km: parseFloat(bikeForm.current_odometer_km) || 0,
      };

      if (editingBike) {
        await updateVehicle(editingBike.id, payload);
      } else {
        const created = await addVehicle(payload);
        if (created?.id && vehicles.length === 0) {
          await selectVehicle(created.id);
        }
      }
      setShowBikeModal(false);
    } catch (err) {
      alert('Could not save bike: ' + err.message);
    }
  };

  const handleDeleteBike = async (bike) => {
    if (vehicles.length <= 1) {
      alert('You must have at least one bike in your garage.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${bike.name}"? This will permanently delete this bike and all associated records.`)) {
      try {
        await deleteVehicle(bike.id);
      } catch (err) {
        alert('Could not delete bike: ' + err.message);
      }
    }
  };

  const handleSaveServiceSettings = async (e) => {
    e?.preventDefault();
    if (!activeVehicle?.id) return;
    setIsSavingService(true);
    setServiceSaveSuccess(false);
    try {
      let intervalVal = parseInt(serviceInterval, 10);
      if (serviceInterval === 'custom') {
        intervalVal = parseInt(customIntervalInput, 10);
      }
      if (isNaN(intervalVal) || intervalVal <= 0) {
        alert('Please enter a valid positive interval in km.');
        setIsSavingService(false);
        return;
      }
      await updateServiceSettings({ interval_km: intervalVal });
      setServiceSaveSuccess(true);
      setTimeout(() => setServiceSaveSuccess(false), 3000);
    } catch (err) {
      alert('Could not save service interval: ' + err.message);
    } finally {
      setIsSavingService(false);
    }
  };

  // ==========================================
  // 3. CASH BOOK ACCOUNTS STATE
  // ==========================================
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({
    name: '',
    account_type: 'bank',
    opening_balance: '0',
    is_default: false,
    notes: '',
  });

  const openAddAccountModal = () => {
    setEditingAccount(null);
    setAccountForm({
      name: '',
      account_type: 'bank',
      opening_balance: '0',
      is_default: financialAccounts.length === 0,
      notes: '',
    });
    setShowAccountModal(true);
  };

  const openEditAccountModal = (acc) => {
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name || '',
      account_type: acc.account_type || 'bank',
      opening_balance: String(acc.opening_balance || 0),
      is_default: Boolean(acc.is_default),
      notes: acc.notes || '',
    });
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.name.trim()) {
      alert('Account name is required.');
      return;
    }
    try {
      const payload = {
        name: accountForm.name.trim(),
        account_type: accountForm.account_type,
        opening_balance: parseFloat(accountForm.opening_balance) || 0,
        is_default: accountForm.is_default,
        notes: accountForm.notes.trim(),
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
      } else {
        await addAccount(payload);
      }
      setShowAccountModal(false);
    } catch (err) {
      alert('Could not save account: ' + err.message);
    }
  };

  const handleDeleteAccount = async (acc) => {
    if (window.confirm(`Are you sure you want to delete account "${acc.name}"?`)) {
      try {
        await deleteAccount(acc.id);
      } catch (err) {
        alert(err.message || 'Cannot delete account with existing transactions.');
      }
    }
  };

  // ==========================================
  // 4. CASH BOOK CATEGORIES STATE
  // ==========================================
  const [categoryTypeTab, setCategoryTypeTab] = useState('expense'); // 'expense' | 'income'
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    category_type: 'expense',
    icon: 'Tag',
    sort_order: '0',
  });
  const [usageCounts, setUsageCounts] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const counts = await getCategoryUsageCounts();
        if (isMounted) setUsageCounts(counts || {});
      } catch (err) {
        console.error('[SettingsScreen] Error fetching category counts:', err);
      }
    };
    fetchCounts();
    return () => { isMounted = false; };
  }, [cashBookCategories, getCategoryUsageCounts]);

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      category_type: categoryTypeTab,
      icon: categoryTypeTab === 'expense' ? 'Tag' : 'TrendingUp',
      sort_order: String((cashBookCategories.filter(c => c.category_type === categoryTypeTab).length || 0) + 1),
    });
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name || '',
      category_type: cat.category_type || 'expense',
      icon: cat.icon || 'Tag',
      sort_order: String(cat.sort_order || 0),
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert('Category name is required.');
      return;
    }
    try {
      const payload = {
        name: categoryForm.name.trim(),
        category_type: categoryForm.category_type,
        icon: categoryForm.icon,
        sort_order: parseInt(categoryForm.sort_order, 10) || 0,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await addCategory(payload);
      }
      setShowCategoryModal(false);
    } catch (err) {
      alert('Could not save category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const count = usageCounts[cat.id] || 0;
    if (count > 0) {
      alert(`Cannot delete category "${cat.name}" because it is currently used by ${count} transaction(s).\n\nPlease Archive this category instead so it will not appear for new transactions while preserving your past ledger integrity.`);
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete category "${cat.name}"?`)) {
      try {
        await deleteCategory(cat.id);
      } catch (err) {
        alert('Could not delete category: ' + err.message);
      }
    }
  };

  // ==========================================
  // 5. EXPORT REPORTS
  // ==========================================
  const handleExportJSON = () => {
    const exportData = {
      metadata: {
        appName: 'Apex Expenses Tracker',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        userEmail: user?.email,
      },
      vehicles,
      fuelRecords: records,
      serviceRecords,
      repairRecords,
      trips,
      documents,
      reminders,
      financialAccounts,
      cashBookEntries,
      cashBookCategories,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_tracker_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCashBookCSV = () => {
    const headers = ['Date', 'Type', 'Account', 'Category', 'Amount', 'Description', 'Reference', 'Notes'];
    const rows = (cashBookEntries || []).map(e => {
      const accName = (financialAccounts || []).find(a => a.id === e.account_id)?.name || 'Unknown';
      return [
        `"${e.entry_date || ''}"`,
        `"${e.entry_type || ''}"`,
        `"${accName.replace(/"/g, '""')}"`,
        `"${(e.category || '').replace(/"/g, '""')}"`,
        e.amount || 0,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        `"${(e.reference || '').replace(/"/g, '""')}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash_book_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFuelCSV = () => {
    const headers = ['Date', 'Vehicle', 'Start_Odo', 'End_Odo', 'Distance_KM', 'Litres', 'Rate_Per_Litre', 'Total_Cost', 'Mileage_KMPL', 'Cost_Per_KM', 'Notes'];
    const rows = (records || []).map(r => {
      const vehName = (vehicles || []).find(v => v.id === r.vehicleId)?.name || 'Default';
      return [
        `"${r.date || ''}"`,
        `"${vehName.replace(/"/g, '""')}"`,
        r.startOdometer || 0,
        r.endOdometer || 0,
        r.distance || 0,
        r.fuelAmount || 0,
        r.rate || 0,
        r.totalCost || 0,
        r.mileage || 0,
        r.costPerKm || 0,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuel_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // 6. DANGER ZONE MODAL STATE
  // ==========================================
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [dangerStep, setDangerStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isWipingData, setIsWipingData] = useState(false);

  const handleDangerReset = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') return;
    setIsWipingData(true);
    try {
      await resetAllAppData();
      setShowDangerModal(false);
      setDangerStep(1);
      setDeleteConfirmText('');
      alert('All application data has been successfully wiped clean. Your account remains logged in.');
      onBack();
    } catch (err) {
      console.error('[SettingsScreen] Data wipe failed:', err);
      alert('Failed to delete application data: ' + err.message);
    } finally {
      setIsWipingData(false);
    }
  };

  const getAccountTypeIcon = (type) => {
    switch (type) {
      case 'bank': return <Landmark size={14} className="text-blue-500" />;
      case 'cash': return <Wallet size={14} className="text-emerald-500" />;
      case 'wallet': return <Smartphone size={14} className="text-purple-500" />;
      case 'upi': return <Smartphone size={14} className="text-cyan-500" />;
      case 'credit_card': return <CreditCard size={14} className="text-amber-500" />;
      default: return <Wallet size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 animate-in slide-in-from-right duration-300 overflow-y-auto">
      
      {/* 1. Header */}
      <div className="glass-panel-glow border-b border-slate-200 dark:border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
            title="Return to Cockpit"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-base md:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Settings size={18} className="text-emerald-600 dark:text-emerald-400" />
              Settings & Configuration
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Manage your bikes, cloud sync, cash book ledger, and system preferences
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} className="text-indigo-600" />
              )}
            </button>
          )}

          {user && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  signOut();
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Segmented Navigation Bar */}
      <div className="glass-panel border-b border-slate-200 dark:border-white/10 sticky top-[61px] z-10 px-2 py-2">
        <div className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'general', label: 'General', icon: ShieldCheck },
            { id: 'bikes', label: `Bikes (${vehicles.length})`, icon: Bike },
            { id: 'accounts', label: `Accounts (${financialAccounts.length})`, icon: Wallet },
            { id: 'categories', label: `Categories (${cashBookCategories.length})`, icon: Tag },
            { id: 'export', label: 'Export', icon: Download },
            { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? tab.danger
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : tab.danger
                      ? 'text-rose-500 hover:bg-rose-500/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Contents */}
      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full flex-1 space-y-6">

        {/* ======================================================== */}
        {/* TAB 1: GENERAL (PROFILE, PREFERENCES, ABOUT) */}
        {/* ======================================================== */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* User Profile Card */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  Rider Profile
                </h3>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Supabase Auth Active
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <AvatarUpload
                  currentImage={avatar}
                  onImageChange={(img) => setAvatar(img)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Rajiv"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-xs font-bold focus:outline-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                      Email Address (Cloud Login)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'rider@example.com'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/50 dark:border-white/5 text-xs font-mono text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {profileSaveSuccess && (
                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Profile Saved!
                    </span>
                  )}
                  {!profileSaveSuccess && <div />}

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* App Preferences */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
                <Layers size={16} className="text-cyan-500" />
                App Preferences
              </h3>

              <div className="space-y-3">
                {/* Theme Preference */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {theme === 'dark' ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-500" />}
                      Appearance Mode
                    </h4>
                    <p className="text-[11px] text-slate-500">Currently using {theme === 'dark' ? 'Dark Cockpit' : 'Light Cockpit'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>

                {/* Notifications Preference */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {notifEnabled ? <Bell size={14} className="text-emerald-500" /> : <BellOff size={14} className="text-slate-400" />}
                      Reminders Notification System
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {notifSupported 
                        ? notifEnabled 
                          ? 'Active: PWA alerts when reminders or odometer thresholds trigger' 
                          : 'Disabled: Enable browser alerts for overdue service and documents'
                        : 'Notifications not supported on this browser'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    disabled={!notifSupported}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                      notifEnabled
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                    }`}
                  >
                    {notifEnabled ? 'Enabled' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>

            {/* About & Cloud Health */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
                <RefreshCw size={16} className="text-teal-500" />
                About & Cloud Status
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Application</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">Apex Expenses Tracker</span>
                  <span className="block text-[10px] text-slate-400">Release v2.5.0 Production</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Cloud Backend</span>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase Live Connected
                  </div>
                  <span className="block text-[10px] text-slate-400 font-mono truncate">
                    {user?.id ? `UID: ${user.id.substring(0, 8)}...` : 'Connected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: BIKE MANAGEMENT (MY BIKES & SERVICE SETTINGS) */}
        {/* ======================================================== */}
        {activeTab === 'bikes' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* My Bikes Header & List */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Bike size={16} className="text-emerald-500" />
                    Garage Machines ({vehicles.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Switch active bike, edit specs, or add new machines</p>
                </div>
                <button
                  type="button"
                  onClick={openAddBikeModal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} /> Add Bike
                </button>
              </div>

              <div className="space-y-3">
                {vehicles.map((v) => {
                  const isActive = v.id === activeVehicle?.id;
                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs'
                          : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-white/5'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {v.name}
                            </h4>
                            {isActive && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                                Active Machine
                              </span>
                            )}
                            {!v.is_active && (
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                            {v.registration_number && (
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                {v.registration_number}
                              </span>
                            )}
                            {(v.make || v.model) && (
                              <span>{[v.make, v.model].filter(Boolean).join(' • ')}</span>
                            )}
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {(v.current_odometer_km || 0).toLocaleString('en-IN')} km
                            </span>
                          </div>
                        </div>

                        {/* Bike Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => selectVehicle(v.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              Set Active
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditBikeModal(v)}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            title="Edit bike specs"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBike(v)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete bike"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Settings for Active Vehicle */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Wrench size={16} className="text-amber-500" />
                    Service Interval Settings
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Target maintenance frequency for <strong className="text-slate-700 dark:text-slate-300">{activeVehicle?.name || 'Active Bike'}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveServiceSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2">
                    Service Interval (Kilometres)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['2000', '2500', 'custom'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setServiceInterval(opt)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          serviceInterval === opt
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10'
                        }`}
                      >
                        {opt === 'custom' ? 'Custom KM' : `${opt} km`}
                      </button>
                    ))}
                  </div>

                  {serviceInterval === 'custom' && (
                    <div className="mt-3">
                      <input
                        type="number"
                        min="100"
                        step="50"
                        placeholder="e.g. 3000"
                        value={customIntervalInput}
                        onChange={(e) => setCustomIntervalInput(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold focus:outline-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* Service Calculation Preview */}
                {nextServiceDue && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Latest Completed Service:</span>
                      <span className="font-bold font-mono">
                        {nextServiceDue.lastServiceOdometerKm ? `${nextServiceDue.lastServiceOdometerKm.toLocaleString('en-IN')} km` : 'No service logged'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Next Due Threshold:</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                        {nextServiceDue.nextTargetKm ? `${nextServiceDue.nextTargetKm.toLocaleString('en-IN')} km` : 'N/A'}
                      </span>
                    </div>
                    {nextServiceDue.remainingKm != null && (
                      <div className="flex justify-between border-t border-amber-500/20 pt-1 mt-1 font-bold">
                        <span>Due Status:</span>
                        <span className={nextServiceDue.status === 'overdue' ? 'text-rose-500' : 'text-emerald-500'}>
                          {nextServiceDue.status === 'overdue' ? `Overdue by ${Math.abs(nextServiceDue.remainingKm)} km` : `${nextServiceDue.remainingKm} km remaining`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  {serviceSaveSuccess && (
                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Service Interval Saved!
                    </span>
                  )}
                  {!serviceSaveSuccess && <div />}

                  <button
                    type="submit"
                    disabled={isSavingService}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingService ? 'Saving...' : 'Save Interval'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CASH BOOK ACCOUNTS */}
        {/* ======================================================== */}
        {activeTab === 'accounts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Wallet size={16} className="text-cyan-500" />
                    Financial Accounts ({financialAccounts.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure bank accounts, cash in hand, UPI, and credit cards</p>
                </div>
                <button
                  type="button"
                  onClick={openAddAccountModal}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} /> Add Account
                </button>
              </div>

              <div className="space-y-3">
                {financialAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      acc.is_default
                        ? 'bg-cyan-500/10 border-cyan-500/50'
                        : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getAccountTypeIcon(acc.account_type)}
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {acc.name}
                          </h4>
                          {acc.is_default && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                          {!acc.is_active && (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span className="capitalize">{acc.account_type} Account</span>
                          <span>•</span>
                          <span>Opening: <strong className="text-slate-700 dark:text-slate-300 font-mono">₹{(acc.opening_balance || 0).toLocaleString('en-IN')}</strong></span>
                          {acc.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{acc.notes}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {!acc.is_default && (
                          <button
                            type="button"
                            onClick={() => setDefaultAccount(acc.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                          >
                            Make Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deactivateAccount(acc.id, !acc.is_active)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            acc.is_active
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {acc.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditAccountModal(acc)}
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                          title="Edit account"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CASH BOOK CATEGORIES */}
        {/* ======================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Tag size={16} className="text-emerald-500" />
                    Transaction Categories
                  </h3>
                  <p className="text-[11px] text-slate-500">Manage category masters for expenses and income entries</p>
                </div>
                <button
                  type="button"
                  onClick={openAddCategoryModal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 self-start sm:self-auto shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} /> Add Category
                </button>
              </div>

              {/* Expense / Income Pill Switcher */}
              <div className="flex gap-2 p-1 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl max-w-xs">
                <button
                  type="button"
                  onClick={() => setCategoryTypeTab('expense')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    categoryTypeTab === 'expense'
                      ? 'bg-white dark:bg-rose-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Expense ({cashBookCategories.filter(c => c.category_type === 'expense').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTypeTab('income')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    categoryTypeTab === 'income'
                      ? 'bg-white dark:bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Income ({cashBookCategories.filter(c => c.category_type === 'income').length})
                </button>
              </div>

              {/* Categories List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {cashBookCategories
                  .filter(c => c.category_type === categoryTypeTab)
                  .map(cat => {
                    const count = usageCounts[cat.id] || 0;
                    return (
                      <div
                        key={cat.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                          cat.is_active
                            ? 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-white/5'
                            : 'bg-slate-100/50 dark:bg-slate-900/20 border-dashed border-slate-300 dark:border-white/10 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            cat.category_type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            <Tag size={14} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {cat.name}
                              </span>
                              {!cat.is_active && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500 font-bold">
                                  Archived
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {count} transaction{count === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => archiveCategory(cat.id, !cat.is_active)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                            title={cat.is_active ? 'Archive category' : 'Unarchive category'}
                          >
                            <Archive size={13} className={!cat.is_active ? 'text-amber-500' : ''} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditCategoryModal(cat)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                            title="Edit category"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              count > 0 
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                                : 'text-rose-500 hover:bg-rose-500/10 cursor-pointer'
                            }`}
                            title={count > 0 ? `Used by ${count} entries (Cannot delete, archive instead)` : 'Delete category'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: EXPORT REPORTS */}
        {/* ======================================================== */}
        {activeTab === 'export' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="border-b border-slate-200 dark:border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Download size={16} className="text-emerald-500" />
                  Data Reports & Analytics Export
                </h3>
                <p className="text-[11px] text-slate-500">
                  Export structured copies of your motorcycle logs and financial accounts for spreadsheet analysis
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Full JSON Export */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                      <FileText size={18} />
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Full App Data (JSON)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Complete snapshot containing all vehicles, fuel logs, service history, trips, documents, and cash ledger.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} /> Download JSON
                  </button>
                </div>

                {/* Cash Book CSV */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-2">
                      <Wallet size={18} />
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Cash Book Ledger (CSV)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Spreadsheet CSV of all income, expense, and transfer transactions with accounts and categories.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCashBookCSV}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} /> Download CSV
                  </button>
                </div>

                {/* Fuel Records CSV */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                      <Fuel size={18} />
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Fuel Log History (CSV)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Tabular refill history including fuel volume, rates, odometers, calculated mileage, and cost per km.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportFuelCSV}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} /> Download CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: DANGER ZONE (DELETE ALL APP DATA) */}
        {/* ======================================================== */}
        {activeTab === 'danger' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="glass-panel p-5 rounded-3xl border border-rose-500/40 shadow-sm space-y-4 bg-rose-500/5">
              <div className="flex items-center gap-2 text-rose-500 border-b border-rose-500/20 pb-3">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-extrabold uppercase tracking-wider">
                  Danger Zone — Irreversible Data Reset
                </h3>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <p>
                  This destructive operation permanently wipes all records associated with your account from Supabase Cloud:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1">
                  <li>All Vehicles & garage profiles</li>
                  <li>All Fuel refill logs & trash bin items</li>
                  <li>All Service & maintenance history</li>
                  <li>All Repair logs & workshop invoices</li>
                  <li>All GPS Trip logs and coordinates</li>
                  <li>All Documents and files in cloud storage (`user-files`)</li>
                  <li>All Expiry reminders</li>
                  <li>All Financial Accounts & Cash Book ledger entries</li>
                  <li>All Custom categories</li>
                </ul>
                <p className="font-bold text-rose-600 dark:text-rose-400 pt-2">
                  Your Supabase user login will remain intact, and you can start using the application immediately with a blank state.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDangerStep(1);
                    setDeleteConfirmText('');
                    setShowDangerModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Trash2 size={15} /> Delete All App Data
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT BIKE */}
      {/* ======================================================== */}
      {showBikeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="glass-panel bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Bike size={16} className="text-emerald-500" />
                {editingBike ? 'Edit Machine Specifications' : 'Add Machine to Garage'}
              </h3>
              <button onClick={() => setShowBikeModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBike} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Machine Name*
                </label>
                <input
                  type="text"
                  required
                  value={bikeForm.name}
                  onChange={(e) => setBikeForm({ ...bikeForm, name: e.target.value })}
                  placeholder="e.g. Yamaha R15"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Registration No.
                  </label>
                  <input
                    type="text"
                    value={bikeForm.registration_number}
                    onChange={(e) => setBikeForm({ ...bikeForm, registration_number: e.target.value })}
                    placeholder="KA 05 EQ 1234"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Current Odo (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={bikeForm.current_odometer_km}
                    onChange={(e) => setBikeForm({ ...bikeForm, current_odometer_km: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Make / Brand
                  </label>
                  <input
                    type="text"
                    value={bikeForm.make}
                    onChange={(e) => setBikeForm({ ...bikeForm, make: e.target.value })}
                    placeholder="e.g. Yamaha"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={bikeForm.model}
                    onChange={(e) => setBikeForm({ ...bikeForm, model: e.target.value })}
                    placeholder="e.g. V4"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowBikeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-sm"
                >
                  Save Bike
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT ACCOUNT */}
      {/* ======================================================== */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="glass-panel bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet size={16} className="text-cyan-500" />
                {editingAccount ? 'Edit Financial Account' : 'Add Financial Account'}
              </h3>
              <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Account Name*
                </label>
                <input
                  type="text"
                  required
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="e.g. HDFC Main Bank"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Account Type*
                  </label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="wallet">Digital Wallet</option>
                    <option value="upi">UPI</option>
                    <option value="credit_card">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acc_default"
                  checked={accountForm.is_default}
                  onChange={(e) => setAccountForm({ ...accountForm, is_default: e.target.checked })}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="acc_default" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Set as primary default account
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={accountForm.notes}
                  onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                  placeholder="e.g. Account No. ending in 4321"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD / EDIT CATEGORY */}
      {/* ======================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="glass-panel bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Tag size={16} className="text-emerald-500" />
                {editingCategory ? 'Edit Category' : 'Create Master Category'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Category Name*
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Fuel, Toll, Maintenance"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Category Type*
                  </label>
                  <select
                    value={categoryForm.category_type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, category_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.sort_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: 2-STEP DANGER ZONE DATA RESET */}
      {/* ======================================================== */}
      {showDangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel bg-white dark:bg-[#12080d] rounded-3xl border border-rose-500/50 w-full max-w-lg p-6 shadow-2xl space-y-4">
            
            {/* Header */}
            <div className="flex items-center gap-2 text-rose-500 border-b border-rose-500/20 pb-3">
              <AlertTriangle size={20} />
              <h3 className="font-black text-base uppercase tracking-wide">
                Reset All Application Data (Step {dangerStep} of 2)
              </h3>
            </div>

            {/* Step 1: Warning Details */}
            {dangerStep === 1 && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-700 dark:text-slate-200 font-bold leading-relaxed">
                  You are about to completely wipe all your records from the cloud database and storage buckets.
                </p>
                <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-2xl space-y-1.5 text-slate-600 dark:text-slate-300">
                  <p className="font-extrabold text-rose-500">The following data will be permanently destroyed:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400 pl-1">
                    <li>All vehicles, odometers, and service intervals</li>
                    <li>All fuel refills, pending records, and trash bin items</li>
                    <li>All maintenance logs and repair records</li>
                    <li>All GPS trips and recorded track points</li>
                    <li>All documents and attached receipt files in cloud storage</li>
                    <li>All active and completed reminders</li>
                    <li>All financial accounts, cash ledger entries, and categories</li>
                  </ul>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Your Supabase user credentials will remain active so you do not have to sign up again.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowDangerModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDangerStep(2)}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Type DELETE Confirmation */}
            {dangerStep === 2 && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-700 dark:text-slate-200 font-bold">
                  Final safeguard: To confirm permanent wiping of all records, please type <span className="font-mono text-rose-500 font-extrabold uppercase bg-rose-500/10 px-1.5 py-0.5 rounded">DELETE</span> in capital letters:
                </p>

                <input
                  type="text"
                  autoFocus
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-rose-500/40 focus:border-rose-500 text-sm font-mono font-bold tracking-wider text-rose-600 dark:text-rose-400 focus:outline-none"
                />

                <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    disabled={isWipingData}
                    onClick={() => setDangerStep(1)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                  >
                    Back
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isWipingData}
                      onClick={() => setShowDangerModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleteConfirmText.trim() !== 'DELETE' || isWipingData}
                      onClick={handleDangerReset}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-md shadow-rose-600/40 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isWipingData ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Wiping Data...
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} /> Wipe Everything Permanently
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
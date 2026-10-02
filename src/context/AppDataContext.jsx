// src/context/AppDataContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { vehicleService } from '../services/vehicleService';
import { fuelService } from '../services/fuelService';
import { serviceService } from '../services/serviceService';
import { repairService } from '../services/repairService';
import { tripService } from '../services/tripService';
import { documentService } from '../services/documentService';
import { reminderService } from '../services/reminderService';
import { cashBookService } from '../services/cashBookService';

const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
  const { user } = useAuth();

  // Active Area ('vehicles' | 'cash_book')
  const [activeArea, setActiveArea] = useState('vehicles');

  // Vehicles state
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicle, setActiveVehicleState] = useState(null);

  // Fuel records state
  const [records, setRecords] = useState([]);
  const [pendingFuelRecord, setPendingFuelRecord] = useState(null);
  const [bin, setBin] = useState([]);

  // Service & Repairs state
  const [serviceSettings, setServiceSettings] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [repairRecords, setRepairRecords] = useState([]);

  // Trips state
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);

  // Documents & Reminders state
  const [documents, setDocuments] = useState([]);
  const [reminders, setReminders] = useState([]);

  // Cash Book state (Completely separate financial ledger)
  const [cashBookEntries, setCashBookEntries] = useState([]);
  const [cashBookSummary, setCashBookSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0, entriesCount: 0 });

  const [dataLoading, setDataLoading] = useState(false);

  // Load Vehicles for User
  const loadVehicles = useCallback(async () => {
    if (!user) {
      setVehicles([]);
      setActiveVehicleState(null);
      return [];
    }
    try {
      const list = await vehicleService.getVehicles(user.id);
      setVehicles(list);
      const active = list.find(v => v.is_active) || list[0] || null;
      setActiveVehicleState(active);
      return list;
    } catch (err) {
      console.error('[AppDataContext] Error loading vehicles:', err);
      return [];
    }
  }, [user]);

  // Load All Vehicle Sub-Entities for Active Vehicle
  const loadVehicleData = useCallback(async (vehicleId) => {
    if (!vehicleId) {
      setRecords([]);
      setPendingFuelRecord(null);
      setBin([]);
      setServiceSettings(null);
      setServiceRecords([]);
      setRepairRecords([]);
      setTrips([]);
      setActiveTrip(null);
      setDocuments([]);
      setReminders([]);
      return;
    }

    try {
      setDataLoading(true);
      const [
        fuelRecs,
        pendingRec,
        binRecs,
        settings,
        services,
        repairs,
        tripList,
        activeTrp,
        docs,
        rems
      ] = await Promise.all([
        fuelService.getFuelRecords(vehicleId).catch(() => []),
        fuelService.getPendingFuelRecord(vehicleId).catch(() => null),
        fuelService.getDeletedRecords(vehicleId).catch(() => []),
        serviceService.getServiceSettings(vehicleId).catch(() => null),
        serviceService.getServiceRecords(vehicleId).catch(() => []),
        repairService.getRepairs(vehicleId).catch(() => []),
        tripService.getTrips(vehicleId).catch(() => []),
        tripService.getActiveTrip(vehicleId).catch(() => null),
        documentService.getDocuments(vehicleId).catch(() => []),
        reminderService.getReminders(vehicleId).catch(() => []),
      ]);

      setRecords(fuelRecs);
      setPendingFuelRecord(pendingRec);
      setBin(binRecs);
      setServiceSettings(settings);
      setServiceRecords(services);
      setRepairRecords(repairs);
      setTrips(tripList);
      setActiveTrip(activeTrp);
      setDocuments(docs);
      setReminders(rems);
    } catch (err) {
      console.error('[AppDataContext] Error loading vehicle data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Load Cash Book Data
  const loadCashBook = useCallback(async () => {
    if (!user) {
      setCashBookEntries([]);
      setCashBookSummary({ totalIncome: 0, totalExpense: 0, netBalance: 0, entriesCount: 0 });
      return;
    }
    try {
      const [entries, summary] = await Promise.all([
        cashBookService.getEntries(user.id),
        cashBookService.getSummary(user.id),
      ]);
      setCashBookEntries(entries);
      setCashBookSummary(summary);
    } catch (err) {
      console.error('[AppDataContext] Error loading cash book:', err);
    }
  }, [user]);

  // Initial load on user authentication change
  useEffect(() => {
    if (user) {
      loadVehicles();
      loadCashBook();
    } else {
      setVehicles([]);
      setActiveVehicleState(null);
      setRecords([]);
      setPendingFuelRecord(null);
      setBin([]);
      setServiceSettings(null);
      setServiceRecords([]);
      setRepairRecords([]);
      setTrips([]);
      setActiveTrip(null);
      setDocuments([]);
      setReminders([]);
      setCashBookEntries([]);
      setCashBookSummary({ totalIncome: 0, totalExpense: 0, netBalance: 0, entriesCount: 0 });
    }
  }, [user, loadVehicles, loadCashBook]);

  // When active vehicle changes, refresh its related telemetry and data
  useEffect(() => {
    if (activeVehicle?.id) {
      loadVehicleData(activeVehicle.id);
    }
  }, [activeVehicle?.id, loadVehicleData]);

  // Next Service Calculation
  const nextServiceCalculation = useMemo(() => {
    const curOdo = activeVehicle?.current_odometer_km || 0;
    const intv = serviceSettings?.interval_km || 2000;
    return serviceService.calculateNextService(curOdo, serviceRecords, intv);
  }, [activeVehicle?.current_odometer_km, serviceRecords, serviceSettings?.interval_km]);

  // Vehicle Actions
  const selectVehicle = async (vehicleId) => {
    if (!user || !vehicleId) return;
    const activated = await vehicleService.setActiveVehicle(user.id, vehicleId);
    setActiveVehicleState(activated);
    setVehicles(prev => prev.map(v => ({ ...v, is_active: v.id === vehicleId })));
  };

  const addVehicle = async (vehicleData) => {
    if (!user) throw new Error('Not authenticated');
    const newVeh = await vehicleService.createVehicle(user.id, vehicleData);
    setVehicles(prev => [...prev, newVeh]);
    if (newVeh.is_active || vehicles.length === 0) {
      setActiveVehicleState(newVeh);
    }
    return newVeh;
  };

  const updateVehicle = async (vehicleId, updates) => {
    const updated = await vehicleService.updateVehicle(vehicleId, updates);
    setVehicles(prev => prev.map(v => v.id === vehicleId ? updated : v));
    if (activeVehicle?.id === vehicleId) {
      setActiveVehicleState(updated);
    }
    return updated;
  };

  const deleteVehicle = async (vehicleId) => {
    await vehicleService.deleteVehicle(vehicleId);
    const remaining = vehicles.filter(v => v.id !== vehicleId);
    setVehicles(remaining);
    if (activeVehicle?.id === vehicleId) {
      const nextActive = remaining[0] || null;
      if (nextActive && user) {
        await selectVehicle(nextActive.id);
      } else {
        setActiveVehicleState(null);
      }
    }
  };

  // Fuel Actions
  const addCompletedFuelRecord = async (fuelData) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle or user');
    const created = await fuelService.createCompletedFuelRecord(activeVehicle.id, user.id, fuelData);
    setRecords(prev => [...prev, created].sort((a, b) => new Date(a.date) - new Date(b.date)));
    if (fuelData.newReading || fuelData.end_odometer_km) {
      const newKm = parseFloat(fuelData.newReading || fuelData.end_odometer_km);
      setActiveVehicleState(prev => prev ? { ...prev, current_odometer_km: newKm } : prev);
    }
    return created;
  };

  const addPendingFuelRecord = async (fuelData) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle or user');
    const pending = await fuelService.createPendingFuelRecord(activeVehicle.id, user.id, fuelData);
    setPendingFuelRecord(pending);
    return pending;
  };

  const completePendingRecord = async (endOdometerKm, additionalUpdates = {}) => {
    if (!pendingFuelRecord?.id || !activeVehicle?.id) return;
    
    const dbUpdates = {};
    if (additionalUpdates.amount !== undefined) dbUpdates.amount = parseFloat(additionalUpdates.amount);
    if (additionalUpdates.rate !== undefined) dbUpdates.rate_per_litre = parseFloat(additionalUpdates.rate);
    if (additionalUpdates.date) dbUpdates.refill_at = new Date(additionalUpdates.date).toISOString();
    if (additionalUpdates.notes !== undefined) dbUpdates.notes = additionalUpdates.notes;

    const completed = await fuelService.completePendingFuelRecord(
      pendingFuelRecord.id,
      activeVehicle.id,
      endOdometerKm,
      dbUpdates
    );
    setPendingFuelRecord(null);
    setRecords(prev => [...prev, completed].sort((a, b) => new Date(a.date) - new Date(b.date)));
    setActiveVehicleState(prev => prev ? { ...prev, current_odometer_km: parseFloat(endOdometerKm) } : prev);
    return completed;
  };

  const updateFuelRecord = async (recordId, updates) => {
    if (!recordId) return;
    const updated = await fuelService.updateFuelRecord(recordId, activeVehicle?.id, updates);
    setRecords(prev => prev.map(r => r.id === recordId ? updated : r));
    return updated;
  };

  const moveToBin = async (recordId) => {
    await fuelService.softDeleteFuelRecord(recordId);
    const target = records.find(r => r.id === recordId);
    if (target) {
      setRecords(prev => prev.filter(r => r.id !== recordId));
      setBin(prev => [target, ...prev]);
    }
  };

  const restoreFromBin = async (recordId) => {
    await fuelService.restoreFuelRecord(recordId);
    const target = bin.find(r => r.id === recordId);
    if (target) {
      setBin(prev => prev.filter(r => r.id !== recordId));
      setRecords(prev => [...prev, target].sort((a, b) => new Date(a.date) - new Date(b.date)));
    }
  };

  const permanentDelete = async (recordId) => {
    await fuelService.permanentlyDeleteFuelRecord(recordId);
    setBin(prev => prev.filter(r => r.id !== recordId));
  };

  const bulkImportFuelRecords = async (recordsList) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle');
    const imported = await fuelService.bulkImportRecords(activeVehicle.id, user.id, recordsList);
    setRecords(prev => [...prev, ...imported].sort((a, b) => new Date(a.date) - new Date(b.date)));
    return imported;
  };

  // Service Actions
  const updateServiceSettings = async (settings) => {
    if (!activeVehicle?.id || !user) return;
    const updated = await serviceService.updateServiceSettings(activeVehicle.id, user.id, settings);
    setServiceSettings(updated);
    return updated;
  };

  const addServiceRecord = async (serviceData) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle');
    const created = await serviceService.createServiceRecord(activeVehicle.id, user.id, serviceData);
    setServiceRecords(prev => [created, ...prev]);
    // Refresh settings since last_service_odometer_km was updated
    setServiceSettings(prev => ({
      ...prev,
      last_service_odometer_km: parseFloat(serviceData.odometer_km),
    }));
    return created;
  };

  const deleteServiceRecord = async (recordId) => {
    await serviceService.deleteServiceRecord(recordId);
    setServiceRecords(prev => prev.filter(r => r.id !== recordId));
  };

  // Repair Actions
  const addRepairRecord = async (repairData) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle');
    const created = await repairService.createRepair(activeVehicle.id, user.id, repairData);
    setRepairRecords(prev => [created, ...prev]);
    return created;
  };

  const deleteRepairRecord = async (repairId) => {
    await repairService.deleteRepair(repairId);
    setRepairRecords(prev => prev.filter(r => r.id !== repairId));
  };

  // Trip Actions
  const startTrip = async (startCoords) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle');
    const trip = await tripService.startTrip(activeVehicle.id, user.id, startCoords);
    setActiveTrip(trip);
    return trip;
  };

  const completeTrip = async (stats, endCoords) => {
    if (!activeTrip?.id) return;
    const completed = await tripService.completeTrip(activeTrip.id, stats, endCoords);
    setActiveTrip(null);
    setTrips(prev => [completed, ...prev]);
    return completed;
  };

  const discardTrip = async () => {
    if (!activeTrip?.id) return;
    await tripService.discardTrip(activeTrip.id);
    setActiveTrip(null);
  };

  const deleteTrip = async (tripId) => {
    await tripService.deleteTrip(tripId);
    setTrips(prev => prev.filter(t => t.id !== tripId));
  };

  // Document Actions
  const addDocument = async (docData) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle');
    const created = await documentService.uploadDocument(activeVehicle.id, user.id, docData);
    setDocuments(prev => [created, ...prev]);
    return created;
  };

  const deleteDocument = async (docId, filePath) => {
    await documentService.deleteDocument(docId, filePath);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Reminder Actions
  const addReminder = async (remData) => {
    if (!activeVehicle?.id || !user) throw new Error('No active vehicle');
    const created = await reminderService.createReminder(activeVehicle.id, user.id, remData);
    setReminders(prev => [...prev, created]);
    return created;
  };

  const completeReminder = async (remId) => {
    const updated = await reminderService.completeReminder(remId);
    setReminders(prev => prev.map(r => r.id === remId ? updated : r));
    return updated;
  };

  const deleteReminder = async (remId) => {
    await reminderService.deleteReminder(remId);
    setReminders(prev => prev.filter(r => r.id !== remId));
  };

  // Cash Book Actions (Independent from vehicles)
  const addCashBookEntry = async (entryData) => {
    if (!user) throw new Error('Not authenticated');
    const created = await cashBookService.createEntry(user.id, entryData);
    setCashBookEntries(prev => [created, ...prev]);
    await loadCashBook();
    return created;
  };

  const updateCashBookEntry = async (id, updates) => {
    const updated = await cashBookService.updateEntry(id, updates);
    setCashBookEntries(prev => prev.map(e => e.id === id ? updated : e));
    await loadCashBook();
    return updated;
  };

  const deleteCashBookEntry = async (id) => {
    await cashBookService.deleteEntry(id);
    setCashBookEntries(prev => prev.filter(e => e.id !== id));
    await loadCashBook();
  };

  const value = {
    // Area switch
    activeArea,
    setActiveArea,

    // Vehicles
    vehicles,
    activeVehicle,
    selectVehicle,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    loadVehicles,

    // Fuel Records
    records,
    pendingFuelRecord,
    bin,
    addCompletedFuelRecord,
    addPendingFuelRecord,
    completePendingRecord,
    updateFuelRecord,
    moveToBin,
    restoreFromBin,
    permanentDelete,
    bulkImportFuelRecords,

    // Service & Maintenance
    serviceSettings,
    serviceRecords,
    nextServiceDue: nextServiceCalculation,
    updateServiceSettings,
    addServiceRecord,
    deleteServiceRecord,

    // Repairs
    repairRecords,
    addRepairRecord,
    deleteRepairRecord,

    // Trips & GPS
    trips,
    activeTrip,
    startTrip,
    completeTrip,
    discardTrip,
    deleteTrip,

    // Documents & Reminders
    documents,
    addDocument,
    deleteDocument,
    reminders,
    addReminder,
    completeReminder,
    deleteReminder,

    // Cash Book
    cashBookEntries,
    cashBookSummary,
    addCashBookEntry,
    updateCashBookEntry,
    deleteCashBookEntry,
    refreshCashBook: loadCashBook,

    // General status
    dataLoading,
    refreshAllData: () => {
      loadVehicles();
      if (activeVehicle?.id) loadVehicleData(activeVehicle.id);
      loadCashBook();
    }
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

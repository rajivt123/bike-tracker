// src/screens/DocumentsRemindersScreen.jsx
import React, { useState } from 'react';
import { notificationService } from '../services/notificationService';
import { BellRing } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { 
  FileText, 
  Bell, 
  UploadCloud, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ExternalLink, 
  Calendar, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

export default function DocumentsRemindersScreen({ onBack }) {
  const { 
    documents, 
    reminders, 
    addDocument, 
    deleteDocument, 
    addReminder, 
    completeReminder, 
    deleteReminder 
  } = useAppData();

  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'reminders'
  const [showDocModal, setShowDocModal] = useState(false);
  const [showRemModal, setShowRemModal] = useState(false);

  // Document form
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('insurance');
  const [docExpiry, setDocExpiry] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docNotes, setDocNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Reminder form
  const [remTitle, setRemTitle] = useState('');
  const [remType, setRemType] = useState('insurance');
  const [remDueDate, setRemDueDate] = useState('');
  const [remDueKm, setRemDueKm] = useState('');
  const [remNotes, setRemNotes] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(notificationService.isNotificationsEnabled());
  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      notificationService.setNotificationsEnabled(false);
      setNotificationsEnabled(false);
    } else {
      const perm = await notificationService.requestPermission();
      setNotificationsEnabled(perm === 'granted');
    }
  };


  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docTitle) return;
    setIsUploading(true);
    try {
      await addDocument({
        title: docTitle,
        document_type: docType,
        expiry_date: docExpiry || null,
        notes: docNotes,
        file: docFile,
      });
      setShowDocModal(false);
      setDocTitle('');
      setDocExpiry('');
      setDocFile(null);
      setDocNotes('');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!remTitle) return;
    try {
      await addReminder({
        title: remTitle,
        reminder_type: remType,
        due_date: remDueDate || null,
        due_odometer_km: remDueKm || null,
        notes: remNotes,
      });
      setShowRemModal(false);
      setRemTitle('');
      setRemDueDate('');
      setRemDueKm('');
      setRemNotes('');
    } catch (err) {
      alert('Failed to save reminder: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-y-auto pb-24 md:pb-8">
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <ChevronLeft size={16} /> Cockpit
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={13} /> Vault & Reminders
          </div>
        </div>

        {/* Action Bar & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 p-1 bg-slate-200/80 dark:bg-slate-900/80 rounded-2xl border border-slate-300 dark:border-white/10 text-xs font-bold w-fit">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} /> Documents Vault ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'reminders'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bell size={14} /> Reminders ({reminders.filter(r => r.status === 'active').length})
            </button>
          </div>

          <div>
            {activeTab === 'documents' ? (
              <button
                onClick={() => setShowDocModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} /> Upload Document
              </button>
            ) : (
              <button
                onClick={() => setShowRemModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} /> Add Reminder
              </button>
            )}
          </div>
        </div>

        {/* 1. DOCUMENTS VAULT CONTENT */}
        {activeTab === 'documents' ? (
          documents.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
              <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400">
                <FileText size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No documents uploaded</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Upload your RC Book, Insurance Policy, PUC certificate, and Bills to your private cloud vault.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/20">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {doc.title}
                        </p>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {doc.document_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        {doc.expiry_date ? (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar size={12} /> Exp: {doc.expiry_date}
                          </span>
                        ) : (
                          <span>Permanent</span>
                        )}
                        {doc.notes && <span>• {doc.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Download / View document"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this document?')) {
                          deleteDocument(doc.id, doc.file_path);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
                    <>
          {/* 2. REMINDERS CONTENT */}
          <div className="mb-4 flex items-center justify-between glass-panel p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-2">
              <BellRing size={18} className={notificationsEnabled ? 'text-cyan-500' : 'text-slate-400'} />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">System Notifications</p>
                <p className="text-[10px] text-slate-500">Get alerts for due dates and milestones</p>
              </div>
            </div>
                        <button 
              onClick={toggleNotifications}
              disabled={!notificationService.isSupported()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!notificationService.isSupported() ? 'bg-rose-500/10 text-rose-500 cursor-not-allowed' : notificationsEnabled ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}
            >
              {!notificationService.isSupported() ? 'Unavailable' : notificationsEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>


          reminders.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
              <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Bell size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No active reminders</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Schedule notifications for Insurance renewal, PUC testing, or custom odometer milestones.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reminders.map((rem) => {
                const isCompleted = rem.status === 'completed';
                return (
                  <div
                    key={rem.id}
                    className={`glass-card p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      isCompleted 
                        ? 'opacity-60 border-slate-200 dark:border-white/5' 
                        : 'border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => completeReminder(rem.id)}
                        disabled={isCompleted}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-300 dark:border-white/10 hover:text-emerald-500'
                        }`}
                        title={isCompleted ? 'Completed' : 'Mark as complete'}
                      >
                        <CheckCircle size={18} />
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {rem.title}
                          </p>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {rem.reminder_type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 font-mono">
                          {rem.due_date && <span>Due: {rem.due_date}</span>}
                          {rem.due_odometer_km && <span>At: {rem.due_odometer_km} KM</span>}
                          {rem.notes && <span className="font-sans">• {rem.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm('Delete this reminder?')) {
                          deleteReminder(rem.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )
          </>
        )}

      </div>

      {/* MODAL: UPLOAD DOCUMENT */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">Upload Vehicle Document</h3>
            <form onSubmit={handleUploadDoc} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Document Title*</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Bike RC Smart Card, ICICI Insurance"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                  >
                    <option value="insurance">Insurance Policy</option>
                    <option value="puc">PUC Certificate</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Attach File (PDF or Image)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-700 dark:file:text-emerald-300 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Policy number or reference..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD REMINDER */}
      {showRemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">Set Vehicle Reminder</h3>
            <form onSubmit={handleCreateReminder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Reminder Title*</label>
                <input
                  type="text"
                  required
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="e.g. Renew Two-Wheeler Insurance"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Category</label>
                <select
                  value={remType}
                  onChange={(e) => setRemType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                >
                  <option value="insurance">Insurance Policy Renewal</option>
                  <option value="puc">PUC Emission Test</option>
                  <option value="service">Periodic Service Check</option>
                  <option value="custom">Custom Reminder</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={remDueDate}
                    onChange={(e) => setRemDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Due Odometer (KM)</label>
                  <input
                    type="number"
                    step="any"
                    value={remDueKm}
                    onChange={(e) => setRemDueKm(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Notes</label>
                <input
                  type="text"
                  value={remNotes}
                  onChange={(e) => setRemNotes(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black shadow-md shadow-cyan-500/20"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


import React, { useState, useRef } from 'react';
import { Contact } from '../types';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { SAMPLE_CONTACTS_DATA } from '../data/pythonScriptTemplate';
import { MapsLeadFinderModal } from './MapsLeadFinderModal';

interface ContactsManagerTabProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  onProceedToAI: () => void;
}

export const ContactsManagerTab: React.FC<ContactsManagerTabProps> = ({
  contacts,
  setContacts,
  onProceedToAI,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newContext, setNewContext] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isMapsModalOpen, setIsMapsModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Append newly discovered leads from Google Maps
  const handleImportMapsLeads = (newLeads: Contact[]) => {
    setContacts((prev) => [...newLeads, ...prev]);
  };

  // File Upload Handler (.xlsx, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          setUploadError('The uploaded file is empty.');
          return;
        }

        // Validate columns
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow).map((k) => k.trim());
        const hasName = keys.some((k) => /name/i.test(k));
        const hasEmail = keys.some((k) => /email/i.test(k));

        if (!hasName || !hasEmail) {
          setUploadError("File must include 'Name' and 'Email' columns. 'CustomContext' is highly recommended.");
        }

        const parsedContacts: Contact[] = jsonData.map((row, index) => {
          // Normalize column lookups
          const nameKey = Object.keys(row).find((k) => /^name$/i.test(k.trim())) || 'Name';
          const emailKey = Object.keys(row).find((k) => /^email$/i.test(k.trim())) || 'Email';
          const contextKey =
            Object.keys(row).find((k) => /context|custom|notes|bio/i.test(k.trim())) || 'CustomContext';

          return {
            id: `uploaded-${Date.now()}-${index}`,
            Name: String(row[nameKey] || '').trim(),
            Email: String(row[emailKey] || '').trim(),
            CustomContext: String(row[contextKey] || '').trim(),
            status: 'pending' as const,
          };
        }).filter((c) => c.Name && c.Email);

        if (parsedContacts.length === 0) {
          setUploadError('No valid contacts with Name and Email could be found.');
          return;
        }

        setContacts(parsedContacts);
      } catch (err: any) {
        setUploadError(`Failed to parse file: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Sample contacts.xlsx file
  const handleDownloadSampleXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(
      SAMPLE_CONTACTS_DATA.map(({ Name, Email, CustomContext }) => ({
        Name,
        Email,
        CustomContext,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, 'contacts.xlsx');
  };

  // Load sample demo contacts
  const handleLoadSampleContacts = () => {
    setContacts(
      SAMPLE_CONTACTS_DATA.map((c) => ({
        ...c,
        status: 'pending',
      }))
    );
    setUploadError(null);
  };

  // Add single manual contact
  const handleAddSingleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newContact: Contact = {
      id: `manual-${Date.now()}`,
      Name: newName.trim(),
      Email: newEmail.trim(),
      CustomContext: newContext.trim(),
      status: 'pending',
    };

    setContacts((prev) => [newContact, ...prev]);
    setNewName('');
    setNewEmail('');
    setNewContext('');
    setIsAdding(false);
  };

  // Delete contact
  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.Email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.CustomContext.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Contacts Manager ({contacts.length} Loaded)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Import your <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-700 dark:text-indigo-300 text-xs">contacts.xlsx</code> spreadsheet with columns: <strong>Name</strong>, <strong>Email</strong>, and <strong>CustomContext</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload contacts.xlsx
          </button>

          <button
            onClick={() => setIsMapsModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Search targeted B2B leads from any location on Google Maps"
          >
            <MapPin className="w-4 h-4 text-emerald-100" />
            <span>Search Leads via Google Maps</span>
          </button>

          <button
            onClick={handleDownloadSampleXlsx}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download formatted sample contacts.xlsx"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Sample XLSX
          </button>

          <button
            onClick={handleLoadSampleContacts}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Load sample test contacts"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Load Demo Data
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Search & Add Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or context..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Cancel' : 'Add Contact'}
          </button>

          {contacts.length > 0 && (
            <button
              onClick={onProceedToAI}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate Emails with Gemini →
            </button>
          )}
        </div>
      </div>

      {/* Manual Add Form */}
      {isAdding && (
        <form
          onSubmit={handleAddSingleContact}
          className="bg-indigo-50/50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-xs space-y-3"
        >
          <div className="font-semibold text-slate-900 dark:text-slate-100">Add New Contact</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jordan Hayes"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jordan@company.com"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Custom Context (Background/Notes)</label>
              <input
                type="text"
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                placeholder="e.g. VP Tech at Delta, met at PyCon, scaling k8s cluster"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
            >
              Save Contact
            </button>
          </div>
        </form>
      )}

      {/* Contacts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No contacts loaded</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Upload your contacts spreadsheet or click "Load Demo Data" to test the AI email personalizer.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleLoadSampleContacts}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Load 5 Demo Contacts
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4 w-48">Recipient Name</th>
                  <th className="py-3 px-4 w-60">Email Address</th>
                  <th className="py-3 px-4">Custom Context (AI Angle)</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContacts.map((contact, idx) => (
                  <tr key={contact.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {contact.Name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {contact.Email}
                    </td>
                    <td className="py-3 px-4">
                      {contact.CustomContext ? (
                        <span className="text-slate-700 dark:text-slate-300 line-clamp-2" title={contact.CustomContext}>
                          {contact.CustomContext}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">No specific context provided</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {contact.generatedSubject ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-700">
                          Pending AI
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Google Maps Location Lead Discovery Modal */}
      <MapsLeadFinderModal
        isOpen={isMapsModalOpen}
        onClose={() => setIsMapsModalOpen(false)}
        onImportLeads={handleImportMapsLeads}
        existingContacts={contacts}
      />
    </div>
  );
};

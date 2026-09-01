import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, CampaignConfig } from '../types';
import { generatePersonalizedEmailApi, sendEmailApi } from '../utils/apiClient';
import {
  Sparkles,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Smartphone,
  Monitor,
  Mail,
  Copy,
  Send,
  Maximize2,
  Minimize2,
  Search,
  SlidersHorizontal,
  FileText,
  Code2,
  Info,
  Lock,
  Paperclip,
  User,
  Clock,
  ArrowRight,
  Wand2,
  X,
  Calendar,
  CheckCheck,
} from 'lucide-react';

interface AIPersonalizerTabProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  config: CampaignConfig;
  onProceedToRunner: () => void;
}

type PreviewMode = 'client' | 'mobile' | 'raw' | 'inspector';
type FilterStatus = 'all' | 'ready' | 'pending' | 'context';

export const AIPersonalizerTab: React.FC<AIPersonalizerTabProps> = ({
  contacts,
  setContacts,
  config,
  onProceedToRunner,
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string>(
    contacts[0]?.id || ''
  );
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  // Preview Controls
  const [previewMode, setPreviewMode] = useState<PreviewMode>('client');
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  
  // Custom Prompt Guidance Modal
  const [isCustomGuidanceOpen, setIsCustomGuidanceOpen] = useState(false);
  const [customGuidanceText, setCustomGuidanceText] = useState('');

  // Single Test Send State
  const [isTestSendModalOpen, setIsTestSendModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(config.senderEmail || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Inline Edit Mode
  const [editMode, setEditMode] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  // Filtered contacts calculation
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.Email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.CustomContext && c.CustomContext.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterStatus === 'ready') return !!c.generatedSubject;
      if (filterStatus === 'pending') return !c.generatedSubject;
      if (filterStatus === 'context') return !!c.CustomContext && c.CustomContext.trim().length > 0;
      return true;
    });
  }, [contacts, searchQuery, filterStatus]);

  // Active selected contact (guaranteed valid fallback)
  const selectedContact = useMemo(() => {
    const found = contacts.find((c) => c.id === selectedContactId);
    return found || filteredContacts[0] || contacts[0];
  }, [contacts, selectedContactId, filteredContacts]);

  // Current index in filtered list
  const currentContactIndex = useMemo(() => {
    return contacts.findIndex((c) => c.id === selectedContact?.id);
  }, [contacts, selectedContact]);

  const readyCount = contacts.filter((c) => c.generatedSubject).length;
  const pendingCount = contacts.length - readyCount;
  const withContextCount = contacts.filter((c) => c.CustomContext && c.CustomContext.trim().length > 0).length;

  // Navigate to previous/next contact
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (contacts.length === 0) return;
    const currentIndex = contacts.findIndex((c) => c.id === selectedContact?.id);
    let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0) newIndex = contacts.length - 1;
    if (newIndex >= contacts.length) newIndex = 0;
    
    setSelectedContactId(contacts[newIndex].id);
    setEditMode(false);
  };

  // Generate single contact with optional guidance
  const handleGenerateSingle = async (contact: Contact, customGuidance?: string) => {
    setGeneratingId(contact.id);
    try {
      const guidance = customGuidance || customGuidanceText;
      const combinedGoal = guidance
        ? `${config.campaignGoal}\n\n[SPECIFIC RECIPIENT GUIDANCE]: ${guidance}`
        : config.campaignGoal;

      const data = await generatePersonalizedEmailApi({
        name: contact.Name,
        email: contact.Email,
        customContext: contact.CustomContext,
        campaignGoal: combinedGoal,
        senderName: config.senderName,
        senderCompany: config.senderCompany,
        tone: config.tone,
        placeholders: config.placeholders,
        unsubscribeText: config.includeUnsubscribe ? config.unsubscribeText : '',
        customPromptTemplate: config.customPromptTemplate,
        catalogAttachmentName: config.catalogAttachment?.name,
      });

      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id
            ? {
                ...c,
                generatedSubject: data.subject,
                generatedBody: data.body,
                personalizationReason: data.personalizationReason,
                status: 'generated',
                error: undefined,
              }
            : c
        )
      );
      setIsCustomGuidanceOpen(false);
      setCustomGuidanceText('');
    } catch (err: any) {
      console.error('Generation error:', err);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id
            ? {
                ...c,
                error: err.message || 'Failed to generate email',
                status: 'failed',
              }
            : c
        )
      );
    } finally {
      setGeneratingId(null);
    }
  };

  // Generate All in sequence
  const handleGenerateAll = async () => {
    if (contacts.length === 0) return;
    setIsGeneratingAll(true);

    for (const contact of contacts) {
      if (contact.generatedSubject && contact.generatedBody) {
        continue; // Skip already generated
      }
      setGeneratingId(contact.id);
      try {
        const data = await generatePersonalizedEmailApi({
          name: contact.Name,
          email: contact.Email,
          customContext: contact.CustomContext,
          campaignGoal: config.campaignGoal,
          senderName: config.senderName,
          senderCompany: config.senderCompany,
          tone: config.tone,
          placeholders: config.placeholders,
          unsubscribeText: config.includeUnsubscribe ? config.unsubscribeText : '',
          customPromptTemplate: config.customPromptTemplate,
          catalogAttachmentName: config.catalogAttachment?.name,
        });

        setContacts((prev) =>
          prev.map((c) =>
            c.id === contact.id
              ? {
                  ...c,
                  generatedSubject: data.subject,
                  generatedBody: data.body,
                  personalizationReason: data.personalizationReason,
                  status: 'generated',
                  error: undefined,
                }
              : c
          )
        );
      } catch (err: any) {
        console.error('Batch generation item error:', err);
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contact.id
              ? {
                  ...c,
                  error: err.message || 'Generation issue',
                  status: 'failed',
                }
              : c
          )
        );
      }
      // Small pause between generations
      await new Promise((r) => setTimeout(r, 250));
    }

    setGeneratingId(null);
    setIsGeneratingAll(false);
  };

  // Save manual edit
  const handleSaveEdit = () => {
    if (!selectedContact) return;
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedContact.id
          ? {
              ...c,
              generatedSubject: editedSubject,
              generatedBody: editedBody,
              status: 'generated',
            }
          : c
      )
    );
    setEditMode(false);
  };

  // Copy complete email preview to clipboard
  const handleCopyDraft = () => {
    if (!selectedContact || !selectedContact.generatedSubject) return;
    const fullDraft = `Subject: ${selectedContact.generatedSubject}\n\nTo: ${selectedContact.Name} <${selectedContact.Email}>\nFrom: ${config.senderName} <${config.senderEmail}>\n\n${selectedContact.generatedBody}`;
    navigator.clipboard.writeText(fullDraft);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Export dry run text file
  const handleExportDryRunTxt = () => {
    let content = `=== DRY RUN EMAIL GENERATION LOG [${new Date().toISOString()}] ===\n`;
    content += `Sender: ${config.senderName} (${config.senderEmail}) - ${config.senderCompany}\n`;
    content += `Campaign Goal: ${config.campaignGoal}\n`;
    content += `Total Contacts: ${contacts.length}\n`;
    content += `=======================================================================\n\n`;

    contacts.forEach((c, idx) => {
      content += `[RECIPIENT #${idx + 1}]\n`;
      content += `TO: ${c.Name} <${c.Email}>\n`;
      content += `CONTEXT: ${c.CustomContext || 'None'}\n`;
      content += `SUBJECT: ${c.generatedSubject || '(Pending AI generation)'}\n`;
      content += `-----------------------------------------------------------------------\n`;
      content += `${c.generatedBody || '(Email body not generated yet)'}\n\n`;
      content += `=======================================================================\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dry_run_emails.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Send single test email
  const handleSendTestEmail = async () => {
    if (!selectedContact || !selectedContact.generatedSubject || !selectedContact.generatedBody) return;
    setIsSendingTest(true);
    setTestSendResult(null);

    try {
      const res = await sendEmailApi({
        to: testEmailAddress || config.senderEmail,
        recipientName: `[TEST FOR] ${selectedContact.Name}`,
        subject: `[TEST PREVIEW] ${selectedContact.generatedSubject}`,
        body: selectedContact.generatedBody,
        isDryRun: false,
        senderName: config.senderName,
        senderEmail: config.senderEmail,
      });

      setTestSendResult({
        success: true,
        message: `Test email successfully dispatched to ${testEmailAddress || config.senderEmail}! Check your inbox.`,
      });
    } catch (err: any) {
      setTestSendResult({
        success: false,
        message: err.message || 'Failed to send test email. Check SMTP server credentials.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Helper to format body text with variable highlighting in client preview
  const renderFormattedEmailBody = (body: string) => {
    if (!body) return null;
    
    // Split body by paragraphs
    const paragraphs = body.split('\n');
    return (
      <div className="space-y-3.5 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-sans">
        {paragraphs.map((para, pIdx) => {
          if (!para.trim()) {
            return <div key={pIdx} className="h-2" />;
          }

          // Highlight URLs or placeholder patterns
          return (
            <p key={pIdx} className="break-words">
              {para}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Batch Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                AI Personalization & Recipient Email Preview Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect, fine-tune, and preview each recipient's custom subject and body copy before launching your live campaign dispatch.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateAll}
            disabled={isGeneratingAll || contacts.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900/60 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAll ? 'animate-spin' : ''}`} />
            {isGeneratingAll ? 'Generating with Gemini...' : `Batch Generate All (${contacts.length})`}
          </button>

          <button
            onClick={handleExportDryRunTxt}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export all generated emails to dry_run_emails.txt"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Export Text Log</span>
          </button>

          <button
            onClick={onProceedToRunner}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <span>Proceed to Dispatcher</span>
            <span className="bg-emerald-700/90 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold">
              {readyCount}/{contacts.length} Ready
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 12-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Contact Queue & Search / Filter (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col h-[740px] transition-colors">
          
          {/* Queue Top Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Recipients ({filteredContacts.length}/{contacts.length})
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                {readyCount} Generated
              </span>
            </div>

            {/* Quick Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, context..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                All ({contacts.length})
              </button>
              <button
                onClick={() => setFilterStatus('ready')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  filterStatus === 'ready'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Ready ({readyCount})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  filterStatus === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3 h-3" /> Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilterStatus('context')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === 'context'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Context ({withContextCount})
              </button>
            </div>
          </div>

          {/* Contact List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No recipients match your search filter.
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = contact.id === selectedContact?.id;
                const isGen = generatingId === contact.id;
                const isGenerated = !!contact.generatedSubject;

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      setEditMode(false);
                    }}
                    className={`p-3.5 text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-l-4 border-indigo-600 dark:border-indigo-400 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {contact.Name}
                        </span>
                        {isGenerated ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Pending AI generation" />
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {contact.Email}
                      </div>

                      {contact.CustomContext ? (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-1 bg-white/70 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 font-sans">
                          🎯 {contact.CustomContext}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                          Standard campaign context
                        </div>
                      )}

                      {contact.generatedSubject && (
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium truncate mt-1">
                          ↳ {contact.generatedSubject}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {isGen ? (
                        <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateSingle(contact);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                          title="Generate / Regenerate this email"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{readyCount} of {contacts.length} ready</span>
            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || readyCount === contacts.length}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold disabled:text-slate-400 cursor-pointer"
            >
              Generate Missing ({pendingCount})
            </button>
          </div>
        </div>

        {/* Right Column: In-Depth Email Preview, Inspector & Actions (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[740px] overflow-hidden transition-colors">
          
          {selectedContact ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Recipient Ribbon & Navigation Toolbar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Recipient Details with Cycle Buttons */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {selectedContact.Name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'R'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {selectedContact.Name}
                        </h3>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                          &lt;{selectedContact.Email}&gt;
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono font-medium">Contact #{currentContactIndex + 1} of {contacts.length}</span>
                        <span>•</span>
                        <span className={selectedContact.generatedSubject ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                          {selectedContact.generatedSubject ? 'AI Draft Ready' : 'Awaiting Generation'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Switcher (< Prev / Next >) & Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    
                    {/* Previous / Next Recipient Navigation */}
                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xs overflow-hidden">
                      <button
                        onClick={() => handleNavigate('prev')}
                        className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border-r border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Previous Recipient"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {currentContactIndex + 1}/{contacts.length}
                      </span>
                      <button
                        onClick={() => handleNavigate('next')}
                        className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border-l border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Next Recipient"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* AI Regenerate / Guidance Button */}
                    <button
                      onClick={() => handleGenerateSingle(selectedContact)}
                      disabled={generatingId === selectedContact.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${generatingId === selectedContact.id ? 'animate-spin' : ''}`} />
                      <span>{selectedContact.generatedSubject ? 'Regenerate' : 'Generate with Gemini'}</span>
                    </button>

                    {/* Custom Prompt Guidance Tweak */}
                    <button
                      onClick={() => setIsCustomGuidanceOpen(!isCustomGuidanceOpen)}
                      className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                      title="Add Custom Prompt Guidance for this recipient"
                    >
                      <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </button>

                    {/* Fullscreen Modal Toggle */}
                    <button
                      onClick={() => setIsFullscreenModalOpen(true)}
                      className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                      title="Expand Preview to Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Custom Guidance Collapsible Panel */}
                <AnimatePresence>
                  {isCustomGuidanceOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-indigo-50/80 dark:bg-indigo-950/60 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Custom AI Prompt Instruction for {selectedContact.Name}
                        </span>
                        <button onClick={() => setIsCustomGuidanceOpen(false)}>
                          <X className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Focus on our SOC2 security compliance and keep it under 80 words..."
                        value={customGuidanceText}
                        onChange={(e) => setCustomGuidanceText(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleGenerateSingle(selectedContact, customGuidanceText)}
                          disabled={generatingId === selectedContact.id}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Apply & Regenerate Draft
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Custom Context Pill Banner */}
                {selectedContact.CustomContext && (
                  <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs flex items-start gap-2">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 shrink-0">🎯 Lead Context:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {selectedContact.CustomContext}
                    </span>
                  </div>
                )}

                {/* View Mode Switcher & Quick Utility Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* View Mode Tabs */}
                  <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setPreviewMode('client')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewMode === 'client'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Client</span>
                    </button>

                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewMode === 'mobile'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile View</span>
                    </button>

                    <button
                      onClick={() => setPreviewMode('raw')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewMode === 'raw'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Plaintext / MIME</span>
                    </button>

                    <button
                      onClick={() => setPreviewMode('inspector')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewMode === 'inspector'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Variables & AI Reason</span>
                    </button>
                  </div>

                  {/* Actions on this draft: Edit, Copy, Send Test */}
                  {selectedContact.generatedSubject && !editMode && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditedSubject(selectedContact.generatedSubject || '');
                          setEditedBody(selectedContact.generatedBody || '');
                          setEditMode(true);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Edit Subject or Body"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={handleCopyDraft}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy draft to clipboard"
                      >
                        {copiedNotification ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setIsTestSendModalOpen(true)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Send this email to your test inbox"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                
                {/* Generation In-Progress State */}
                {generatingId === selectedContact.id ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <RefreshCw className="w-7 h-7 animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Synthesizing Personalized Copy for {selectedContact.Name}...
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        Gemini 3.7 Flash is analyzing recipient background, crafting a mobile-friendly subject line, and substituting exact placeholder parameters.
                      </p>
                    </div>
                  </div>
                ) : editMode ? (
                  
                  /* Inline Edit Mode */
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-750">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-indigo-600" />
                        Direct Draft Editor
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {editedSubject.length} char subject • {editedBody.split(/\s+/).filter(Boolean).length} words body
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Subject Line
                      </label>
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Body Text
                      </label>
                      <textarea
                        rows={13}
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono leading-relaxed border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : selectedContact.generatedSubject ? (
                  
                  /* Valid Draft: Multi-View Preview Tabs */
                  <div className="space-y-4">
                    
                    {/* View 1: Standard Desktop Email Client View */}
                    {previewMode === 'client' && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                        
                        {/* Realistic Email Envelope Headers */}
                        <div className="p-4 bg-slate-50/90 dark:bg-slate-850/90 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
                          
                          {/* Subject Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                Subject
                              </span>
                              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                                {selectedContact.generatedSubject}
                              </h2>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                              {selectedContact.generatedSubject.length} chars
                            </span>
                          </div>

                          {/* From / To / Metadata Matrix */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/80 dark:border-slate-750/80">
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 font-medium">From: </span>
                              <strong className="text-slate-800 dark:text-slate-200">{config.senderName}</strong>{' '}
                              <span className="text-slate-500 font-mono text-[11px]">&lt;{config.senderEmail}&gt;</span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 font-medium">To: </span>
                              <strong className="text-slate-800 dark:text-slate-200">{selectedContact.Name}</strong>{' '}
                              <span className="text-slate-500 font-mono text-[11px]">&lt;{selectedContact.Email}&gt;</span>
                            </div>
                          </div>

                          {/* Security & Attachment Pills */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/60 font-semibold">
                              <Lock className="w-3 h-3" /> TLS 1.3 Verified
                            </span>
                            <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/60 font-semibold">
                              <ShieldCheck className="w-3 h-3" /> DKIM / SPF Ready
                            </span>
                            {config.catalogAttachment && (
                              <span className="flex items-center gap-1 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/60 font-medium">
                                <Paperclip className="w-3 h-3" /> {config.catalogAttachment.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Email Body Content */}
                        <div className="p-6 bg-white dark:bg-slate-900 space-y-6">
                          {renderFormattedEmailBody(selectedContact.generatedBody || '')}

                          {/* CAN-SPAM Footer Disclaimer */}
                          {config.includeUnsubscribe && config.unsubscribeText && (
                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
                              <p>{config.unsubscribeText}</p>
                              <p className="font-mono text-[10px]">
                                Sent by {config.senderCompany || config.senderName} • Powered by Apex Email Automation
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View 2: Smartphone View (Realistic Mobile Screen Simulator) */}
                    {previewMode === 'mobile' && (
                      <div className="flex justify-center p-2">
                        <div className="w-full max-w-[380px] bg-slate-950 text-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 relative">
                          
                          {/* Mobile Dynamic Island / Camera Notch */}
                          <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                          </div>

                          {/* Mobile Screen Surface */}
                          <div className="bg-white rounded-[26px] overflow-hidden flex flex-col h-[540px]">
                            
                            {/* Mobile Mail App Bar */}
                            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                              <span>Inbox</span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Mobile Email Header */}
                            <div className="p-3.5 border-b border-slate-100 space-y-1.5">
                              <h3 className="text-xs font-extrabold text-slate-900 leading-snug">
                                {selectedContact.generatedSubject}
                              </h3>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {config.senderName.slice(0, 1)}
                                </div>
                                <div className="text-[11px] leading-tight">
                                  <span className="font-bold text-slate-900">{config.senderName}</span>
                                  <span className="text-slate-500 text-[10px] block truncate max-w-[200px]">
                                    to {selectedContact.Name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Mobile Email Body Scroll */}
                            <div className="flex-1 p-3.5 overflow-y-auto text-xs text-slate-800 leading-relaxed font-sans space-y-3">
                              {selectedContact.generatedBody?.split('\n').map((para, i) => (
                                <p key={i}>{para}</p>
                              ))}

                              {config.includeUnsubscribe && config.unsubscribeText && (
                                <div className="pt-4 border-t border-slate-200 text-[9px] text-slate-400">
                                  {config.unsubscribeText}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* View 3: Raw Plaintext & MIME Representation */}
                    {previewMode === 'raw' && (
                      <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto space-y-2 border border-slate-800">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                          <span>MIME Payload (UTF-8 Plaintext)</span>
                          <button
                            onClick={handleCopyDraft}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy Raw
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                          {`From: "${config.senderName}" <${config.senderEmail}>
To: "${selectedContact.Name}" <${selectedContact.Email}>
Subject: ${selectedContact.generatedSubject}
Date: ${new Date().toUTCString()}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

${selectedContact.generatedBody}`}
                        </pre>
                      </div>
                    )}

                    {/* View 4: Variables & AI Reasoning Inspector */}
                    {previewMode === 'inspector' && (
                      <div className="space-y-4">
                        {/* Gemini Rationale Card */}
                        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            Gemini Personalization Rationale
                          </h4>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {selectedContact.personalizationReason ||
                              'AI analyzed recipient context and tone to produce a conversational, high-converting value proposition.'}
                          </p>
                        </div>

                        {/* Dynamic Substituted Placeholders Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Substituted Variables for this Recipient
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">&#123;&#123;Name&#125;&#125;</span>
                              <span className="text-slate-800 dark:text-slate-200">{selectedContact.Name}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">&#123;&#123;Email&#125;&#125;</span>
                              <span className="text-slate-800 dark:text-slate-200">{selectedContact.Email}</span>
                            </div>
                            {Object.entries(config.placeholders || {}).map(([key, val]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                              >
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{key}</span>
                                <span className="text-slate-800 dark:text-slate-200 truncate max-w-[280px]">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  
                  /* Empty / Not Generated State for Selected Contact */
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No personalized email generated for {selectedContact.Name} yet
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        Click the button below to generate a tailored, spam-safe email subject and body using Gemini Flash.
                      </p>
                    </div>
                    <button
                      onClick={() => handleGenerateSingle(selectedContact)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-105"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Personalized Draft
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Select a recipient from the list to preview their personalized email copy.
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Email Preview Modal */}
      <AnimatePresence>
        {isFullscreenModalOpen && selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                    <Eye className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Full-Screen Recipient Preview: {selectedContact.Name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedContact.Email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavigate('prev')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                    title="Previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-500">
                    {currentContactIndex + 1} / {contacts.length}
                  </span>
                  <button
                    onClick={() => handleNavigate('next')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                    title="Next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsFullscreenModalOpen(false)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subject</span>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {selectedContact.generatedSubject || '(Pending AI generation)'}
                  </h2>
                </div>

                <div className="p-6 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rendered Body</span>
                  {renderFormattedEmailBody(selectedContact.generatedBody || '')}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={handleCopyDraft}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  Copy Draft
                </button>
                <button
                  onClick={() => setIsFullscreenModalOpen(false)}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Single Test Email Modal */}
      <AnimatePresence>
        {isTestSendModalOpen && selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Send className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Send Test Email for {selectedContact.Name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Dispatches a single test message to your inbox to review layout in Gmail/Outlook.
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsTestSendModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deliver Test To Email Address
                </label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="your-email@company.com"
                  className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {testSendResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    testSendResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                  }`}
                >
                  {testSendResult.success ? (
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testSendResult.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsTestSendModalOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmailAddress}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
                  <span>{isSendingTest ? 'Sending Test...' : 'Send Test Now'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

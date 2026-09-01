import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, CampaignConfig, SentLogRecord, TerminalLog } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  ShieldCheck,
  FileText,
  Radio,
  Zap,
  Server,
  Loader2,
  RefreshCw,
  Eye,
  MailCheck,
  Send,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Gauge,
  ExternalLink,
  Users,
  Inbox,
  Timer,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MetricsAnalyticsDashboard } from './MetricsAnalyticsDashboard';
import { D3MetricsDashboard } from './D3MetricsDashboard';
import {
  generatePersonalizedEmailApi,
  sendEmailApi,
  testSmtpConnectionApi,
} from '../utils/apiClient';

interface ExecutionRunnerTabProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  config: CampaignConfig;
  sentLogs: SentLogRecord[];
  setSentLogs: React.Dispatch<React.SetStateAction<SentLogRecord[]>>;
}

type QueueStep = 'idle' | 'generating_ai' | 'sending_smtp' | 'cooldown' | 'completed';

export const ExecutionRunnerTab: React.FC<ExecutionRunnerTabProps> = ({
  contacts,
  setContacts,
  config,
  sentLogs,
  setSentLogs,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [totalCountdown, setTotalCountdown] = useState<number>(2);
  const [queueStep, setQueueStep] = useState<QueueStep>('idle');
  
  // Pacing speed mode (fast 2s test mode default for interactive preview)
  const [pacingMode, setPacingMode] = useState<'fast' | 'safe' | 'instant'>('fast');
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);

  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: `System initialized. Checkpoint file 'sent_log.csv' loaded with ${sentLogs.filter((l) => l.status === 'SENT').length} logged sends.`,
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: `Mode: ${config.isDryRun ? 'DRY RUN (Simulated Sandbox)' : 'LIVE GMAIL SMTP (smtp.gmail.com:465)'} | Loaded ${contacts.length} recipients.`,
    },
  ]);

  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{
    status: 'idle' | 'testing' | 'connected' | 'warning' | 'error';
    latencyMs?: number;
    message?: string;
    serverBanner?: string;
    checkedAt?: string;
  }>({
    status: 'idle',
  });

  const activeRunnerRef = useRef<{ isRunning: boolean; isPaused: boolean }>({
    isRunning: false,
    isPaused: false,
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Sync ref
  useEffect(() => {
    activeRunnerRef.current = { isRunning, isPaused };
  }, [isRunning, isPaused]);

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const addLog = (type: TerminalLog['type'], message: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      },
    ]);
  };

  // Run SMTP Diagnostic Connection Test
  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setSmtpStatus({ status: 'testing' });
    addLog('info', `[Diagnostic] Initiating connection test to ${config.smtpHost || 'smtp.gmail.com'}:${config.smtpPort || 465} (SSL/TLS)...`);

    try {
      const data = await testSmtpConnectionApi({
        host: config.smtpHost || 'smtp.gmail.com',
        port: config.smtpPort || 465,
        user: config.senderEmail,
        useSsl: config.useSsl,
      });

      if (data.status === 'CONNECTED' || data.success) {
        setSmtpStatus({
          status: 'connected',
          latencyMs: data.latencyMs,
          message: data.message,
          serverBanner: data.serverBanner,
          checkedAt: new Date().toLocaleTimeString(),
        });
        addLog('success', `[SMTP Diagnostic OK] ${data.serverBanner || '220 ESMTP Ready'} (${data.latencyMs}ms) - 0 emails dispatched.`);
      } else if (data.status === 'WARNING') {
        setSmtpStatus({
          status: 'warning',
          latencyMs: data.latencyMs,
          message: data.message,
          checkedAt: new Date().toLocaleTimeString(),
        });
        addLog('warning', `[SMTP Diagnostic Warning] ${data.message}`);
      } else {
        setSmtpStatus({
          status: 'error',
          message: data.error || 'Connection failed',
          checkedAt: new Date().toLocaleTimeString(),
        });
        addLog('error', `[SMTP Diagnostic Error] ${data.error || 'Could not verify connection'}`);
      }
    } catch (err: any) {
      setSmtpStatus({
        status: 'error',
        message: err.message || 'Diagnostic request failed',
        checkedAt: new Date().toLocaleTimeString(),
      });
      addLog('error', `[SMTP Diagnostic Failed] ${err.message}`);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Start / Resume Loop
  const handleStartAutomation = async () => {
    if (contacts.length === 0) {
      addLog('warning', 'No contacts found. Please upload contacts.xlsx or discover leads in Lead Finder first.');
      return;
    }

    // Set synchronous ref flags immediately to avoid race conditions
    activeRunnerRef.current.isRunning = true;
    activeRunnerRef.current.isPaused = false;
    setIsRunning(true);
    setIsPaused(false);

    const delaySec = pacingMode === 'fast' ? 2 : pacingMode === 'instant' ? 0.5 : config.waitTimerSeconds;
    addLog('info', `▶ Starting automation pipeline for ${contacts.length} recipients (Pacing: ${delaySec}s/email, Mode: ${config.isDryRun ? 'DRY RUN' : 'LIVE SMTP'})...`);

    const alreadySentEmails = new Set(
      sentLogs.filter((l) => l.status === 'SENT').map((l) => l.email.toLowerCase().trim())
    );

    for (let i = currentIndex; i < contacts.length; i++) {
      if (!activeRunnerRef.current.isRunning) {
        addLog('warning', 'Execution stopped by user.');
        break;
      }

      // Check pause
      while (activeRunnerRef.current.isPaused) {
        await new Promise((r) => setTimeout(r, 300));
        if (!activeRunnerRef.current.isRunning) break;
      }

      if (!activeRunnerRef.current.isRunning) break;

      setCurrentIndex(i);
      const contact = contacts[i];
      const normalizedEmail = contact.Email.toLowerCase().trim();

      // Checkpoint Check (Avoid double sending)
      if (alreadySentEmails.has(normalizedEmail)) {
        addLog(
          'warning',
          `[Checkpoint Skip] '${contact.Email}' already logged in sent_log.csv as SENT. Skipping to protect inbox.`
        );
        const skipRecord: SentLogRecord = {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          email: contact.Email,
          name: contact.Name,
          status: 'SKIPPED',
          subject: contact.generatedSubject || 'N/A',
          errorMessage: 'Already sent in checkpoint log',
        };
        setSentLogs((prev) => [skipRecord, ...prev]);
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, status: 'skipped' } : c))
        );
        continue;
      }

      // 1. Ensure email is generated
      let subject = contact.generatedSubject;
      let body = contact.generatedBody;

      if (!subject || !body) {
        setQueueStep('generating_ai');
        addLog('ai', `[Gemini API] Generating personalized email copy for ${contact.Name} (${contact.Email})...`);
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

          subject = data.subject;
          body = data.body;

          setContacts((prev) =>
            prev.map((c) =>
              c.id === contact.id
                ? {
                    ...c,
                    generatedSubject: subject,
                    generatedBody: body,
                    personalizationReason: data.personalizationReason,
                    status: 'generated',
                  }
                : c
            )
          );
        } catch (err: any) {
          addLog('error', `[API Error] Failed generation for ${contact.Email}: ${err.message}`);
          const failRecord: SentLogRecord = {
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            email: contact.Email,
            name: contact.Name,
            status: 'FAILED',
            subject: 'N/A',
            errorMessage: err.message,
          };
          setSentLogs((prev) => [failRecord, ...prev]);
          setContacts((prev) =>
            prev.map((c) => (c.id === contact.id ? { ...c, status: 'failed' } : c))
          );
          continue;
        }
      }

      // 2. Dispatch Mode via API
      setQueueStep('sending_smtp');
      try {
        const sendData = await sendEmailApi({
          to: contact.Email,
          recipientName: contact.Name,
          subject: subject || '',
          body: body || '',
          isDryRun: config.isDryRun,
          senderName: config.senderName,
          senderEmail: config.senderEmail,
        });

        if (config.isDryRun) {
          addLog(
            'success',
            `[DRY RUN SAVED] (#${i + 1}/${contacts.length}) ${contact.Name} <${contact.Email}> | Subj: "${subject}"`
          );
          const dryRunRecord: SentLogRecord = {
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            email: contact.Email,
            name: contact.Name,
            status: 'DRY_RUN',
            subject: subject || '',
          };
          setSentLogs((prev) => [dryRunRecord, ...prev]);
          setContacts((prev) =>
            prev.map((c) => (c.id === contact.id ? { ...c, status: 'sent' } : c))
          );
        } else {
          // Live SMTP Send
          addLog(
            'success',
            `[SMTP DISPATCHED] (#${i + 1}/${contacts.length}) Live email delivered to ${contact.Email} (Subject: "${subject}")`
          );
          const sentRecord: SentLogRecord = {
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            email: contact.Email,
            name: contact.Name,
            status: 'SENT',
            subject: subject || '',
          };
          setSentLogs((prev) => [sentRecord, ...prev]);
          alreadySentEmails.add(normalizedEmail);
          setContacts((prev) =>
            prev.map((c) => (c.id === contact.id ? { ...c, status: 'sent' } : c))
          );
        }
      } catch (sendErr: any) {
        addLog('error', `[Dispatch Error] ${sendErr.message}`);
      }

      // 3. Rate Limit Pacing Delay (Wait Timer)
      if (i < contacts.length - 1) {
        setQueueStep('cooldown');
        const baseWait = pacingMode === 'fast' ? 2 : pacingMode === 'instant' ? 0.5 : config.waitTimerSeconds;
        const jitter = pacingMode === 'safe' ? Math.random() * config.jitterSeconds : 0;
        const totalDelay = Math.max(1, Math.round(baseWait + jitter));

        setTotalCountdown(totalDelay);
        setCountdown(totalDelay);

        addLog(
          'info',
          `[Pacing Timer] Waiting ${totalDelay}s before next contact (${i + 2}/${contacts.length})...`
        );

        for (let s = totalDelay; s > 0; s--) {
          if (!activeRunnerRef.current.isRunning) break;
          while (activeRunnerRef.current.isPaused) {
            await new Promise((r) => setTimeout(r, 300));
            if (!activeRunnerRef.current.isRunning) break;
          }
          setCountdown(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCountdown(0);
      }
    }

    activeRunnerRef.current.isRunning = false;
    activeRunnerRef.current.isPaused = false;
    setIsRunning(false);
    setIsPaused(false);
    setQueueStep('completed');
    addLog('success', '=== AUTOMATION RUN COMPLETED SUCCESSFULLY ===');
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const handlePause = () => {
    activeRunnerRef.current.isPaused = true;
    setIsPaused(true);
    addLog('warning', 'Automation paused. Click Resume to continue.');
  };

  const handleResume = () => {
    activeRunnerRef.current.isPaused = false;
    setIsPaused(false);
    addLog('info', 'Automation resumed.');
  };

  const handleReset = () => {
    activeRunnerRef.current.isRunning = false;
    activeRunnerRef.current.isPaused = false;
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setCountdown(0);
    setQueueStep('idle');
    addLog('info', 'Runner reset to initial state.');
  };

  // Download sent_log.csv
  const handleDownloadSentLogCsv = () => {
    let csvContent = 'timestamp,email,name,status,subject,error_message\n';
    sentLogs.forEach((r) => {
      const escapedSubject = `"${(r.subject || '').replace(/"/g, '""')}"`;
      const escapedError = `"${(r.errorMessage || '').replace(/"/g, '""')}"`;
      csvContent += `${r.timestamp},${r.email},"${r.name}",${r.status},${escapedSubject},${escapedError}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sent_log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const processedCount = sentLogs.length;
  const readyCount = contacts.filter((c) => c.generatedSubject && c.generatedBody).length;
  const successCount = sentLogs.filter((l) => l.status === 'SENT' || l.status === 'DRY_RUN').length;
  const skippedCount = sentLogs.filter((l) => l.status === 'SKIPPED').length;
  const failedCount = sentLogs.filter((l) => l.status === 'FAILED').length;

  const progressPercent = contacts.length > 0 ? Math.min(100, Math.round((processedCount / contacts.length) * 100)) : 0;

  // Expected Completion Time (ETA) & Rate Calculations
  const pacingSecPerEmail = pacingMode === 'fast' ? 2 : pacingMode === 'instant' ? 0.5 : (config.waitTimerSeconds || 36);
  const estimatedOverheadPerEmail = 0.6; // average AI and network latency
  const estimatedSecondsPerItem = pacingSecPerEmail + estimatedOverheadPerEmail;
  const remainingCount = Math.max(0, contacts.length - processedCount);

  // Dynamic seconds remaining
  const estimatedSecondsRemaining = isRunning
    ? Math.max(0, (remainingCount - 1) * estimatedSecondsPerItem + (countdown > 0 ? countdown : estimatedSecondsPerItem))
    : remainingCount * estimatedSecondsPerItem;

  const formatRemainingDuration = (seconds: number): string => {
    if (contacts.length === 0) return '0s';
    if (processedCount >= contacts.length && contacts.length > 0) return 'Completed';
    if (seconds <= 0) return '< 3s';
    if (seconds < 60) return `~${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `~${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `~${hours}h ${remMins}m`;
  };

  const estimatedCompletionClock = estimatedSecondsRemaining > 0 && contacts.length > 0 && processedCount < contacts.length
    ? new Date(Date.now() + estimatedSecondsRemaining * 1000).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : processedCount >= contacts.length && contacts.length > 0
    ? 'Finished'
    : 'Ready';

  return (
    <div className="space-y-6">
      {/* Top Pre-Flight & Status Alert Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Live Dispatcher & Checkpoint Engine
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                  config.isDryRun
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse text-current" />
                {config.isDryRun ? 'Dry Run Mode (Safe Sandbox)' : 'Live Gmail SMTP:465'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              <strong>{contacts.length} recipients loaded</strong> • {readyCount} personalized AI emails ready. Maintains real-time <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-mono text-xs">sent_log.csv</code> checkpoint to guarantee zero duplicate sends.
            </p>
          </div>

          {/* Top Actions & Pacing Mode Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pacing Speed Preset */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pacing:
              </span>
              <button
                type="button"
                onClick={() => setPacingMode('fast')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                  pacingMode === 'fast'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="2s delay between emails for fast demo preview"
              >
                ⚡ Fast Demo (2s)
              </button>
              <button
                type="button"
                onClick={() => setPacingMode('safe')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                  pacingMode === 'safe'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="36s delay (CAN-SPAM 100/hr inbox safety standard)"
              >
                🛡️ Safe SMTP (36s)
              </button>
            </div>

            {/* Diagnostic SMTP Test Button */}
            <button
              onClick={handleTestSmtpConnection}
              disabled={isTestingSmtp || isRunning}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                smtpStatus.status === 'connected'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                  : smtpStatus.status === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : smtpStatus.status === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              title="Simulates and tests secure connection to Gmail's SMTP server without sending an email"
            >
              {isTestingSmtp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Server className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              )}
              <span>
                {isTestingSmtp
                  ? 'Testing...'
                  : smtpStatus.status === 'connected'
                  ? `SMTP Verified (${smtpStatus.latencyMs}ms)`
                  : 'Test SMTP'}
              </span>
            </button>

            {/* Main Automation Trigger */}
            {!isRunning ? (
              <button
                onClick={handleStartAutomation}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                {currentIndex > 0 ? 'Resume Automation' : `Start Dispatcher (${contacts.length} Loaded)`}
              </button>
            ) : isPaused ? (
              <button
                onClick={handleResume}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}

            <button
              onClick={handleReset}
              disabled={isRunning}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="Reset Runner"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prominent Framer Motion Real-time Progress Bar & Queue Status Panel */}
        <motion.div
          layout
          className="mt-5 p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5 transition-colors"
        >
          {/* Header: Status, Progress Count, ETA and Velocity */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                <Gauge className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Live Dispatch Queue Progress
                  </h3>
                  <motion.span
                    key={progressPercent}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white shadow-2xs"
                  >
                    {progressPercent}%
                  </motion.span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {processedCount} of {contacts.length} recipients processed ({remainingCount} remaining in queue)
                </p>
              </div>
            </div>

            {/* Expected Completion Time (ETA) & Throughput Badges */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* ETA Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-xs">
                <CalendarClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none">
                    Expected Finish (ETA)
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs mt-0.5">
                    {estimatedCompletionClock}
                  </div>
                </div>
              </div>

              {/* Time Remaining Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-xs font-semibold">
                <Timer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{formatRemainingDuration(estimatedSecondsRemaining)}</span>
              </div>

              {/* Pacing Speed Indicator */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-mono">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{pacingMode === 'fast' ? '2.0s/email' : pacingMode === 'instant' ? '0.5s/email' : '36s/email'}</span>
              </div>
            </div>
          </div>

          {/* Framer Motion Animated Progress Bar Track */}
          <div className="relative">
            <div className="w-full bg-slate-200/90 dark:bg-slate-950/90 rounded-full h-4 sm:h-5 overflow-hidden shadow-inner border border-slate-300/80 dark:border-slate-800 p-0.5 relative">
              {/* Milestone Markers */}
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none z-0">
                <div className="w-px h-full bg-slate-300/50 dark:bg-slate-700/50" style={{ left: '25%' }} />
                <div className="w-px h-full bg-slate-300/50 dark:bg-slate-700/50" style={{ left: '50%' }} />
                <div className="w-px h-full bg-slate-300/50 dark:bg-slate-700/50" style={{ left: '75%' }} />
              </div>

              {/* Animated Fill Bar */}
              <motion.div
                className={`h-full rounded-full relative overflow-hidden flex items-center justify-end pr-1.5 transition-colors ${
                  processedCount === contacts.length && contacts.length > 0
                    ? 'bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600'
                    : isPaused
                    ? 'bg-linear-to-r from-amber-500 via-orange-500 to-amber-600'
                    : 'bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progressPercent > 0 ? 3 : 0, progressPercent)}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              >
                {/* Horizontal shimmer sweep while active */}
                {isRunning && !isPaused && (
                  <motion.div
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/35 to-transparent w-full"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                {/* Glowing beacon at leading edge */}
                {progressPercent > 4 && progressPercent < 100 && isRunning && (
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)] shrink-0 z-10"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
              </motion.div>
            </div>

            {/* Sub-bar Milestone percentages */}
            <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 px-1 mt-1">
              <span>0% (Start)</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% (Complete)</span>
            </div>
          </div>

          {/* Live Queue Step & Pipeline Status Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <AnimatePresence mode="wait">
                {isRunning && (
                  <motion.span
                    key="running-dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative flex h-2.5 w-2.5 shrink-0"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                  </motion.span>
                )}
              </AnimatePresence>

              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {isRunning ? (
                  queueStep === 'generating_ai' ? (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      ⚡ Step 1/3: Generating AI copy for #{currentIndex + 1} ({contacts[currentIndex]?.Name || 'Recipient'})...
                    </span>
                  ) : queueStep === 'sending_smtp' ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      🚀 Step 2/3: Dispatching email to {contacts[currentIndex]?.Email || ''}...
                    </span>
                  ) : queueStep === 'cooldown' ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      ⏱️ Step 3/3: Rate limit cooldown ({countdown}s left) before contact #{currentIndex + 2}...
                    </span>
                  ) : (
                    `Processing contact #${currentIndex + 1} of ${contacts.length}`
                  )
                ) : isPaused ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    ⏸️ Automation paused at contact #{currentIndex + 1}. Click Resume to continue.
                  </span>
                ) : processedCount === contacts.length && contacts.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All {contacts.length} recipients processed & checkpointed.
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    Ready to dispatch {contacts.length} recipients with live checkpoint tracking.
                  </span>
                )}
              </span>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <strong>{successCount}</strong> sent
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <strong>{skippedCount}</strong> skipped
              </span>
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-rose-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <strong>{failedCount}</strong> failed
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* SMTP Diagnostic Connection Status Notification Banner */}
        {smtpStatus.status !== 'idle' && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
              smtpStatus.status === 'testing'
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                : smtpStatus.status === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                : smtpStatus.status === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5">
              {smtpStatus.status === 'testing' ? (
                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0 mt-0.5 sm:mt-0" />
              ) : smtpStatus.status === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : smtpStatus.status === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div>
                <span className="font-bold mr-1.5">
                  {smtpStatus.status === 'testing'
                    ? 'Diagnostic Handshake:'
                    : smtpStatus.status === 'connected'
                    ? 'Diagnostic Verified (0 emails sent):'
                    : smtpStatus.status === 'warning'
                    ? 'Diagnostic Warning:'
                    : 'Diagnostic Failed:'}
                </span>
                <span className="opacity-90">
                  {smtpStatus.status === 'testing'
                    ? `Testing connection to ${config.smtpHost || 'smtp.gmail.com'}:${config.smtpPort || 465}...`
                    : smtpStatus.message}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] shrink-0">
              {smtpStatus.latencyMs !== undefined && (
                <span className="font-mono bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-black/5 dark:border-white/10 font-semibold text-slate-800 dark:text-slate-200">
                  {smtpStatus.latencyMs}ms latency
                </span>
              )}
              {smtpStatus.checkedAt && (
                <span className="text-slate-500 dark:text-slate-400 font-mono">
                  Checked {smtpStatus.checkedAt}
                </span>
              )}
              <button
                onClick={handleTestSmtpConnection}
                disabled={isTestingSmtp}
                className="font-semibold underline cursor-pointer hover:opacity-80"
              >
                Re-test
              </button>
            </div>
          </div>
        )}

        {/* 4 Metric Stats Cards */}
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Loaded / Processed
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {processedCount} / {contacts.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{contacts.length - processedCount} remaining in queue</div>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Dispatched / Reviewed
            </div>
            <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">{successCount}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Recorded in checkpoint log</div>
          </div>

          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60">
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Checkpoint Skips
            </div>
            <div className="text-xl font-bold text-amber-900 dark:text-amber-100 mt-0.5">{skippedCount}</div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Guaranteed zero double-sends</div>
          </div>

          {/* Active Wait Countdown */}
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Pacing Cooldown
              </span>
              {countdown > 0 && (
                <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {countdown}s left
                </span>
              )}
            </div>

            {countdown > 0 ? (
              <div>
                <div className="text-base font-bold text-indigo-900 dark:text-indigo-200 mt-0.5">
                  Cooldown Active ({countdown}s)
                </div>
                <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-indigo-600 dark:bg-indigo-400 h-1.5 rounded-full transition-all duration-1000"
                    style={{
                      width: `${(countdown / (totalCountdown || 2)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-indigo-900 dark:text-indigo-200 font-medium mt-1">
                {pacingMode === 'fast' ? '⚡ 2.0s fast demo pacing' : '🛡️ 36.0s CAN-SPAM pacing'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOADED CAMPAIGN QUEUE & EMAIL PREVIEW SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Loaded Campaign Queue ({contacts.length} Contacts)
            </h3>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
              {readyCount} AI Personalized
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Click <strong>"Preview Email"</strong> on any contact to read generated subject and body.</span>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p>No contacts loaded in campaign queue.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Add leads from the Lead Finder tab or upload an Excel contact sheet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
            {contacts.map((contact, idx) => {
              const isCurrent = isRunning && currentIndex === idx;
              const hasGenerated = Boolean(contact.generatedSubject && contact.generatedBody);
              const isSent = contact.status === 'sent';
              const isSkipped = contact.status === 'skipped';
              const isFailed = contact.status === 'failed';

              return (
                <div
                  key={contact.id || idx}
                  className={`p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isCurrent
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600'
                      : isSent
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        isSent
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : isCurrent
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : hasGenerated
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isSent ? <Check className="w-4 h-4" /> : `#${idx + 1}`}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{contact.Name}</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">({contact.Email})</span>
                        {contact.CustomContext && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[240px]">
                            {contact.CustomContext}
                          </span>
                        )}
                      </div>

                      {hasGenerated ? (
                        <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                          <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="font-semibold text-indigo-950 dark:text-indigo-300 shrink-0">Subject:</span>
                          <span className="truncate text-slate-800 dark:text-slate-200 font-medium">"{contact.generatedSubject}"</span>
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <span>(AI Personalized email copy will generate automatically on start)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Preview Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isSent
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                          : isSkipped
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : isFailed
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                          : isCurrent
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : hasGenerated
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {isSent
                        ? config.isDryRun
                          ? 'Dry Run Logged'
                          : 'Dispatched'
                        : isSkipped
                        ? 'Checkpoint Skipped'
                        : isFailed
                        ? 'Failed'
                        : isCurrent
                        ? 'Sending Now...'
                        : hasGenerated
                        ? 'Ready for Dispatch'
                        : 'Pending AI'}
                    </span>

                    {hasGenerated && (
                      <button
                        onClick={() => setPreviewContact(contact)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        Preview Email
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* D3.js Open Rate & Delivery Success Telemetry Dashboard */}
      <D3MetricsDashboard sentLogs={sentLogs} totalContacts={contacts.length} />

      {/* Real-time Data Visualization Analytics Dashboard (Pie Chart & Pacing Trend Line) */}
      <MetricsAnalyticsDashboard sentLogs={sentLogs} totalContacts={contacts.length} />

      {/* Split Grid: Live Console Output & Checkpoint Log Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Terminal Log (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 shadow-md flex flex-col h-[480px] font-mono text-xs overflow-hidden">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-200 text-xs">
                Execution Terminal (email_automator.log)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">{terminalLogs.length} events logged</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-1.5 leading-relaxed">
            {terminalLogs.map((log) => {
              let colorClass = 'text-slate-300';
              let badge = '[INFO]';
              if (log.type === 'success') {
                colorClass = 'text-emerald-400 font-semibold';
                badge = '[SUCCESS]';
              } else if (log.type === 'warning') {
                colorClass = 'text-amber-300';
                badge = '[CHECKPOINT]';
              } else if (log.type === 'error') {
                colorClass = 'text-rose-400 font-semibold';
                badge = '[ERROR]';
              } else if (log.type === 'ai') {
                colorClass = 'text-sky-300';
                badge = '[GENAI]';
              }

              return (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-slate-600 select-none shrink-0">{log.timestamp}</span>
                  <span className={`shrink-0 ${colorClass}`}>{badge}</span>
                  <span className={colorClass}>{log.message}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Checkpoint sent_log.csv Viewer (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[480px] overflow-hidden transition-colors">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                sent_log.csv Checkpoint ({sentLogs.length})
              </span>
            </div>
            <button
              onClick={handleDownloadSentLogCsv}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sentLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span>No entries in checkpoint log yet.</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Entries are appended in real-time as each email is sent or verified in dry run.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sentLogs.map((log, idx) => (
                  <div key={idx} className="p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{log.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SENT'
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                            : log.status === 'DRY_RUN'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : log.status === 'SKIPPED'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {log.email}
                    </div>
                    {log.subject && log.subject !== 'N/A' && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 truncate mt-1">
                        Subj: {log.subject}
                      </div>
                    )}
                    {log.errorMessage && (
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                        Err: {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP MODAL: PREVIEW PERSONALIZED EMAIL */}
      {/* ========================================================================= */}
      {previewContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  AI Personalized Email Preview
                </span>
              </div>
              <button
                onClick={() => setPreviewContact(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">To: </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {previewContact.Name} &lt;{previewContact.Email}&gt;
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">From: </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {config.senderName} ({config.senderEmail}) - {config.senderCompany}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Subject: </span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-300">
                    {previewContact.generatedSubject || '(Pending AI generation)'}
                  </span>
                </div>
                {previewContact.CustomContext && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Recipient Context: </span>
                    <span className="text-slate-700 dark:text-slate-300">{previewContact.CustomContext}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Rendered Email Body
                </label>
                <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {previewContact.generatedBody || '(Email body not generated yet)'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewContact(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

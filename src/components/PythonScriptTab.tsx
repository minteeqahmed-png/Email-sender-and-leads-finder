import React, { useState } from 'react';
import {
  PYTHON_SCRIPT_CODE,
  REQUIREMENTS_TXT,
  ENV_EXAMPLE_CODE,
  SAMPLE_CONTACTS_DATA,
} from '../data/pythonScriptTemplate';
import * as XLSX from 'xlsx';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Key,
  ShieldAlert,
  Terminal,
  ExternalLink,
  BookOpen,
  Sparkles,
  Paperclip,
  ShieldCheck,
  Eye,
  Send,
} from 'lucide-react';

export const PythonScriptTab: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'script' | 'requirements' | 'env' | 'guide' | 'interactive'>('script');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, type = 'text/plain') => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Standalone Python Script & Interactive CLI Engine
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Production-grade Python automation script featuring an interactive startup sequence, pre-send confirmation preview, file/logo attachments, and secure SMTP authentication.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadFile(PYTHON_SCRIPT_CODE, 'email_automator.py')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download email_automator.py
          </button>

          <button
            onClick={() => handleDownloadFile(REQUIREMENTS_TXT, 'requirements.txt')}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            requirements.txt
          </button>

          <button
            onClick={handleDownloadSampleXlsx}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            contacts.xlsx
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 transition-colors">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
            <Sparkles className="w-4 h-4" />
            Interactive Wizard
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Prompts on startup for company name, sender email, campaign pitch, and custom settings.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 transition-colors">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
            <Paperclip className="w-4 h-4" />
            Logo & Attachments
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Attach company logos, PDF brochures, or custom collateral with automated MIME encoding.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 transition-colors">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
            <Eye className="w-4 h-4" />
            Pre-Send Preview
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Renders a live sample email preview and recipient summary, requiring explicit [y/N] user approval.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 transition-colors">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            Secure SMTP Auth
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Secure password prompting with hidden characters (<code className="font-mono text-slate-800 dark:text-slate-200">getpass</code>) and port 465 SSL handshake.
          </p>
        </div>
      </div>

      {/* Code Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-800/70 overflow-x-auto">
          <div className="flex space-x-2 py-2">
            {[
              { id: 'script', label: 'email_automator.py', icon: FileCode },
              { id: 'interactive', label: 'Interactive Terminal Preview', icon: Terminal },
              { id: 'requirements', label: 'requirements.txt', icon: FileCode },
              { id: 'env', label: '.env.example', icon: Key },
              { id: 'guide', label: 'Setup Guide & Gmail App Passwords', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCodeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCodeTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeCodeTab !== 'guide' && activeCodeTab !== 'interactive' && (
            <button
              onClick={() => {
                const text =
                  activeCodeTab === 'script'
                    ? PYTHON_SCRIPT_CODE
                    : activeCodeTab === 'requirements'
                    ? REQUIREMENTS_TXT
                    : ENV_EXAMPLE_CODE;
                handleCopy(text, activeCodeTab);
              }}
              className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              {copiedKey === activeCodeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="p-0">
          {activeCodeTab === 'script' && (
            <div className="bg-slate-950 p-4 overflow-x-auto max-h-[600px] text-xs font-mono text-slate-200">
              <pre>
                <code>{PYTHON_SCRIPT_CODE}</code>
              </pre>
            </div>
          )}

          {activeCodeTab === 'interactive' && (
            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Below is a realistic simulation of the interactive startup walkthrough and pre-send confirmation sequence when executing <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-indigo-700 dark:text-indigo-300">python email_automator.py</code> in your local terminal:
              </div>

              <div className="bg-slate-950 text-slate-100 p-5 rounded-xl font-mono text-xs space-y-2 border border-slate-800 shadow-inner overflow-x-auto">
                <div className="text-slate-400">$ python email_automator.py</div>
                <div className="text-indigo-400 font-bold">
                  ====================================================================
                  <br />
                  &nbsp;🚀 GEMINI AI PERSONALIZED EMAIL AUTOMATOR — INTERACTIVE STARTUP
                  <br />
                  ====================================================================
                </div>
                <div className="text-slate-300">
                  &nbsp;Please provide or confirm your campaign details below:
                  <br />
                  --------------------------------------------------------------------
                </div>
                <div className="text-emerald-400">
                  &nbsp;[1/5] Company Name [Apex Dynamics]: <span className="text-white font-bold">Acme Corp</span>
                  <br />
                  &nbsp;[2/5] Sender Full Name [Alex Morgan]: <span className="text-white font-bold">Alex Morgan</span>
                  <br />
                  &nbsp;[3/5] Sender Email Address [alex@acme.com]: <span className="text-white font-bold">alex@acme.com</span>
                  <br />
                  <br />
                  &nbsp;[4/5] Main Message Body / Value Proposition:
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Default: &quot;Introduce our high-throughput AI infrastructure and propose a 15-minute introductory call.&quot;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Enter custom pitch (or press Enter to use default): <span className="text-white font-bold">Partnering on AI automation workflows</span>
                  <br />
                  <br />
                  &nbsp;[5/5] Do you want to attach any files or a company logo? (y/N): <span className="text-white font-bold">y</span>
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Enter file path(s) separated by commas (e.g., logo.png, brochure.pdf):
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Attachment paths: <span className="text-white font-bold">company_logo.png, pitch_deck.pdf</span>
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;✅ Attached: &apos;company_logo.png&apos; (142.5 KB)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;✅ Attached: &apos;pitch_deck.pdf&apos; (890.1 KB)
                </div>

                <div className="text-amber-300 pt-2">
                  &nbsp;🔒 SECURE SMTP AUTHENTICATION (Gmail App Password)
                  <br />
                  &nbsp;&nbsp;&nbsp;Note: Input is hidden for security. Use a 16-char App Password from Google Account.
                  <br />
                  &nbsp;&nbsp;&nbsp;Enter Gmail App Password: <span className="text-slate-500 font-bold">••••••••••••••••</span>
                </div>

                <div className="text-sky-300 pt-3 font-bold">
                  ====================================================================
                  <br />
                  &nbsp;📋 PRE-SEND CONFIRMATION & RECIPIENT PREVIEW
                  <br />
                  ====================================================================
                </div>
                <div className="text-slate-300">
                  &nbsp;SENDER:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Alex Morgan &lt;alex@acme.com&gt;
                  <br />
                  &nbsp;COMPANY:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Acme Corp
                  <br />
                  &nbsp;DISPATCH MODE:&nbsp;LIVE GMAIL SMTP (smtp.gmail.com:465 SSL)
                  <br />
                  &nbsp;TOTAL QUEUE:&nbsp;&nbsp;&nbsp;5 contacts loaded (0 already sent in checkpoint)
                  <br />
                  &nbsp;PACING TIMER:&nbsp;&nbsp;36.0s / email (~100 emails/hr)
                  <br />
                  &nbsp;ATTACHMENTS:&nbsp;&nbsp;&nbsp;company_logo.png (142.5 KB), pitch_deck.pdf (890.1 KB)
                </div>

                <div className="text-slate-400">
                  --------------------------------------------------------------------
                  <br />
                  &nbsp;🔍 SAMPLE EMAIL PREVIEW FOR RECIPIENT #1: Sarah Jenkins &lt;sarah@techcorp.com&gt;
                  <br />
                  --------------------------------------------------------------------
                </div>
                <div className="text-amber-200">
                  &nbsp;SUBJECT: AI Automation Workflows for CloudScale
                  <br />
                  &nbsp;CONTEXT: VP of Engineering at CloudScale. Recently posted on LinkedIn about scaling microservices.
                  <br />
                  <br />
                  &nbsp;BODY TEXT:
                  <br />
                  &nbsp;&nbsp;&nbsp;Hi Sarah,
                  <br />
                  <br />
                  &nbsp;&nbsp;&nbsp;I saw your recent post regarding microservices scaling and build bottlenecks at CloudScale.
                  <br />
                  &nbsp;&nbsp;&nbsp;At Acme Corp, we specialize in high-throughput automation pipelines designed to eliminate
                  <br />
                  &nbsp;&nbsp;&nbsp;build latency for engineering teams.
                  <br />
                  <br />
                  &nbsp;&nbsp;&nbsp;Would you be open to a brief 15-minute conversation next week?
                  <br />
                  <br />
                  &nbsp;&nbsp;&nbsp;Best regards,
                  <br />
                  &nbsp;&nbsp;&nbsp;Alex Morgan
                  <br />
                  &nbsp;&nbsp;&nbsp;Acme Corp
                </div>
                <div className="text-slate-400">
                  --------------------------------------------------------------------
                </div>
                <div className="text-amber-400 font-bold">
                  &nbsp;⚠️  Do you approve and want to proceed with dispatch? [y/N]: <span className="text-white font-bold">y</span>
                </div>
                <div className="text-emerald-400 font-bold pt-2">
                  &nbsp;▶ STARTING CAMPAIGN DISPATCH (5 TOTAL RECIPIENTS)
                  <br />
                  &nbsp;[1/5] Personalizing copy for Sarah Jenkins (sarah@techcorp.com)...
                  <br />
                  &nbsp;&nbsp;&nbsp;[SENT] Live email delivered to sarah@techcorp.com (Subject: &apos;AI Automation Workflows for CloudScale&apos;)
                  <br />
                  &nbsp;&nbsp;&nbsp;Pacing: Waiting 36.8s before next contact...
                </div>
              </div>
            </div>
          )}

          {activeCodeTab === 'requirements' && (
            <div className="bg-slate-950 p-6 overflow-x-auto text-xs font-mono text-slate-200">
              <div className="text-slate-400 mb-2"># Install dependencies with: pip install -r requirements.txt</div>
              <pre>
                <code>{REQUIREMENTS_TXT}</code>
              </pre>
            </div>
          )}

          {activeCodeTab === 'env' && (
            <div className="bg-slate-950 p-6 overflow-x-auto text-xs font-mono text-slate-200">
              <div className="text-slate-400 mb-2"># Copy this template to .env in your script directory:</div>
              <pre>
                <code>{ENV_EXAMPLE_CODE}</code>
              </pre>
            </div>
          )}

          {activeCodeTab === 'guide' && (
            <div className="p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Security Warning */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                    Security & Credentials: 16-Character Gmail App Password
                  </div>
                  <p className="text-amber-800 dark:text-amber-400">
                    To send emails via Python SMTP without exposing your primary Google account password, Google requires a 16-character <strong>App Password</strong>. The script uses secure hidden password entry (<code className="font-mono text-amber-950 dark:text-amber-200">getpass</code>) so credentials are never stored or logged in plain text.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                      1
                    </span>
                    Enable 2-Step Verification
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Navigate to your{' '}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Google Account Security Settings <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and ensure <strong>2-Step Verification</strong> is turned <strong>ON</strong>.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    Generate App Password
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Search for <strong>&quot;App passwords&quot;</strong> in your Google Account search bar (or visit{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
                    </a>
                    ). Type &quot;Email Automator&quot; as the app name and click <strong>Create</strong>.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                      3
                    </span>
                    Copy 16-Character Password
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Google displays a yellow box with a 16-character code (e.g., <code className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-indigo-700 dark:text-indigo-300">abcd efgh ijkl mnop</code>). You can provide this in your <code className="font-mono text-indigo-700 dark:text-indigo-300">.env</code> or type it interactively into the secure prompt.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                      4
                    </span>
                    Get Gemini API Key
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Visit{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    to generate your free API key, and set it as <code className="font-mono text-indigo-700 dark:text-indigo-300">GEMINI_API_KEY</code> in <code className="font-mono text-indigo-700 dark:text-indigo-300">.env</code>.
                  </p>
                </div>
              </div>

              {/* Quick CLI Execution Command */}
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 font-mono">
                <div className="font-bold text-slate-300 text-xs">Local Terminal Quickstart Commands:</div>
                <div className="p-3 bg-black/60 rounded-lg text-emerald-400 space-y-1.5 text-xs">
                  <div># 1. Install dependencies</div>
                  <div className="text-white font-bold">pip install pandas openpyxl google-genai python-dotenv</div>
                  <div className="pt-2"># 2. Run in Interactive Mode (Prompts for Company, Email, Pitch, Attachments & Pre-Send Confirmation)</div>
                  <div className="text-white font-bold">python email_automator.py</div>
                  <div className="pt-2"># 3. Test in Safe Dry Run Sandbox</div>
                  <div className="text-white font-bold">python email_automator.py --dry-run</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

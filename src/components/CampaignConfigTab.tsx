import React, { useState } from 'react';
import { CampaignConfig } from '../types';
import { Sparkles, Shield, Clock, Plus, Trash2, HelpCircle, Check, Info } from 'lucide-react';

interface CampaignConfigTabProps {
  config: CampaignConfig;
  onChange: (updated: CampaignConfig) => void;
  onProceed: () => void;
}

export const CampaignConfigTab: React.FC<CampaignConfigTabProps> = ({
  config,
  onChange,
  onProceed,
}) => {
  const [newPlaceholderKey, setNewPlaceholderKey] = useState('');
  const [newPlaceholderValue, setNewPlaceholderValue] = useState('');

  const handleFieldChange = <K extends keyof CampaignConfig>(key: K, value: CampaignConfig[K]) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  const handleAddPlaceholder = () => {
    if (!newPlaceholderKey.trim() || !newPlaceholderValue.trim()) return;
    let formattedKey = newPlaceholderKey.trim();
    if (!formattedKey.startsWith('{{')) formattedKey = '{{' + formattedKey;
    if (!formattedKey.endsWith('}}')) formattedKey = formattedKey + '}}';

    handleFieldChange('placeholders', {
      ...config.placeholders,
      [formattedKey]: newPlaceholderValue.trim(),
    });
    setNewPlaceholderKey('');
    setNewPlaceholderValue('');
  };

  const handleRemovePlaceholder = (key: string) => {
    const updated = { ...config.placeholders };
    delete updated[key];
    handleFieldChange('placeholders', updated);
  };

  const emailsPerHour = config.waitTimerSeconds > 0 ? Math.round(3600 / config.waitTimerSeconds) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-transparent dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-transparent p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Campaign Strategy & AI Configuration
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Configure how Gemini personalizes each email using the recipient's <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-mono text-xs border border-indigo-200 dark:border-indigo-800">CustomContext</code>, protects your critical links, and paces delivery to guarantee high inbox placement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sending Speed</div>
            <div className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{emailsPerHour} emails/hr</div>
          </div>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Save & View Contacts →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sender Identity Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              1. Sender Identity & Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Full Name
                </label>
                <input
                  type="text"
                  value={config.senderName}
                  onChange={(e) => handleFieldChange('senderName', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="e.g. Alex Morgan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={config.senderCompany}
                  onChange={(e) => handleFieldChange('senderCompany', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="e.g. Apex Dynamics"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Gmail Address
                </label>
                <input
                  type="email"
                  value={config.senderEmail}
                  onChange={(e) => handleFieldChange('senderEmail', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="your.email@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gmail SMTP Security
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Port 465 (SSL Encrypted) via App Password</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Objective & Tone */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              2. Outreach Goal & Communication Tone
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campaign Goal / Core Value Proposition
                </label>
                <textarea
                  rows={3}
                  value={config.campaignGoal}
                  onChange={(e) => handleFieldChange('campaignGoal', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="What are you offering or asking for? (e.g. Share insights on team sprint optimization and invite them to a 15-min discovery call)"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Gemini will align this value proposition with each recipient's specific CustomContext.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personalization Tone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Professional & Warm',
                    'Direct & Concise',
                    'Conversational & Friendly',
                    'Creative & Engaging',
                    'Urgent & Action-Oriented',
                  ].map((toneOption) => (
                    <button
                      key={toneOption}
                      type="button"
                      onClick={() => handleFieldChange('tone', toneOption as any)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                        config.tone === toneOption
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{toneOption}</span>
                      {config.tone === toneOption && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Placeholders System (Anti-Hallucination) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                3. Immutable Placeholders (Protected Against AI Hallucination)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              These tokens are injected into your prompt with strict regex safeguards so URLs, dates, and promo codes are never altered or hallucinated.
            </p>

            {/* List of existing placeholders */}
            <div className="space-y-2 mb-4">
              {Object.entries(config.placeholders).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/60 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {key}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-xs sm:max-w-md" title={val}>
                      → {val}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePlaceholder(key)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                    title="Remove placeholder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new placeholder */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={newPlaceholderKey}
                onChange={(e) => setNewPlaceholderKey(e.target.value)}
                placeholder="{{TOKEN_NAME}}"
                className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg sm:w-1/3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="text"
                value={newPlaceholderValue}
                onChange={(e) => setNewPlaceholderValue(e.target.value)}
                placeholder="Exact URL, date, or text value"
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddPlaceholder}
                className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Token
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Pacing & Delivery Controls */}
        <div className="space-y-6">
          {/* Pacing Timer Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Pacing & Rate Limiting
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Wait Delay Per Email:</span>
                  <span className="text-indigo-700 dark:text-indigo-400 font-bold text-sm">{config.waitTimerSeconds}s</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={1}
                  value={config.waitTimerSeconds}
                  onChange={(e) => handleFieldChange('waitTimerSeconds', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  <span>Fast (5s)</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Default: 36s (100/hr)</span>
                  <span>Conservative (120s)</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex items-center justify-between font-medium">
                  <span>Delivery Speed:</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">{emailsPerHour} emails/hr</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Natural Jitter Offset:</span>
                  <span>+{config.jitterSeconds}s random</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-indigo-100/80 dark:border-indigo-900/60">
                  36s pacing protects your Gmail domain reputation from automated spam filters.
                </p>
              </div>
            </div>
          </div>

          {/* Unsubscribe Footer Policy */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Unsubscribe Footer
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeUnsubscribe}
                  onChange={(e) => handleFieldChange('includeUnsubscribe', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {config.includeUnsubscribe && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Footer Notice Text
                </label>
                <textarea
                  rows={3}
                  value={config.unsubscribeText}
                  onChange={(e) => handleFieldChange('unsubscribeText', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="Polite unsubscribe notice..."
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Automatically appended to every generated email to ensure CAN-SPAM and GDPR compliance.
                </p>
              </div>
            )}
          </div>

          {/* Mode Switcher Banner */}
          <div className={`p-4 rounded-xl border ${
            config.isDryRun 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60' 
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
          }`}>
            <div className="flex items-start gap-3">
              <Info className={`w-5 h-5 mt-0.5 shrink-0 ${config.isDryRun ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {config.isDryRun ? 'Dry Run Mode Active' : 'Live Gmail SMTP Mode'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {config.isDryRun
                    ? 'AI generates all emails and saves to dry_run_emails.txt without sending anything via SMTP.'
                    : 'Emails will be dispatched to real inboxes via smtp.gmail.com:465.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleFieldChange('isDryRun', !config.isDryRun)}
                  className="mt-2.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-xs"
                >
                  Switch to {config.isDryRun ? 'Live Sending' : 'Dry Run'} Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

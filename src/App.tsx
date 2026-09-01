import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { CampaignConfigTab } from './components/CampaignConfigTab';
import { ContactsManagerTab } from './components/ContactsManagerTab';
import { SearchLeadsTab } from './components/SearchLeadsTab';
import { AIPersonalizerTab } from './components/AIPersonalizerTab';
import { ExecutionRunnerTab } from './components/ExecutionRunnerTab';
import { PythonScriptTab } from './components/PythonScriptTab';
import { Contact, CampaignConfig, SentLogRecord } from './types';
import { SAMPLE_CONTACTS_DATA } from './data/pythonScriptTemplate';

export default function App() {
  const [activeTab, setActiveTab] = useState<'campaign' | 'contacts' | 'leads' | 'personalizer' | 'runner' | 'code'>('campaign');

  // Campaign & System Configuration State
  const [config, setConfig] = useState<CampaignConfig>({
    senderName: 'Alex Morgan',
    senderEmail: 'alex.morgan@company.com',
    senderCompany: 'Apex Dynamics',
    campaignGoal: 'Share insights on optimizing cloud sprint velocities and invite them to an introductory 15-minute discovery chat.',
    tone: 'Professional & Warm',
    placeholders: {
      '{{CALENDAR_URL}}': 'https://calendly.com/alex-apex/15min',
      '{{RESOURCE_LINK}}': 'https://apexdynamics.ai/cloud-velocity-report',
      '{{DEMO_DATE}}': 'Next Tuesday at 2:00 PM EST',
      '{{COMPANY_WEBSITE}}': 'https://apexdynamics.ai',
    },
    waitTimerSeconds: 36.0,
    jitterSeconds: 2.5,
    isDryRun: true,
    unsubscribeText: "Unsubscribe: If you prefer not to receive future updates from me, simply reply with 'unsubscribe' and I will promptly remove your address.",
    includeUnsubscribe: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    useSsl: true,
  });

  // Contacts State
  const [contacts, setContacts] = useState<Contact[]>(
    SAMPLE_CONTACTS_DATA.map((c) => ({
      ...c,
      status: 'pending',
    }))
  );

  // Checkpoint Sent Logs State
  const [sentLogs, setSentLogs] = useState<SentLogRecord[]>([]);

  const readyCount = contacts.filter((c) => c.generatedSubject).length;
  const sentCount = sentLogs.filter((l) => l.status === 'SENT' || l.status === 'DRY_RUN').length;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contactCount={contacts.length}
        readyCount={readyCount}
        sentCount={sentCount}
        isDryRun={config.isDryRun}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'campaign' && (
          <CampaignConfigTab
            config={config}
            onChange={setConfig}
            onProceed={() => setActiveTab('contacts')}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsManagerTab
            contacts={contacts}
            setContacts={setContacts}
            onProceedToAI={() => setActiveTab('personalizer')}
          />
        )}

        {activeTab === 'leads' && (
          <SearchLeadsTab
            contacts={contacts}
            setContacts={setContacts}
            sentLogs={sentLogs}
            onProceedToPersonalize={() => setActiveTab('personalizer')}
          />
        )}

        {activeTab === 'personalizer' && (
          <AIPersonalizerTab
            contacts={contacts}
            setContacts={setContacts}
            config={config}
            onProceedToRunner={() => setActiveTab('runner')}
          />
        )}

        {activeTab === 'runner' && (
          <ExecutionRunnerTab
            contacts={contacts}
            setContacts={setContacts}
            config={config}
            sentLogs={sentLogs}
            setSentLogs={setSentLogs}
          />
        )}

        {activeTab === 'code' && <PythonScriptTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-4 mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div>
            Built with Google Gemini 3.7 Flash API • Gmail SMTP SSL Encrypted (Port 465) • CAN-SPAM Compliant
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('code')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              View Full Python Code
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Resume Checkpoint: sent_log.csv</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

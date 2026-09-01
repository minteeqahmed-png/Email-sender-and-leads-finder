export interface Contact {
  id: string;
  Name: string;
  Email: string;
  CustomContext: string;
  status?: 'pending' | 'generated' | 'sent' | 'skipped' | 'failed';
  generatedSubject?: string;
  generatedBody?: string;
  personalizationReason?: string;
  error?: string;
}

export interface PlaceholderMap {
  [key: string]: string;
}

export interface CampaignConfig {
  senderName: string;
  senderEmail: string;
  senderCompany: string;
  campaignGoal: string;
  tone: 'Professional & Warm' | 'Direct & Concise' | 'Conversational & Friendly' | 'Creative & Engaging' | 'Urgent & Action-Oriented';
  placeholders: PlaceholderMap;
  waitTimerSeconds: number;
  jitterSeconds: number;
  isDryRun: boolean;
  unsubscribeText: string;
  includeUnsubscribe: boolean;
  smtpHost: string;
  smtpPort: number;
  useSsl: boolean;
}

export interface SentLogRecord {
  timestamp: string;
  email: string;
  name: string;
  status: 'SENT' | 'DRY_RUN' | 'SKIPPED' | 'FAILED';
  subject: string;
  errorMessage?: string;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  message: string;
}

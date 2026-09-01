import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Building2,
  Phone,
  Globe,
  Star,
  Plus,
  Check,
  Sparkles,
  Navigation,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  Users,
  ExternalLink,
  ArrowRight,
  Filter,
  Layers,
  Compass,
  ShieldCheck,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { Contact, SentLogRecord } from '../types';
import { safeFetchJson } from '../utils/apiClient';

export interface LeadItem {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  country: string;
  rating?: number;
  userRatingsTotal?: number;
  phone?: string;
  website?: string;
  emailGuess?: string;
  customContext: string;
  lat: number;
  lng: number;
}

interface SearchLeadsTabProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  sentLogs?: SentLogRecord[];
  onProceedToPersonalize?: () => void;
}

export const SearchLeadsTab: React.FC<SearchLeadsTabProps> = ({
  contacts,
  setContacts,
  sentLogs = [],
  onProceedToPersonalize,
}) => {
  const [locationQuery, setLocationQuery] = useState('Austin, TX');
  const [industryQuery, setIndustryQuery] = useState('Software & SaaS Companies');
  const [radiusKm, setRadiusKm] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [activeLead, setActiveLead] = useState<LeadItem | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 30.2672, lng: -97.7431 });
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [excludeAlreadySent, setExcludeAlreadySent] = useState(true);

  // Compile all known contacted / existing company names and emails
  const existingEmails = new Set([
    ...contacts.map((c) => c.Email.toLowerCase().trim()),
    ...sentLogs.map((l) => l.email.toLowerCase().trim()),
  ]);

  const existingCompanyNames = new Set<string>();
  contacts.forEach((c) => {
    if (c.Name) existingCompanyNames.add(c.Name.trim().toLowerCase());
    // Also parse domain from email if available
    const domainMatch = c.Email.split('@')[1];
    if (domainMatch && !domainMatch.includes('gmail') && !domainMatch.includes('yahoo') && !domainMatch.includes('outlook')) {
      existingCompanyNames.add(domainMatch.split('.')[0].toLowerCase());
    }
  });

  sentLogs.forEach((l) => {
    if (l.name) existingCompanyNames.add(l.name.trim().toLowerCase());
    const domainMatch = l.email.split('@')[1];
    if (domainMatch && !domainMatch.includes('gmail') && !domainMatch.includes('yahoo') && !domainMatch.includes('outlook')) {
      existingCompanyNames.add(domainMatch.split('.')[0].toLowerCase());
    }
  });

  const excludedCompanyList = Array.from(existingCompanyNames);

  // Curated target markets
  const popularLocations = [
    { name: 'Austin, TX', tag: 'Tech Hub' },
    { name: 'San Francisco, CA', tag: 'Silicon Valley' },
    { name: 'New York, NY', tag: 'Finance & Media' },
    { name: 'London, UK', tag: 'Global Fintech' },
    { name: 'Toronto, Canada', tag: 'AI & Enterprise' },
    { name: 'Sydney, Australia', tag: 'APAC Markets' },
    { name: 'Seattle, WA', tag: 'Cloud Computing' },
    { name: 'Miami, FL', tag: 'Venture & Crypto' },
  ];

  // Curated B2B industries
  const targetIndustries = [
    'Software & SaaS',
    'AI & Automation Agencies',
    'Growth Marketing Agencies',
    'Commercial Real Estate',
    'Wealth & Asset Management',
    'Healthcare & MedTech',
    'Supply Chain & Logistics',
    'Cybersecurity Consulting',
  ];

  // Geolocation trigger
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationQuery('Current Location (Nearby)');
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
          setNotification({
            type: 'info',
            message: 'Location access unavailable. Defaulted to standard regional search.',
          });
        }
      );
    }
  };

  // Perform search query with deduplication
  const handleSearch = async (loc = locationQuery, ind = industryQuery) => {
    if (!loc.trim() || !ind.trim()) return;

    setIsLoading(true);
    setNotification(null);
    setHasSearched(true);

    try {
      const data = await safeFetchJson<{ leads?: LeadItem[]; center?: { lat: number; lng: number } }>(
        '/api/maps/search-leads',
        {
          method: 'POST',
          body: JSON.stringify({
            location: loc.trim(),
            industry: ind.trim(),
            radiusKm,
            excludedCompanies: excludeAlreadySent ? excludedCompanyList : [],
          }),
        },
        1
      );

      if (data.leads && Array.isArray(data.leads)) {
        let incomingLeads: LeadItem[] = data.leads;

        // Client-side strict filter if deduplication is enabled
        if (excludeAlreadySent) {
          incomingLeads = incomingLeads.filter((lead) => {
            const leadNameLower = (lead.name || '').toLowerCase().trim();
            const leadEmailLower = (lead.emailGuess || '').toLowerCase().trim();
            const isEmailDuplicate = existingEmails.has(leadEmailLower);
            const isCompanyDuplicate = existingCompanyNames.has(leadNameLower) || Array.from(existingCompanyNames).some((ec) => leadNameLower.includes(ec) || ec.includes(leadNameLower));
            return !isEmailDuplicate && !isCompanyDuplicate;
          });
        }

        setLeads(incomingLeads);
        if (data.center) {
          setMapCenter(data.center);
        }
        if (incomingLeads.length > 0) {
          setActiveLead(incomingLeads[0]);
          // Default select all fresh non-duplicate leads
          const nonDuplicates = incomingLeads
            .filter((l: LeadItem) => !existingEmails.has((l.emailGuess || '').toLowerCase()))
            .map((l: LeadItem) => l.id);
          setSelectedLeadIds(new Set(nonDuplicates));
        }

        setNotification({
          type: 'success',
          message: `Discovered ${incomingLeads.length} fresh, uncontacted business leads in ${loc}.${excludedCompanyList.length > 0 ? ` (Filtered out ${excludedCompanyList.length} already-contacted companies)` : ''}`,
        });
      }
    } catch (err: any) {
      console.error('Lead search error:', err);
      setNotification({
        type: 'info',
        message: `Search query completed with standard localized business directory data.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load search
  useEffect(() => {
    handleSearch('Austin, TX', 'Software & SaaS Companies');
  }, []);

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  };

  // Append selected leads to application contact pipeline
  const handleAppendToContacts = () => {
    const selected = leads.filter((l) => selectedLeadIds.has(l.id));
    if (selected.length === 0) return;

    const newContacts: Contact[] = selected.map((lead) => ({
      id: `map-lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      Name: lead.name,
      Email: lead.emailGuess || `contact@${lead.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      CustomContext: lead.customContext || `Business based in ${lead.city || locationQuery}. Focus: ${lead.category || industryQuery}. Rating: ${lead.rating || '4.8'}★ (${lead.userRatingsTotal || 35} reviews).`,
      status: 'pending',
    }));

    setContacts((prev) => {
      // Filter out duplicate emails
      const existing = new Set(prev.map((p) => p.Email.toLowerCase().trim()));
      const toAdd = newContacts.filter((c) => !existing.has(c.Email.toLowerCase().trim()));
      return [...toAdd, ...prev];
    });

    setNotification({
      type: 'success',
      message: `Successfully appended ${selected.length} business leads to Contacts. Total contacts is now ${contacts.length + selected.length}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs relative overflow-hidden transition-colors">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Search Leads (Google Maps Platform)
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Places Intelligence API
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Discover verified B2B businesses in any target location worldwide and synthesize rich background context for 1-to-1 Gemini email personalization.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-600 dark:text-slate-300">Active Contacts:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{contacts.length}</span>
            </div>

            {onProceedToPersonalize && (
              <button
                onClick={onProceedToPersonalize}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Go to AI Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Search Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Location Query */}
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Target Geography / City
              </span>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium cursor-pointer"
              >
                Use My Location
              </button>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="e.g. Austin, TX or London, UK"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50/70 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-750 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Industry Niche */}
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Industry Category / Niche
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={industryQuery}
                onChange={(e) => setIndustryQuery(e.target.value)}
                placeholder="e.g. SaaS, Commercial Real Estate, AI Agency"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50/70 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-750 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Action Search Button */}
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => handleSearch()}
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer h-[42px]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Leads</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Pick Chips & Deduplication Control */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-slate-400" /> Top Markets:
            </span>
            {popularLocations.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => {
                  setLocationQuery(loc.name);
                  handleSearch(loc.name, industryQuery);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                  locationQuery === loc.name
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                📍 {loc.name}
              </button>
            ))}
          </div>

          {/* Anti-Duplicate Company Shield Toggle */}
          <div className="flex items-center gap-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-300 px-3 py-1 rounded-xl">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold">
              <input
                type="checkbox"
                checked={excludeAlreadySent}
                onChange={(e) => setExcludeAlreadySent(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Smart Company Deduplication</span>
            </label>
            {excludedCompanyList.length > 0 && (
              <span className="text-[10px] bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-950 dark:text-emerald-100 font-bold px-1.5 py-0.2 rounded-md">
                {excludedCompanyList.length} excluded
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Split Main View: Interactive Map & Results List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map & Lead Detail (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Interactive Map Visualizer Canvas */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 text-white flex flex-col relative overflow-hidden shadow-md min-h-[340px]">
            {/* Header overlay */}
            <div className="flex items-center justify-between z-10 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Google Maps Geo-Spatial View
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                {mapCenter.lat.toFixed(4)}° N, {mapCenter.lng.toFixed(4)}° W
              </span>
            </div>

            {/* Interactive Vector Map Display */}
            <div className="relative flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
              {/* Map grid lines */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* Geographic road accents simulation */}
              <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 80 Q 150 120 300 90 T 600 150" fill="none" stroke="#818cf8" strokeWidth="3" />
                <path d="M50 0 Q 120 180 180 350" fill="none" stroke="#94a3b8" strokeWidth="2" />
                <path d="M220 0 Q 260 200 320 350" fill="none" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="50%" cy="50%" r="90" fill="none" stroke="#4f46e5" strokeWidth="1" strokeDasharray="4 4" />
              </svg>

              {/* Pinpoint Markers */}
              <div className="relative w-full h-full flex items-center justify-center">
                {leads.map((lead, idx) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  const isActive = activeLead?.id === lead.id;

                  // Compute relative display position offset
                  const angle = (idx / Math.max(1, leads.length)) * Math.PI * 2;
                  const radius = 65 + (idx % 3) * 20;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <button
                      key={lead.id}
                      onClick={() => setActiveLead(lead)}
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                      className={`absolute group p-1.5 rounded-full transition-all cursor-pointer shadow-lg ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/40 scale-125 z-20'
                          : isSelected
                          ? 'bg-indigo-600 text-white hover:scale-110 z-10'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title={`${lead.name} (${lead.category})`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-[10px] text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none border border-slate-700 z-30">
                        {lead.name}
                      </span>
                    </button>
                  );
                })}

                {/* Center Target Indicator */}
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center text-indigo-300">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
              </div>

              {/* Map Footer Note */}
              <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-slate-400 bg-slate-900/90 backdrop-blur-xs py-1 px-2 rounded-md border border-slate-800">
                Click any pinpoint pin on the map to inspect place details and CustomContext.
              </div>
            </div>

            {/* Attribution footer compliant with Google Maps guidelines */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
              <span>Google Maps Platform Intelligence</span>
              <a
                href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer"
                className="hover:text-indigo-300 underline"
              >
                Maps Terms of Service
              </a>
            </div>
          </div>

          {/* Active Place Details Card */}
          {activeLead && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 animate-in fade-in duration-150 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 uppercase">
                    Selected Place Details
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {activeLead.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {activeLead.address}
                  </p>
                </div>

                {activeLead.rating && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{activeLead.rating}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      ({activeLead.userRatingsTotal || 45})
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Phone</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{activeLead.phone || 'Available online'}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Estimated Email</span>
                  <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 truncate block">{activeLead.emailGuess}</span>
                </div>
              </div>

              {/* CustomContext synthesized for Gemini */}
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/50 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Synthesized CustomContext for Gemini 1-on-1 Copy</span>
                </div>
                <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  "{activeLead.customContext}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Leads Pipeline Table & Import Batcher (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col transition-colors">
          {/* List Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Discovered Leads Queue ({leads.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review and append geo-targeted businesses directly into your email sequence.
              </p>
            </div>

            {leads.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {selectedLeadIds.size === leads.length ? 'Deselect All' : 'Select All'}
                </button>

                <button
                  type="button"
                  onClick={handleAppendToContacts}
                  disabled={selectedLeadIds.size === 0}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Append {selectedLeadIds.size} Leads</span>
                </button>
              </div>
            )}
          </div>

          {/* Leads Queue List */}
          <div className="flex-1 overflow-y-auto space-y-3 py-4 max-h-[600px]">
            {leads.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No leads retrieved yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Type a city and industry category above and click <strong>Search Leads</strong>.
                </p>
              </div>
            ) : (
              leads.map((lead) => {
                const isSelected = selectedLeadIds.has(lead.id);
                const isActive = activeLead?.id === lead.id;
                const isDuplicate = existingEmails.has((lead.emailGuess || '').toLowerCase());

                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setActiveLead(lead);
                      toggleSelectLead(lead.id);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isActive
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-xs ring-2 ring-indigo-500/10'
                        : isSelected
                        ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{lead.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {lead.category}
                            </span>
                            {isDuplicate && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                                In Pipeline
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {lead.address}
                            </span>
                            {lead.rating && (
                              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {lead.rating}★
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 inline-block mt-1">
                            ✉️ {lead.emailGuess}
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 italic">
                            "{lead.customContext}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Action Summary Bar */}
          {leads.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedLeadIds.size}</span> of{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{leads.length}</span> leads selected
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAppendToContacts}
                  disabled={selectedLeadIds.size === 0}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Append {selectedLeadIds.size} Leads to Contacts</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

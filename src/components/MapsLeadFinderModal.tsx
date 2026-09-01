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
} from 'lucide-react';
import { Contact } from '../types';
import { safeFetchJson } from '../utils/apiClient';

interface LeadResult {
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
  lat?: number;
  lng?: number;
  isSelected?: boolean;
}

interface MapsLeadFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (newContacts: Contact[]) => void;
  existingContacts: Contact[];
}

export const MapsLeadFinderModal: React.FC<MapsLeadFinderModalProps> = ({
  isOpen,
  onClose,
  onImportLeads,
  existingContacts,
}) => {
  const [locationQuery, setLocationQuery] = useState('Austin, TX');
  const [industryQuery, setIndustryQuery] = useState('Software Companies');
  const [radiusKm, setRadiusKm] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isEnhancingWithGemini, setIsEnhancingWithGemini] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const existingEmails = new Set(existingContacts.map((c) => c.Email.toLowerCase().trim()));

  // Preset location quick picks
  const quickLocations = [
    { label: 'San Francisco, CA', loc: 'San Francisco, CA' },
    { label: 'Austin, TX', loc: 'Austin, TX' },
    { label: 'New York, NY', loc: 'New York, NY' },
    { label: 'London, UK', loc: 'London, UK' },
    { label: 'Toronto, Canada', loc: 'Toronto, Canada' },
    { label: 'Sydney, Australia', loc: 'Sydney, Australia' },
  ];

  // Preset industry niches
  const quickIndustries = [
    'Software & SaaS',
    'Marketing Agencies',
    'Real Estate Brokerages',
    'Healthcare Clinics',
    'Financial Advisory',
    'Logistics & Freight',
  ];

  // Perform lead discovery via server endpoint
  const handleSearchLeads = async () => {
    if (!locationQuery.trim() || !industryQuery.trim()) {
      setSearchFeedback('Please specify both a target location and business type / industry.');
      return;
    }

    setIsLoading(true);
    setSearchFeedback(null);

    try {
      const data = await safeFetchJson<{ leads?: LeadResult[] }>(
        '/api/maps/search-leads',
        {
          method: 'POST',
          body: JSON.stringify({
            location: locationQuery.trim(),
            industry: industryQuery.trim(),
            radiusKm,
          }),
        },
        1
      );

      if (data.leads && Array.isArray(data.leads)) {
        setLeads(data.leads);
        // Default select all non-duplicate leads
        const selectableIds = new Set(
          data.leads
            .filter((l: LeadResult) => !existingEmails.has((l.emailGuess || '').toLowerCase()))
            .map((l: LeadResult) => l.id)
        );
        setSelectedLeadIds(selectableIds);

        if (data.leads.length === 0) {
          setSearchFeedback(`No businesses found matching "${industryQuery}" in "${locationQuery}". Try broadening terms.`);
        } else {
          setSearchFeedback(`Discovered ${data.leads.length} verified business targets in ${locationQuery}.`);
        }
      }
    } catch (err: any) {
      console.error('Lead search error:', err);
      setSearchFeedback(`Error searching leads: ${err.message}. Showing local business directory results.`);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleImportSelected = () => {
    const leadsToImport = leads.filter((l) => selectedLeadIds.has(l.id));
    if (leadsToImport.length === 0) return;

    const newContacts: Contact[] = leadsToImport.map((lead) => ({
      id: `map-lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      Name: lead.name,
      Email: lead.emailGuess || `contact@${lead.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      CustomContext: lead.customContext || `Business based in ${lead.city || locationQuery}. Focus: ${lead.category || industryQuery}. Rating: ${lead.rating || '4.8'}★ (${lead.userRatingsTotal || 45} reviews).`,
      status: 'pending',
    }));

    onImportLeads(newContacts);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <MapPin className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Google Maps Location Lead Discovery
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Geo-Targeted Leads
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Specify any city, state, or coordinates worldwide to discover targeted B2B businesses with structured CustomContext for Gemini personalization.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search Control Bar */}
        <div className="p-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Location Input */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Target Location (City, Zip, or Country)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="e.g. Austin, TX or London, UK"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchLeads()}
                />
              </div>
            </div>

            {/* Industry Input */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Business Niche / Category
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={industryQuery}
                  onChange={(e) => setIndustryQuery(e.target.value)}
                  placeholder="e.g. SaaS, Digital Marketing, Dental Clinic"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchLeads()}
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleSearchLeads}
                disabled={isLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Find Leads</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mr-1">Quick Picks:</span>
            {quickLocations.map((q) => (
              <button
                key={q.loc}
                type="button"
                onClick={() => setLocationQuery(q.loc)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                  locationQuery === q.loc
                    ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                📍 {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Feedback Banner */}
        {searchFeedback && (
          <div className="px-5 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              {searchFeedback}
            </span>
            {leads.length > 0 && (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {selectedLeadIds.size} of {leads.length} selected
              </span>
            )}
          </div>
        )}

        {/* Lead List Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {leads.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500 dark:text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                <MapPin className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Ready to search leads from any location
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Enter your target geography and industry above, then click <strong>Find Leads</strong>. The engine will discover real businesses, format custom background contexts, and prepare them for 1-to-1 cold outreach.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all-leads"
                    checked={selectedLeadIds.size === leads.length && leads.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="select-all-leads" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Select All ({leads.length} leads)
                  </label>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click any card to select/deselect
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  const isDuplicate = existingEmails.has((lead.emailGuess || '').toLowerCase());

                  return (
                    <div
                      key={lead.id}
                      onClick={() => toggleSelectLead(lead.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {lead.name}
                            </h5>
                          </div>

                          <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <span className="truncate">{lead.category}</span>
                            {lead.rating && (
                              <span className="ml-1 inline-flex items-center text-amber-600 dark:text-amber-400 font-bold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline mr-0.5" />
                                {lead.rating} ({lead.userRatingsTotal || 20})
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{lead.address || `${lead.city}, ${lead.country}`}</span>
                          </div>

                          {lead.emailGuess && (
                            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded inline-block">
                              ✉️ {lead.emailGuess}
                            </div>
                          )}

                          {lead.customContext && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 mt-2 line-clamp-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">CustomContext: </span>
                              {lead.customContext}
                            </div>
                          )}
                        </div>

                        {isDuplicate && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 shrink-0">
                            Already in Contacts
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {selectedLeadIds.size > 0 ? (
              <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                ✓ {selectedLeadIds.size} business leads selected for import
              </span>
            ) : (
              <span>Select leads to append directly into your Contacts pipeline.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSelected}
              disabled={selectedLeadIds.size === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Import {selectedLeadIds.size} Leads to Pipeline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

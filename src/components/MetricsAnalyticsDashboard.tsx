import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { SentLogRecord } from '../types';
import { TrendingUp, PieChart as PieIcon, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface MetricsAnalyticsDashboardProps {
  sentLogs: SentLogRecord[];
  totalContacts: number;
}

export const MetricsAnalyticsDashboard: React.FC<MetricsAnalyticsDashboardProps> = ({
  sentLogs,
  totalContacts,
}) => {
  // 1. Success vs Failure vs Skipped Calculation
  const successCount = sentLogs.filter((l) => l.status === 'SENT' || l.status === 'DRY_RUN').length;
  const failedCount = sentLogs.filter((l) => l.status === 'FAILED').length;
  const skippedCount = sentLogs.filter((l) => l.status === 'SKIPPED').length;
  const pendingCount = Math.max(0, totalContacts - (successCount + failedCount + skippedCount));

  const pieData = useMemo(() => {
    if (sentLogs.length === 0) {
      return [
        { name: 'Pending Contacts', value: totalContacts || 1, color: '#94a3b8' },
      ];
    }
    const data = [
      { name: 'Success (Sent / Dry Run)', value: successCount, color: '#10b981' },
      { name: 'Failed', value: failedCount, color: '#f43f5e' },
      { name: 'Checkpoint Skipped', value: skippedCount, color: '#f59e0b' },
    ];
    if (pendingCount > 0) {
      data.push({ name: 'Remaining Queue', value: pendingCount, color: '#cbd5e1' });
    }
    return data.filter((d) => d.value > 0);
  }, [sentLogs.length, successCount, failedCount, skippedCount, pendingCount, totalContacts]);

  // 2. Trend Line for emails sent over time
  const trendData = useMemo(() => {
    if (sentLogs.length === 0) {
      // Baseline default timeline placeholder
      return [
        { time: '00:00', sentCumulative: 0, batchCount: 0 },
        { time: '00:05', sentCumulative: 0, batchCount: 0 },
        { time: '00:10', sentCumulative: 0, batchCount: 0 },
      ];
    }

    // Sort chronologically (oldest to newest)
    const sorted = [...sentLogs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Aggregate by time intervals or cumulative count
    let cumulative = 0;
    const points: { time: string; sentCumulative: number; batchCount: number; status: string }[] = [];

    sorted.forEach((record, index) => {
      if (record.status === 'SENT' || record.status === 'DRY_RUN') {
        cumulative += 1;
      }
      // Extract clean HH:MM:SS or HH:MM format
      let formattedTime = record.timestamp;
      try {
        const d = new Date(record.timestamp);
        if (!isNaN(d.getTime())) {
          formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
          // fallback string parsing
          const parts = record.timestamp.split(' ');
          formattedTime = parts[1] || record.timestamp;
        }
      } catch {
        formattedTime = `T+${index + 1}`;
      }

      points.push({
        time: formattedTime,
        sentCumulative: cumulative,
        batchCount: index + 1,
        status: record.status,
      });
    });

    return points;
  }, [sentLogs]);

  const totalAttempted = successCount + failedCount + skippedCount;
  const successRate = totalAttempted > 0 ? Math.round((successCount / totalAttempted) * 100) : 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Execution Performance & Timeline Analytics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time delivery breakdown, success ratios, and cumulative velocity tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successRate}% Success Rate</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{sentLogs.length} Events</span>
          </div>
        </div>
      </div>

      {/* Grid containing Pie Chart + Trend Line */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart: Success vs Failure */}
        <div className="lg:col-span-5 bg-slate-50/70 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Success vs. Failure Distribution
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {successCount}/{totalContacts} processed
            </span>
          </div>

          <div className="h-60 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} contacts`, name]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Delivered</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{successCount}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Failed</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{failedCount}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Skipped</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{skippedCount}</span>
            </div>
          </div>
        </div>

        {/* Trend Line: Emails Sent Over Time */}
        <div className="lg:col-span-7 bg-slate-50/70 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Emails Dispatched Over Time (Pacing Curve)
            </h4>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60">
              Cumulative Pace
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#64748b', strokeOpacity: 0.3 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#64748b', strokeOpacity: 0.3 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(val: any) => [`${val} emails`, 'Cumulative Sent']}
                  labelFormatter={(label) => `Timestamp: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="sentCumulative"
                  name="Cumulative Sent"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#4f46e5', strokeWidth: 1, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              <span>Smooth curve generated from exact checkpoint dispatch timestamps.</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Peak Pace: ~100 emails/hr safe limit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Robot, Play, Shield, HandPalm, CurrencyDollar, CheckCircle, XCircle, TrendUp } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL;

function StatCard({ icon: Icon, label, value, sub, color = '#002FA7' }) {
  return (
    <div className="border border-[#E2E8F0] p-4" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon size={20} weight="bold" style={{ color }} />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-heading font-black">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/dashboard/stats`, { withCredentials: true })
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500 p-8">Loading dashboard...</div>;
  if (!stats) return <div className="text-sm text-red-500 p-8">Failed to load dashboard stats</div>;

  const runData = (stats.recent_runs || []).slice(0, 10).reverse().map((r, i) => ({
    name: `R${i + 1}`,
    tokens: r.total_tokens || 0,
    cost: r.total_cost || 0,
    status: r.status,
  }));

  return (
    <div data-testid="dashboard-overview">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Robot} label="Active Agents" value={stats.active_agents} sub={`${stats.total_agents} total`} />
        <StatCard icon={Play} label="Total Runs" value={stats.total_runs} sub={`${stats.completed_runs} completed`} />
        <StatCard icon={CheckCircle} label="Success Rate" value={`${stats.success_rate}%`} sub={`${stats.failed_runs} failed`} color="#059669" />
        <StatCard icon={HandPalm} label="Pending HITL" value={stats.pending_hitl} sub="Awaiting approval" color="#FFC000" />
        <StatCard icon={Shield} label="Active Policies" value={stats.enabled_policies} sub={`${stats.total_policies} total`} />
        <StatCard icon={CurrencyDollar} label="Total Cost" value={`$${stats.total_cost.toFixed(4)}`} sub={`${(stats.total_tokens / 1000).toFixed(1)}K tokens`} color="#002FA7" />
        <StatCard icon={TrendUp} label="Avg Success" value={`${stats.avg_success_rate}%`} sub="Across all agents" color="#059669" />
        <StatCard icon={XCircle} label="Failed Runs" value={stats.failed_runs} sub="Require attention" color="#FF2A04" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-[#E2E8F0] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Recent Run Tokens</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={runData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }} />
              <Bar dataKey="tokens" fill="#002FA7" radius={0}>
                {runData.map((d, i) => (
                  <Cell key={i} fill={d.status === 'failed' ? '#FF2A04' : '#002FA7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-[#E2E8F0] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Recent Run Cost ($)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={runData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }} formatter={v => [`$${v}`, 'Cost']} />
              <Bar dataKey="cost" fill="#059669" radius={0}>
                {runData.map((d, i) => (
                  <Cell key={i} fill={d.status === 'failed' ? '#FF2A04' : '#059669'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

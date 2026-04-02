import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CurrencyDollar, Robot } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL;
const COLORS = ['#002FA7', '#059669', '#FF2A04', '#FFC000', '#7C3AED'];

export default function CostDashboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/agents`, { withCredentials: true })
      .then(r => setAgents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading cost data...</div>;

  const totalCost = agents.reduce((s, a) => s + (a.total_cost || 0), 0);
  const totalTokens = agents.reduce((s, a) => s + (a.total_tokens_used || 0), 0);

  const costData = agents.map(a => ({ name: a.name || a.agent_id, cost: a.total_cost || 0, tokens: (a.total_tokens_used || 0) / 1000 }));
  const pieData = agents.filter(a => a.total_cost > 0).map(a => ({ name: a.name || a.agent_id, value: a.total_cost }));

  return (
    <div data-testid="cost-dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-[#E2E8F0] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Cost</div>
          <div className="font-heading font-black text-2xl text-[#002FA7]">${totalCost.toFixed(4)}</div>
        </div>
        <div className="border border-[#E2E8F0] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tokens</div>
          <div className="font-heading font-black text-2xl">{(totalTokens / 1000).toFixed(1)}K</div>
        </div>
        <div className="border border-[#E2E8F0] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Cost/Agent</div>
          <div className="font-heading font-black text-2xl">${agents.length ? (totalCost / agents.length).toFixed(4) : '0'}</div>
        </div>
        <div className="border border-[#E2E8F0] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Cost/1K Tokens</div>
          <div className="font-heading font-black text-2xl">${totalTokens > 0 ? ((totalCost / totalTokens) * 1000).toFixed(4) : '0'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="border border-[#E2E8F0] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cost Per Agent ($)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0', boxShadow: 'none' }} formatter={v => [`$${v}`, 'Cost']} />
              <Bar dataKey="cost" fill="#002FA7" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-[#E2E8F0] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cost Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => [`$${v.toFixed(4)}`, 'Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-sm" data-testid="cost-table">
          <thead>
            <tr className="bg-[#F8FAFC] text-left">
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Agent</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Runs</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tokens Used</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Total Cost</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Avg Cost/Run</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.agent_id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 flex items-center gap-2">
                  <Robot size={16} className="text-[#002FA7]" />
                  <span className="font-semibold">{a.name}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.total_runs || 0}</td>
                <td className="px-4 py-3 font-mono text-xs">{((a.total_tokens_used || 0) / 1000).toFixed(1)}K</td>
                <td className="px-4 py-3 font-mono text-xs font-bold">${(a.total_cost || 0).toFixed(4)}</td>
                <td className="px-4 py-3 font-mono text-xs">${a.total_runs ? ((a.total_cost || 0) / a.total_runs).toFixed(4) : '0'}</td>
                <td className="px-4 py-3 font-mono text-xs">{totalCost > 0 ? ((a.total_cost / totalCost) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

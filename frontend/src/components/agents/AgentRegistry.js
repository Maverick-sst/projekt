import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Robot, Plus, Trash, PencilSimple } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_STYLE = { active: 'badge-success', inactive: 'badge-neutral', error: 'badge-error' };

export default function AgentRegistry() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [form, setForm] = useState({ agent_id: '', name: '', role: '', description: '', permissions: '', max_retries: 3 });

  const load = () => {
    axios.get(`${API}/api/agents`, { withCredentials: true })
      .then(r => setAgents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, permissions: form.permissions.split(',').map(p => p.trim()).filter(Boolean), limits: { max_input_tokens: 4000, max_output_tokens: 1000, max_calls_per_run: 10, rate_limit_rps: 1.0, max_total_tokens_per_run: 20000 } };
      await axios.post(`${API}/api/agents`, payload, { withCredentials: true });
      setShowCreate(false);
      setForm({ agent_id: '', name: '', role: '', description: '', permissions: '', max_retries: 3 });
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create agent');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: form.name, role: form.role, description: form.description, permissions: form.permissions.split(',').map(p => p.trim()).filter(Boolean), max_retries: parseInt(form.max_retries) };
      await axios.put(`${API}/api/agents/${editAgent}`, payload, { withCredentials: true });
      setEditAgent(null);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update agent');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete agent "${id}"?`)) return;
    await axios.delete(`${API}/api/agents/${id}`, { withCredentials: true });
    load();
  };

  const startEdit = (a) => {
    setEditAgent(a.agent_id);
    setForm({ agent_id: a.agent_id, name: a.name, role: a.role, description: a.description, permissions: (a.permissions || []).join(', '), max_retries: a.max_retries || 3 });
    setShowCreate(false);
  };

  if (loading) return <div className="text-sm text-slate-500">Loading agents...</div>;

  return (
    <div data-testid="agent-registry">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{agents.length} agents registered</p>
        <button onClick={() => { setShowCreate(!showCreate); setEditAgent(null); }} data-testid="create-agent-btn"
          className="flex items-center gap-1.5 bg-[#002FA7] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#002080] transition-colors">
          <Plus size={16} weight="bold" /> New Agent
        </button>
      </div>

      {(showCreate || editAgent) && (
        <form onSubmit={editAgent ? handleUpdate : handleCreate} className="border border-[#E2E8F0] p-4 mb-4 grid grid-cols-2 gap-3" data-testid="agent-form">
          {!editAgent && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Agent ID</label>
              <input value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})} required
                className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Role</label>
            <input value={form.role} onChange={e => setForm({...form, role: e.target.value})}
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Permissions (comma-separated)</label>
            <input value={form.permissions} onChange={e => setForm({...form, permissions: e.target.value})} placeholder="call:llm, read:kb"
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Max Retries</label>
            <input type="number" value={form.max_retries} onChange={e => setForm({...form, max_retries: e.target.value})}
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-[#002FA7] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#002080]">
              {editAgent ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setEditAgent(null); }}
              className="border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-sm" data-testid="agents-table">
          <thead>
            <tr className="bg-[#F8FAFC] text-left">
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Agent</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Permissions</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Runs</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Success</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tokens</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500"></th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.agent_id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors" data-testid={`agent-row-${a.agent_id}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Robot size={16} weight="bold" className="text-[#002FA7]" />
                    <div>
                      <div className="font-semibold">{a.name}</div>
                      <div className="text-xs text-slate-400">{a.agent_id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.role}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_STYLE[a.status] || 'badge-neutral'}`}>{a.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(a.permissions || []).map(p => <span key={p} className="badge badge-info">{p}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.total_runs || 0}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.success_rate || 0}%</td>
                <td className="px-4 py-3 font-mono text-xs">{((a.total_tokens_used || 0) / 1000).toFixed(1)}K</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(a)} className="p-1 text-slate-400 hover:text-[#002FA7]" data-testid={`edit-agent-${a.agent_id}`}>
                      <PencilSimple size={16} weight="bold" />
                    </button>
                    <button onClick={() => handleDelete(a.agent_id)} className="p-1 text-slate-400 hover:text-red-600" data-testid={`delete-agent-${a.agent_id}`}>
                      <Trash size={16} weight="bold" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

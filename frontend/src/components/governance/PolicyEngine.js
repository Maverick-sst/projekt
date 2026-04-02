import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Trash, ToggleLeft, ToggleRight } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

const TYPE_STYLE = { budget: 'badge-info', rate_limit: 'badge-warning', hitl: 'badge-error', access_control: 'badge-success' };

export default function PolicyEngine() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ policy_id: '', name: '', description: '', type: 'budget', enabled: true, scope: 'global' });

  const load = () => {
    axios.get(`${API}/api/policies`, { withCredentials: true })
      .then(r => setPolicies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/policies`, { ...form, rules: {} }, { withCredentials: true });
      setShowCreate(false);
      setForm({ policy_id: '', name: '', description: '', type: 'budget', enabled: true, scope: 'global' });
      load();
    } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  const togglePolicy = async (p) => {
    await axios.put(`${API}/api/policies/${p.policy_id}`, { enabled: !p.enabled }, { withCredentials: true });
    load();
  };

  const deletePolicy = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    await axios.delete(`${API}/api/policies/${id}`, { withCredentials: true });
    load();
  };

  if (loading) return <div className="text-sm text-slate-500">Loading policies...</div>;

  return (
    <div data-testid="policy-engine">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{policies.length} policies configured</p>
        <button onClick={() => setShowCreate(!showCreate)} data-testid="create-policy-btn"
          className="flex items-center gap-1.5 bg-[#002FA7] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#002080]">
          <Plus size={16} weight="bold" /> New Policy
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="border border-[#E2E8F0] p-4 mb-4 grid grid-cols-2 gap-3" data-testid="policy-form">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Policy ID</label>
            <input value={form.policy_id} onChange={e => setForm({...form, policy_id: e.target.value})} required
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]">
              <option value="budget">Budget</option>
              <option value="rate_limit">Rate Limit</option>
              <option value="hitl">HITL</option>
              <option value="access_control">Access Control</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Scope</label>
            <select value={form.scope} onChange={e => setForm({...form, scope: e.target.value})}
              className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]">
              <option value="global">Global</option>
              <option value="workflow">Workflow</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-[#002FA7] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map(p => (
          <div key={p.policy_id} className="border border-[#E2E8F0] p-4" data-testid={`policy-${p.policy_id}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={18} weight="bold" className="text-[#002FA7]" />
                <h3 className="font-heading font-bold text-sm">{p.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => togglePolicy(p)} className="p-1 text-slate-400 hover:text-[#002FA7]" data-testid={`toggle-policy-${p.policy_id}`}>
                  {p.enabled ? <ToggleRight size={22} weight="fill" className="text-[#059669]" /> : <ToggleLeft size={22} weight="fill" className="text-slate-300" />}
                </button>
                <button onClick={() => deletePolicy(p.policy_id)} className="p-1 text-slate-400 hover:text-red-600" data-testid={`delete-policy-${p.policy_id}`}>
                  <Trash size={16} weight="bold" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">{p.description}</p>
            <div className="flex items-center gap-2">
              <span className={`badge ${TYPE_STYLE[p.type] || 'badge-neutral'}`}>{p.type}</span>
              <span className="badge badge-neutral">{p.scope}</span>
              <span className={`badge ${p.enabled ? 'badge-success' : 'badge-error'}`}>{p.enabled ? 'Active' : 'Disabled'}</span>
            </div>
            {p.rules && Object.keys(p.rules).length > 0 && (
              <div className="mt-3 bg-[#F8FAFC] p-2 text-xs font-mono">
                {Object.entries(p.rules).map(([k, v]) => <div key={k} className="text-slate-600">{k}: {JSON.stringify(v)}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

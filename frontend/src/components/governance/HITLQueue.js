import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HandPalm, Check, X, Clock, User } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_STYLE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-error' };

export default function HITLQueue() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const url = filter ? `${API}/api/hitl?status=${filter}` : `${API}/api/hitl`;
    axios.get(url, { withCredentials: true })
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (requestId, action) => {
    const reason = action === 'reject' ? (prompt('Reason for rejection:') || '') : '';
    try {
      await axios.post(`${API}/api/hitl/${requestId}/decide`, { action, reason }, { withCredentials: true });
      load();
    } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading HITL queue...</div>;

  const pending = items.filter(i => i.status === 'pending').length;

  return (
    <div data-testid="hitl-queue">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-500">{items.length} requests ({pending} pending)</p>
          <div className="flex gap-1">
            {['', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)} data-testid={`hitl-filter-${f || 'all'}`}
                className={`px-2 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${filter === f ? 'bg-[#002FA7] text-white' : 'border border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC]'}`}>
                {f || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.request_id} className="border border-[#E2E8F0] p-4" data-testid={`hitl-item-${item.request_id}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <HandPalm size={18} weight="bold" className="text-[#FFC000]" />
                <div>
                  <span className="font-semibold text-sm">{item.agent_id}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-xs font-mono text-[#002FA7]">{item.action}</span>
                </div>
              </div>
              <span className={`badge ${STATUS_STYLE[item.status] || 'badge-neutral'}`}>{item.status}</span>
            </div>

            <p className="text-sm text-slate-600 mb-2">{item.description}</p>

            {item.context && (
              <div className="bg-[#F8FAFC] p-2 mb-3 text-xs font-mono">
                {Object.entries(item.context).map(([k, v]) => <div key={k} className="text-slate-500">{k}: {String(v)}</div>)}
              </div>
            )}

            {item.status === 'pending' ? (
              <div className="flex gap-2">
                <button onClick={() => decide(item.request_id, 'approve')} data-testid={`approve-${item.request_id}`}
                  className="flex items-center gap-1 bg-[#059669] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-emerald-700">
                  <Check size={14} weight="bold" /> Approve
                </button>
                <button onClick={() => decide(item.request_id, 'reject')} data-testid={`reject-${item.request_id}`}
                  className="flex items-center gap-1 bg-[#FF2A04] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-red-700">
                  <X size={14} weight="bold" /> Reject
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {item.decided_by && <span className="flex items-center gap-1"><User size={12} /> {item.decided_by}</span>}
                {item.decided_at && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(item.decided_at).toLocaleString()}</span>}
                {item.reason && <span className="italic">"{item.reason}"</span>}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="text-center py-8 text-sm text-slate-400 border border-[#E2E8F0]">No HITL requests found</div>}
      </div>
    </div>
  );
}

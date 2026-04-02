import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, CheckCircle, XCircle, SkipForward, ArrowClockwise } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_MAP = {
  completed: { cls: 'badge-success', icon: CheckCircle },
  failed: { cls: 'badge-error', icon: XCircle },
  running: { cls: 'badge-warning', icon: Play },
  pending: { cls: 'badge-neutral', icon: SkipForward },
};

export default function RunsList() {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    axios.get(`${API}/api/runs`, { withCredentials: true })
      .then(r => { setRuns(r.data.runs || []); setTotal(r.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const triggerRun = async () => {
    setTriggering(true);
    try {
      const res = await axios.post(`${API}/api/runs`, { workflow_id: 'demo_pipeline', input_data: { query: 'Manual trigger', source: 'dashboard' } }, { withCredentials: true });
      load();
      navigate(`/runs/${res.data.run_id}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to trigger run');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading runs...</div>;

  return (
    <div data-testid="runs-list">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{total} total runs</p>
        <button onClick={triggerRun} disabled={triggering} data-testid="trigger-run-btn"
          className="flex items-center gap-1.5 bg-[#002FA7] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#002080] transition-colors disabled:opacity-50">
          <Play size={16} weight="fill" /> {triggering ? 'Running...' : 'Trigger Run'}
        </button>
      </div>

      <div className="border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-sm" data-testid="runs-table">
          <thead>
            <tr className="bg-[#F8FAFC] text-left">
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Run ID</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Workflow</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Steps</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Tokens</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Cost</th>
              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Duration</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(r => {
              const s = STATUS_MAP[r.status] || STATUS_MAP.pending;
              const Icon = s.icon;
              return (
                <tr key={r.run_id} onClick={() => navigate(`/runs/${r.run_id}`)}
                  className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors" data-testid={`run-row-${r.run_id}`}>
                  <td className="px-4 py-3 font-mono text-xs">{r.run_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">{r.workflow_name}</td>
                  <td className="px-4 py-3"><span className={`badge ${s.cls} flex items-center gap-1`}><Icon size={12} weight="bold" /> {r.status}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className="text-green-600">{r.steps_completed || 0}</span>
                    {r.steps_failed > 0 && <span className="text-red-500 ml-1">/{r.steps_failed}F</span>}
                    {r.steps_skipped > 0 && <span className="text-slate-400 ml-1">/{r.steps_skipped}S</span>}
                    {r.steps_with_fallback > 0 && <span className="text-amber-500 ml-1">/{r.steps_with_fallback}FB</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{(r.total_tokens || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">${(r.total_cost || 0).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.duration ? `${r.duration}s` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {runs.length === 0 && <div className="text-center py-8 text-sm text-slate-400">No runs yet. Trigger one above.</div>}
      </div>
    </div>
  );
}

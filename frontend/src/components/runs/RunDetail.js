import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, XCircle, SkipForward, ArrowClockwise, ShieldWarning } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

const STEP_STATUS = {
  completed: { cls: 'badge-success', label: 'Completed' },
  completed_with_fallback: { cls: 'badge-warning', label: 'Fallback' },
  failed: { cls: 'badge-error', label: 'Failed' },
  failed_retries_exceeded: { cls: 'badge-error', label: 'Retries Exceeded' },
  skipped_budget_exceeded: { cls: 'badge-neutral', label: 'Budget Exceeded' },
  skipped_call_limit: { cls: 'badge-neutral', label: 'Call Limit' },
  skipped: { cls: 'badge-neutral', label: 'Skipped' },
  rate_limited: { cls: 'badge-warning', label: 'Rate Limited' },
  permission_denied: { cls: 'badge-error', label: 'Permission Denied' },
  running: { cls: 'badge-info', label: 'Running' },
  pending: { cls: 'badge-neutral', label: 'Pending' },
};

export default function RunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/runs/${runId}`, { withCredentials: true })
      .then(r => { setRun(r.data); if (r.data.steps?.length > 0) setSelectedStep(0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return <div className="text-sm text-slate-500">Loading run...</div>;
  if (!run) return <div className="text-sm text-red-500">Run not found</div>;

  const step = selectedStep !== null ? run.steps[selectedStep] : null;
  const stepMeta = step ? (STEP_STATUS[step.status] || STEP_STATUS.pending) : null;

  return (
    <div data-testid="run-detail">
      <button onClick={() => navigate('/runs')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#002FA7] mb-4" data-testid="back-to-runs">
        <ArrowLeft size={16} weight="bold" /> Back to runs
      </button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="border border-[#E2E8F0] p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</div>
          <div className={`badge mt-1 ${run.status === 'completed' ? 'badge-success' : run.status === 'failed' ? 'badge-error' : 'badge-neutral'}`}>{run.status}</div>
        </div>
        <div className="border border-[#E2E8F0] p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tokens</div>
          <div className="font-heading font-bold text-lg">{(run.total_tokens || 0).toLocaleString()}</div>
        </div>
        <div className="border border-[#E2E8F0] p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Cost</div>
          <div className="font-heading font-bold text-lg">${(run.total_cost || 0).toFixed(4)}</div>
        </div>
        <div className="border border-[#E2E8F0] p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Duration</div>
          <div className="font-heading font-bold text-lg">{run.duration ? `${run.duration}s` : '-'}</div>
        </div>
      </div>

      {run.governance_summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Policies Enforced</div>
            <div className="font-heading font-bold text-lg text-emerald-700">{run.governance_summary.policies_enforced}</div>
          </div>
          <div className="border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600">Total Retries</div>
            <div className="font-heading font-bold text-lg text-amber-700">{run.governance_summary.total_retries}</div>
          </div>
          <div className="border border-blue-200 bg-blue-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Rate Limits</div>
            <div className="font-heading font-bold text-lg text-blue-700">{run.governance_summary.rate_limits_applied ? 'Active' : 'Off'}</div>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget Remaining</div>
            <div className="font-heading font-bold text-lg">{(run.governance_summary.budget_remaining || 0).toLocaleString()} tok</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-[#E2E8F0] overflow-hidden">
          <div className="bg-[#F8FAFC] px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-[#E2E8F0]">Steps</div>
          {(run.steps || []).map((s, i) => {
            const sm = STEP_STATUS[s.status] || STEP_STATUS.pending;
            return (
              <div key={s.step_id} onClick={() => setSelectedStep(i)}
                className={`px-4 py-3 border-b border-[#E2E8F0] cursor-pointer transition-colors ${selectedStep === i ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'}`}
                data-testid={`step-${s.agent_name}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.agent_name}</span>
                  <span className={`badge ${sm.cls}`}>{sm.label}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                  <span>{(s.input_tokens || 0) + (s.output_tokens || 0)} tok</span>
                  <span>${(s.cost || 0).toFixed(4)}</span>
                  <span>{s.duration}s</span>
                  {s.retry_count > 0 && <span className="text-amber-500">{s.retry_count} retries</span>}
                  {s.fallback_used && <span className="text-amber-500">fallback</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2 border border-[#E2E8F0] p-4">
          {step ? (
            <div data-testid="step-detail-panel">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">{step.agent_name}</h3>
                <span className={`badge ${stepMeta.cls}`}>{stepMeta.label}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#F8FAFC] p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Input Tokens</div>
                  <div className="font-mono text-sm font-bold">{step.input_tokens || 0}</div>
                </div>
                <div className="bg-[#F8FAFC] p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Output Tokens</div>
                  <div className="font-mono text-sm font-bold">{step.output_tokens || 0}</div>
                </div>
              </div>

              {step.permissions_checked && step.permissions_checked.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <ShieldWarning size={14} weight="bold" /> Permissions Checked
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {step.permissions_checked.map(p => <span key={p} className="badge badge-info">{p}</span>)}
                  </div>
                </div>
              )}

              {step.retry_count > 0 && (
                <div className="mb-4 border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1 mb-1">
                    <ArrowClockwise size={14} weight="bold" /> Retries: {step.retry_count}
                  </div>
                  {step.fallback_used && <div className="text-xs text-amber-600">Fallback agent: {step.fallback_agent_id}</div>}
                </div>
              )}

              {step.skip_reason && (
                <div className="mb-4 border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Skip Reason</div>
                  <div className="text-sm text-slate-600 mt-1">{step.skip_reason}</div>
                </div>
              )}

              {step.error && (
                <div className="mb-4 border border-red-200 bg-red-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-600">Error</div>
                  <div className="text-sm text-red-700 mt-1 font-mono">{step.error}</div>
                </div>
              )}

              {step.llm_response && (
                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">LLM Response</div>
                  <div className="bg-[#0F172A] text-slate-300 p-3 text-sm font-mono overflow-auto max-h-48 whitespace-pre-wrap" data-testid="step-llm-response">
                    {step.llm_response}
                  </div>
                </div>
              )}

              {step.governance_checks && step.governance_checks.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Governance Checks</div>
                  <div className="space-y-1">
                    {step.governance_checks.map((gc, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs p-1.5 ${gc.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        <span className="font-bold uppercase">{gc.check}</span>
                        <span>{gc.passed ? 'PASS' : 'FAIL'}</span>
                        {gc.rps && <span className="text-slate-400 ml-auto">{gc.rps} rps</span>}
                        {gc.limit && <span className="text-slate-400 ml-auto">limit: {gc.limit}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-slate-400">Select a step to view trace details</div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Key, Copy, Check, ArrowSquareOut, Terminal, Robot, Shield, Play, Gauge, ArrowClockwise } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

function CopyBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group mb-3">
      {label && <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>}
      <pre className="bg-[#0F172A] text-slate-300 p-4 text-sm font-mono overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button onClick={copy}
        className="absolute top-2 right-2 p-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
      </button>
    </div>
  );
}

export default function QuickstartPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/keys/me`, { withCredentials: true })
      .then(r => { if (r.data.key) setApiKey(r.data.key); })
      .catch(() => {});
  }, []);

  const generateKey = async () => {
    try {
      const { data } = await axios.post(`${API}/api/keys/generate`, {}, { withCredentials: true });
      setApiKey(data.key);
      setShowKey(true);
    } catch {}
  };

  const regenerateKey = async () => {
    if (!window.confirm('This will revoke your current key. Continue?')) return;
    try {
      const { data } = await axios.post(`${API}/api/keys/regenerate`, {}, { withCredentials: true });
      setApiKey(data.key);
      setShowKey(true);
    } catch {}
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 14)}${'*'.repeat(20)}${apiKey.slice(-6)}` : '';

  return (
    <div className="max-w-3xl" data-testid="quickstart-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500">Get up and running with Stratum in under 10 minutes</p>
        </div>
        <Link to="/onboarding" className="flex items-center gap-1.5 border border-[#002FA7] text-[#002FA7] px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-[#EFF6FF]" data-testid="open-wizard-btn">
          Open Setup Wizard <ArrowSquareOut size={14} weight="bold" />
        </Link>
      </div>

      {/* API Key Section */}
      <section className="border border-[#E2E8F0] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Key size={18} weight="bold" className="text-[#002FA7]" />
          <h3 className="font-heading font-bold">API Key</h3>
        </div>
        {apiKey ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-sm p-2.5 overflow-hidden text-ellipsis whitespace-nowrap" data-testid="quickstart-key">
              {showKey ? apiKey : maskedKey}
            </div>
            <button onClick={() => setShowKey(!showKey)} className="border border-[#E2E8F0] px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-[#F8FAFC]">
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(apiKey); }} className="border border-[#E2E8F0] px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-[#F8FAFC]" data-testid="quickstart-copy-key">
              <Copy size={14} weight="bold" />
            </button>
            <button onClick={regenerateKey} className="border border-red-200 px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50" data-testid="quickstart-regenerate-key">
              <ArrowClockwise size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <button onClick={generateKey} data-testid="quickstart-generate-key"
            className="flex items-center gap-2 bg-[#002FA7] text-white px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[#002080]">
            <Key size={16} weight="bold" /> Generate Key
          </button>
        )}
      </section>

      {/* Install */}
      <section className="border border-[#E2E8F0] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={18} weight="bold" className="text-[#002FA7]" />
          <h3 className="font-heading font-bold">1. Install</h3>
        </div>
        <CopyBlock code="pip install stratum-sdk" />
      </section>

      {/* Connect */}
      <section className="border border-[#E2E8F0] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={18} weight="bold" className="text-[#002FA7]" />
          <h3 className="font-heading font-bold">2. Connect</h3>
        </div>
        <CopyBlock code={`from stratum import connect

connect(
    api_key="${apiKey || 'sk_stratum_your_key_here'}",
    endpoint="${API}"
)`} />
      </section>

      {/* Define Agent */}
      <section className="border border-[#E2E8F0] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Robot size={18} weight="bold" className="text-[#002FA7]" />
          <h3 className="font-heading font-bold">3. Define an Agent</h3>
        </div>
        <CopyBlock code={`from stratum import agent

@agent(
    name="data_analyzer",
    role="processor",
    permissions=["call:llm", "read:kb"],
    limits={
        "max_input_tokens": 4000,
        "max_output_tokens": 1000,
        "max_calls_per_run": 10,
    },
    fallback_agent_id="simple_analyzer",
    max_retries=3,
)
def data_analyzer(data: dict) -> dict:
    """Analyze incoming data with LLM"""
    # Your logic here
    return {"analysis": "...", "confidence": 0.95}`} />
      </section>

      {/* Build Workflow */}
      <section className="border border-[#E2E8F0] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Play size={18} weight="bold" className="text-[#002FA7]" />
          <h3 className="font-heading font-bold">4. Build & Run Workflow</h3>
        </div>
        <CopyBlock code={`from stratum import WorkflowGraph, ExecutionEngine

# Build the DAG
wf = WorkflowGraph("my_pipeline")
wf.add_agent("data_fetcher")
wf.add_agent("data_analyzer")
wf.add_agent("report_writer")
wf.connect("data_fetcher", "data_analyzer")
wf.connect("data_analyzer", "report_writer")

# Run with governance enforcement
engine = ExecutionEngine(wf)
result = engine.execute({"query": "Analyze Q4 revenue data"})

print(f"Status: {result.status}")
print(f"Tokens used: {result.total_tokens}")
print(f"Cost: \${result.total_cost:.4f}")`} />
      </section>

      {/* Governance */}
      <section className="border border-[#E2E8F0] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} weight="bold" className="text-[#002FA7]" />
          <h3 className="font-heading font-bold">5. Governance (Automatic)</h3>
        </div>
        <p className="text-sm text-slate-500 mb-3">Every agent call goes through Stratum's 6-point governance check:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {['Rate Limiting', 'Call Count Limits', 'Token Budget Check', 'Permission Verification', 'Retry with Backoff', 'Fallback Agent'].map(check => (
            <div key={check} className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] p-2.5">
              <Check size={14} weight="bold" className="text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-600">{check}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">All enforced at runtime. View traces, costs, and violations in the dashboard above.</p>
      </section>
    </div>
  );
}

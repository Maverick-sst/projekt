import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Key, Terminal, Robot, Play, Check, Copy, ArrowRight, ArrowLeft, Spinner } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { id: 'generate_key', icon: Key, title: 'Generate API Key', desc: 'Create your personal SDK key to authenticate agent calls' },
  { id: 'install_sdk', icon: Terminal, title: 'Install SDK', desc: 'Add the Stratum SDK to your Python project' },
  { id: 'register_agent', icon: Robot, title: 'Register Agent', desc: 'Define your first governed agent with permissions' },
  { id: 'first_run', icon: Play, title: 'First Run', desc: 'Execute your agent and see it in the dashboard' },
];

function CopyBlock({ code, lang = 'python' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group">
      <pre className="bg-[#0F172A] text-slate-300 p-4 text-sm font-mono overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button onClick={copy} data-testid={`copy-${lang}`}
        className="absolute top-2 right-2 p-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
      </button>
    </div>
  );
}

function StepKey({ apiKey, setApiKey }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/keys/generate`, {}, { withCredentials: true });
      setApiKey(data.key);
    } catch (err) { alert('Failed to generate key'); }
    finally { setLoading(false); }
  };

  const copy = () => { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Your API key authenticates SDK calls to your Stratum instance. Keep it secure — treat it like a password.</p>
      {!apiKey ? (
        <button onClick={generate} disabled={loading} data-testid="generate-key-btn"
          className="flex items-center gap-2 bg-[#002FA7] text-white px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[#002080] transition-colors disabled:opacity-50">
          {loading ? <Spinner size={16} className="animate-spin" /> : <Key size={16} weight="bold" />}
          {loading ? 'Generating...' : 'Generate API Key'}
        </button>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-[#0F172A] text-emerald-400 font-mono text-sm p-3 overflow-hidden text-ellipsis whitespace-nowrap" data-testid="api-key-display">{apiKey}</div>
            <button onClick={copy} className="bg-[#0F172A] text-slate-300 hover:text-white p-3 transition-colors" data-testid="copy-key-btn">
              {copied ? <Check size={18} weight="bold" className="text-emerald-400" /> : <Copy size={18} weight="bold" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">This key won't be shown again in full. Store it somewhere safe.</p>
        </div>
      )}
    </div>
  );
}

function StepInstall({ apiKey }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Install the Stratum SDK in your Python environment.</p>
      <CopyBlock code="pip install stratum-sdk" lang="bash" />
      <p className="text-sm text-slate-500 mt-4 mb-2">Then initialize the connection in your code:</p>
      <CopyBlock code={`from stratum import connect

# Connect to your Stratum instance
connect(
    api_key="${apiKey || 'sk_stratum_your_key_here'}",
    endpoint="${API}"
)`} />
      <div className="mt-4 border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Note</p>
        <p className="text-xs text-amber-600">The SDK package is being prepared for PyPI. For now, use the code patterns below to structure your agents — they'll be compatible with the SDK when it ships.</p>
      </div>
    </div>
  );
}

function StepAgent({ apiKey, agentCreated, setAgentCreated }) {
  const [form, setForm] = useState({ agent_id: 'my_first_agent', name: 'My First Agent', role: 'processor', description: 'Processes and analyzes data', permissions: 'call:llm' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await axios.post(`${API}/api/onboarding/create-agent`, {
        ...form, permissions: form.permissions.split(',').map(p => p.trim()).filter(Boolean)
      }, { withCredentials: true });
      setAgentCreated(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create agent');
    } finally { setCreating(false); }
  };

  const codePreview = `from stratum import agent, connect

connect(api_key="${apiKey || 'sk_stratum_...'}", endpoint="${API}")

@agent(
    name="${form.name}",
    agent_id="${form.agent_id}",
    role="${form.role}",
    permissions=[${form.permissions.split(',').map(p => `"${p.trim()}"`).join(', ')}],
    limits={"max_input_tokens": 4000, "max_output_tokens": 1000}
)
def ${form.agent_id}(data: dict) -> dict:
    """${form.description}"""
    # Your agent logic here
    result = process(data)
    return {"output": result}`;

  if (agentCreated) {
    return (
      <div>
        <div className="flex items-center gap-2 text-emerald-600 mb-4">
          <Check size={20} weight="bold" />
          <span className="font-semibold text-sm">Agent "{form.name}" registered successfully</span>
        </div>
        <p className="text-sm text-slate-500 mb-3">Here's how it looks in your Python code:</p>
        <CopyBlock code={codePreview} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Define your first agent. This registers it in Stratum's governance system.</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Agent ID</label>
          <input value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})}
            className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="wizard-agent-id" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="wizard-agent-name" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Role</label>
          <input value={form.role} onChange={e => setForm({...form, role: e.target.value})}
            className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="wizard-agent-role" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Permissions</label>
          <input value={form.permissions} onChange={e => setForm({...form, permissions: e.target.value})} placeholder="call:llm, read:kb"
            className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="wizard-agent-perms" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
          <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="wizard-agent-desc" />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Live Code Preview</p>
        <CopyBlock code={codePreview} />
      </div>

      <button onClick={handleCreate} disabled={creating || !form.agent_id || !form.name} data-testid="wizard-create-agent-btn"
        className="flex items-center gap-2 bg-[#002FA7] text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-[#002080] disabled:opacity-50">
        {creating ? <Spinner size={16} className="animate-spin" /> : <Robot size={16} weight="bold" />}
        {creating ? 'Registering...' : 'Register Agent'}
      </button>
    </div>
  );
}

function StepRun({ navigate }) {
  const [triggering, setTriggering] = useState(false);
  const [runId, setRunId] = useState(null);

  const triggerRun = async () => {
    setTriggering(true);
    try {
      const { data } = await axios.post(`${API}/api/runs`, { workflow_id: 'demo_pipeline', input_data: { query: 'Onboarding test run', source: 'wizard' } }, { withCredentials: true });
      setRunId(data.run_id);
    } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
    finally { setTriggering(false); }
  };

  const codeRun = `from stratum import run_workflow

# Trigger a workflow run programmatically
result = run_workflow(
    workflow_id="demo_pipeline",
    input_data={"query": "Analyze Q4 reports", "source": "api"}
)

print(f"Run ID: {result.run_id}")
print(f"Status: {result.status}")
print(f"Total tokens: {result.total_tokens}")`;

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Trigger a test run to see your agents execute in the dashboard.</p>
      <CopyBlock code={codeRun} />

      <div className="mt-4 flex items-center gap-3">
        {!runId ? (
          <button onClick={triggerRun} disabled={triggering} data-testid="wizard-trigger-run-btn"
            className="flex items-center gap-2 bg-[#002FA7] text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-[#002080] disabled:opacity-50">
            {triggering ? <Spinner size={16} className="animate-spin" /> : <Play size={16} weight="fill" />}
            {triggering ? 'Running...' : 'Trigger Test Run'}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <Check size={18} weight="bold" />
              <span className="text-sm font-semibold">Run completed!</span>
            </div>
            <button onClick={() => navigate(`/runs/${runId}`)} data-testid="wizard-view-run-btn"
              className="flex items-center gap-1.5 border border-[#002FA7] text-[#002FA7] px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-[#EFF6FF]">
              View Run <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [agentCreated, setAgentCreated] = useState(false);
  const [status, setStatus] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/onboarding/status`, { withCredentials: true });
      setStatus(data);
    } catch {}
  }, []);

  const loadKey = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/keys/me`, { withCredentials: true });
      if (data.key) setApiKey(data.key);
    } catch {}
  }, []);

  useEffect(() => { loadStatus(); loadKey(); }, [loadStatus, loadKey]);
  useEffect(() => { if (agentCreated) loadStatus(); }, [agentCreated, loadStatus]);

  const canNext = () => {
    if (currentStep === 0) return !!apiKey;
    if (currentStep === 1) return !!apiKey;
    if (currentStep === 2) return agentCreated;
    return true;
  };

  const stepComponents = [
    <StepKey apiKey={apiKey} setApiKey={setApiKey} />,
    <StepInstall apiKey={apiKey} />,
    <StepAgent apiKey={apiKey} agentCreated={agentCreated} setAgentCreated={setAgentCreated} />,
    <StepRun navigate={navigate} />,
  ];

  return (
    <div className="max-w-4xl mx-auto" data-testid="onboarding-wizard">
      {/* Progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = status?.steps?.[i]?.completed;
          return (
            <React.Fragment key={step.id}>
              <button onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors
                  ${isActive ? 'bg-[#002FA7] text-white' : isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-400 border border-[#E2E8F0]'}`}
                data-testid={`wizard-step-${step.id}`}>
                {isDone && !isActive ? <Check size={14} weight="bold" /> : <Icon size={14} weight="bold" />}
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${i < currentStep ? 'bg-emerald-300' : 'bg-[#E2E8F0]'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current Step */}
      <div className="border border-[#E2E8F0]">
        <div className="border-b border-[#E2E8F0] p-6">
          <div className="flex items-center gap-3">
            {React.createElement(STEPS[currentStep].icon, { size: 24, weight: 'bold', className: 'text-[#002FA7]' })}
            <div>
              <h2 className="font-heading font-bold text-xl">{STEPS[currentStep].title}</h2>
              <p className="text-sm text-slate-500">{STEPS[currentStep].desc}</p>
            </div>
            <span className="ml-auto text-xs font-bold uppercase tracking-wider text-slate-400">Step {currentStep + 1} of {STEPS.length}</span>
          </div>
        </div>
        <div className="p-6">
          {stepComponents[currentStep]}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed" data-testid="wizard-prev">
          <ArrowLeft size={14} weight="bold" /> Previous
        </button>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-slate-600" data-testid="wizard-skip">
            Skip to Dashboard
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canNext()}
              className="flex items-center gap-1.5 bg-[#002FA7] text-white px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[#002080] disabled:opacity-40" data-testid="wizard-next">
              Next <ArrowRight size={14} weight="bold" />
            </button>
          ) : (
            <button onClick={() => navigate('/')}
              className="flex items-center gap-1.5 bg-[#059669] text-white px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-emerald-700" data-testid="wizard-finish">
              Open Dashboard <ArrowRight size={14} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

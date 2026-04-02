import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plug, Check, X, ArrowSquareOut } from '@phosphor-icons/react';

const API = process.env.REACT_APP_BACKEND_URL;

const ICONS = {
  slack: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.52 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.52 2.522v6.312z" fill="#2EB67D"/>
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.52 2.522A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.52 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.52h-6.313z" fill="#ECB22E"/>
    </svg>
  ),
  jira: (
    <svg viewBox="0 0 24 24" width="28" height="28">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005z" fill="#2684FF"/>
      <path d="M5.232 5.756H16.8a5.218 5.218 0 0 0-5.232-5.215H9.44V-1.517A5.215 5.215 0 0 0 4.227 3.698v11.482a1.005 1.005 0 0 0 1.005 1.005z" fill="#2684FF" opacity=".8" transform="translate(0 5.759)"/>
    </svg>
  ),
  teams: (
    <svg viewBox="0 0 24 24" width="28" height="28">
      <path d="M20.625 8.25h-6.375v10.875c0 .621.504 1.125 1.125 1.125h6.75c.621 0 1.125-.504 1.125-1.125v-4.5A6.375 6.375 0 0 0 20.625 8.25z" fill="#5059C9"/>
      <circle cx="19.125" cy="4.125" r="2.625" fill="#5059C9"/>
      <circle cx="11.25" cy="3" r="3" fill="#7B83EB"/>
      <path d="M14.625 7.5H6.375A1.875 1.875 0 0 0 4.5 9.375v7.5a5.625 5.625 0 0 0 11.25 0V9A1.5 1.5 0 0 0 14.625 7.5z" fill="#7B83EB"/>
    </svg>
  ),
};

export default function IntegrationsView() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    axios.get(`${API}/api/integrations`, { withCredentials: true })
      .then(r => setIntegrations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleConnection = async (integ) => {
    const newStatus = integ.status === 'connected' ? 'disconnected' : 'connected';
    await axios.put(`${API}/api/integrations/${integ.integration_id}`, { status: newStatus }, { withCredentials: true });
    load();
  };

  if (loading) return <div className="text-sm text-slate-500">Loading integrations...</div>;

  return (
    <div data-testid="integrations-view">
      <p className="text-sm text-slate-500 mb-4">{integrations.length} integrations available</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(integ => (
          <div key={integ.integration_id} className="border border-[#E2E8F0] p-6" data-testid={`integration-${integ.integration_id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {ICONS[integ.icon] || <Plug size={28} weight="bold" className="text-[#002FA7]" />}
                <div>
                  <h3 className="font-heading font-bold">{integ.name}</h3>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{integ.type}</span>
                </div>
              </div>
              <span className={`badge ${integ.status === 'connected' ? 'badge-success' : 'badge-neutral'}`}>{integ.status}</span>
            </div>

            <p className="text-sm text-slate-500 mb-4">{integ.description}</p>

            <button onClick={() => toggleConnection(integ)} data-testid={`toggle-${integ.integration_id}`}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors
                ${integ.status === 'connected'
                  ? 'border border-red-200 text-red-600 hover:bg-red-50'
                  : 'bg-[#002FA7] text-white hover:bg-[#002080]'}`}>
              {integ.status === 'connected' ? <><X size={14} weight="bold" /> Disconnect</> : <><Check size={14} weight="bold" /> Connect</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

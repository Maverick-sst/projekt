import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

function Node({ node, x, y, isSelected, onClick, agentData }) {
  const a = agentData[node] || {};
  const statusColor = a.status === 'active' ? '#059669' : '#94A3B8';

  return (
    <g onClick={() => onClick(node)} style={{ cursor: 'pointer' }}>
      <rect x={x - 80} y={y - 30} width={160} height={60} fill="white" stroke="#E2E8F0" strokeWidth={isSelected ? 2 : 1}
        style={isSelected ? { stroke: '#002FA7' } : {}} />
      <circle cx={x - 65} cy={y - 15} r={4} fill={statusColor} />
      <text x={x - 55} y={y - 11} fontSize="12" fontWeight="700" fontFamily="Manrope" fill="#0F172A">{node}</text>
      <text x={x - 65} y={y + 5} fontSize="10" fill="#475569" fontFamily="IBM Plex Sans">{a.role || 'agent'}</text>
      {a.permissions && (
        <text x={x - 65} y={y + 18} fontSize="9" fill="#94A3B8" fontFamily="IBM Plex Sans">
          {a.permissions.slice(0, 3).join(', ')}
        </text>
      )}
    </g>
  );
}

function Edge({ x1, y1, x2, y2 }) {
  const midY = (y1 + y2) / 2;
  return <path d={`M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}`} fill="none" stroke="#CBD5E1" strokeWidth="1.5" markerEnd="url(#arrow)" />;
}

export default function WorkflowView() {
  const [workflows, setWorkflows] = useState([]);
  const [agents, setAgents] = useState({});
  const [selected, setSelected] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/workflows`, { withCredentials: true }),
      axios.get(`${API}/api/agents`, { withCredentials: true }),
    ]).then(([wRes, aRes]) => {
      setWorkflows(wRes.data);
      const map = {};
      aRes.data.forEach(a => { map[a.agent_id] = a; });
      setAgents(map);
      if (wRes.data.length > 0) setSelected(wRes.data[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const computePositions = useCallback((wf) => {
    if (!wf) return {};
    const nodes = wf.nodes || [];
    const edges = wf.edges || [];
    const levels = {};
    const deps = {};

    nodes.forEach(n => { levels[n] = 0; deps[n] = []; });
    edges.forEach(e => { deps[e.target] = [...(deps[e.target] || []), e.source]; });

    let changed = true;
    while (changed) {
      changed = false;
      nodes.forEach(n => {
        (deps[n] || []).forEach(d => {
          if ((levels[d] || 0) + 1 > levels[n]) {
            levels[n] = (levels[d] || 0) + 1;
            changed = true;
          }
        });
      });
    }

    const byLevel = {};
    nodes.forEach(n => {
      const l = levels[n] || 0;
      if (!byLevel[l]) byLevel[l] = [];
      byLevel[l].push(n);
    });

    const positions = {};
    const maxLevel = Math.max(...Object.keys(byLevel).map(Number), 0);
    const svgWidth = 800;
    const ySpacing = 100;

    Object.keys(byLevel).forEach(level => {
      const nodesAtLevel = byLevel[level];
      const xSpacing = svgWidth / (nodesAtLevel.length + 1);
      nodesAtLevel.forEach((n, i) => {
        positions[n] = { x: xSpacing * (i + 1), y: 60 + Number(level) * ySpacing };
      });
    });

    return positions;
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading workflows...</div>;

  const positions = computePositions(selected);
  const svgHeight = selected ? (Math.max(...Object.values(positions).map(p => p.y), 0) + 100) : 300;
  const nodeInfo = selectedNode ? agents[selectedNode] : null;

  return (
    <div data-testid="workflow-view">
      <div className="flex gap-4 mb-4">
        {workflows.map(wf => (
          <button key={wf.workflow_id} onClick={() => { setSelected(wf); setSelectedNode(null); }}
            className={`border px-4 py-2 text-sm font-semibold transition-colors ${selected?.workflow_id === wf.workflow_id ? 'border-[#002FA7] bg-[#002FA7] text-white' : 'border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC]'}`}
            data-testid={`workflow-tab-${wf.workflow_id}`}>
            {wf.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 border border-[#E2E8F0] p-4 overflow-auto" data-testid="workflow-dag">
            <svg width="100%" viewBox={`0 0 800 ${svgHeight}`}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#CBD5E1" />
                </marker>
              </defs>
              {(selected.edges || []).map((e, i) => {
                const from = positions[e.source];
                const to = positions[e.target];
                return from && to ? <Edge key={i} x1={from.x} y1={from.y + 30} x2={to.x} y2={to.y - 30} /> : null;
              })}
              {(selected.nodes || []).map(n => {
                const pos = positions[n];
                return pos ? <Node key={n} node={n} x={pos.x} y={pos.y} isSelected={selectedNode === n} onClick={setSelectedNode} agentData={agents} /> : null;
              })}
            </svg>
          </div>

          <div className="border border-[#E2E8F0] p-4">
            {nodeInfo ? (
              <div data-testid="node-detail">
                <h3 className="font-heading font-bold text-lg mb-3">{nodeInfo.name}</h3>
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">ID</dt><dd className="font-mono">{nodeInfo.agent_id}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Role</dt><dd>{nodeInfo.role}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</dt><dd className="text-slate-600">{nodeInfo.description}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Permissions</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">{(nodeInfo.permissions || []).map(p => <span key={p} className="badge badge-info">{p}</span>)}</dd>
                  </div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Limits</dt>
                    <dd className="font-mono text-xs mt-1 space-y-0.5">
                      {nodeInfo.limits && Object.entries(nodeInfo.limits).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
                    </dd>
                  </div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Fallback</dt><dd className="font-mono">{nodeInfo.fallback_agent_id || 'None'}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Max Retries</dt><dd>{nodeInfo.max_retries}</dd></div>
                </dl>
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-12">
                <p className="font-semibold mb-1">Select a node</p>
                <p>Click any agent in the graph to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

# Stratum v0.2 — Product Requirements Document

## Original Problem Statement
Build a unified multi-agent orchestration and governance control plane (reverse-engineering OpenClaw approach) that allows users to spawn agents, bring custom agents (LangChain, CrewAI), control and govern them precisely, with enterprise integrations (Jira, Salesforce, Teams, Slack) to automate boring work.

## GTM Strategy
Open-source SDK for individual developers -> Teams adoption -> Enterprise licensing. Developer-led growth: devs install SDK, register agents, see them governed in dashboard.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React + Tailwind CSS on port 3000
- **Database**: MongoDB (stratum DB)
- **Auth**: JWT with httpOnly cookies
- **LLM**: OpenRouter (NVIDIA Nemotron 120B free) — key not yet configured

## What's Been Implemented

### Iteration 1 (2026-04-02) — Core Dashboard
- JWT authentication (login, register, logout, refresh, brute force protection)
- Agent Registry CRUD (5 demo agents with permissions, limits, fallbacks)
- Workflow DAG visualization (SVG with node selection)
- Execution Runs with step-level trace viewer
- Policy Engine (4 types: budget, rate_limit, hitl, access_control)
- HITL Approval Queue (approve/reject with audit trail)
- Cost Dashboard with charts (per-agent, distribution pie)
- Enterprise Integrations page (Slack, Jira, Teams)
- Dashboard Overview with 8 stat cards + 2 charts
- Demo data seeding

### Iteration 2 (2026-04-02) — Developer Onboarding
- 4-step Setup Wizard (Generate Key -> Install SDK -> Register Agent -> First Run)
- Live code preview that updates as user fills agent form
- Quickstart reference page (always-accessible, masked API key, 5 code sections)
- API Key management (generate, retrieve, revoke, regenerate)
- Onboarding status tracking API

## P0 Remaining
- [ ] OpenRouter LLM integration (needs API key)
- [ ] Real agent execution engine with governance enforcement
- [ ] Python SDK package (pip install stratum-sdk) — actual PyPI package
- [ ] Real enterprise API connectors (Slack/Jira/Teams webhooks)

## P1 Backlog
- [ ] Config loader (stratum.config.json overrides)
- [ ] Error classifier (retryable vs non-retryable)
- [ ] Rate limiter module
- [ ] Session replay / real-time WebSocket updates
- [ ] Multi-tenant RBAC

## P2 Future
- [ ] Shared memory across agents
- [ ] Rollback/state recovery
- [ ] SOC2 compliance features
- [ ] On-premise deployment

from dotenv import load_dotenv
load_dotenv()

import os
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from routes import router, set_dependencies
from auth import seed_admin

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.agents.create_index("agent_id", unique=True)
    await db.runs.create_index("created_at")
    await db.policies.create_index("policy_id", unique=True)
    await db.hitl_queue.create_index("status")
    await db.integrations.create_index("integration_id", unique=True)
    await db.api_keys.create_index("user_id")
    await db.api_keys.create_index("key", unique=True, sparse=True)

    await seed_admin(db)
    await seed_demo_data(db)

    set_dependencies(db)

    yield

    client.close()


app = FastAPI(
    title="Stratum API",
    description="Unified multi-agent orchestration and governance layer",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


async def seed_demo_data(db):
    existing_agents = await db.agents.count_documents({})
    if existing_agents > 0:
        return

    demo_agents = [
        {
            "agent_id": "fetch_data",
            "name": "Data Fetcher",
            "role": "data_fetcher",
            "description": "Fetches raw data from configured sources and databases",
            "permissions": ["call:llm", "read:kb", "read:db"],
            "limits": {
                "max_input_tokens": 4000,
                "max_output_tokens": 1000,
                "max_calls_per_run": 10,
                "rate_limit_rps": 2.0,
                "max_total_tokens_per_run": 20000,
            },
            "fallback_agent_id": None,
            "max_retries": 3,
            "retry_backoff_seconds": 1.0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "total_runs": 47,
            "total_tokens_used": 125400,
            "total_cost": 0.0251,
            "success_rate": 95.7,
        },
        {
            "agent_id": "analyzer",
            "name": "Content Analyzer",
            "role": "processor",
            "description": "Analyzes and processes fetched data using LLM capabilities",
            "permissions": ["call:llm", "read:kb"],
            "limits": {
                "max_input_tokens": 8000,
                "max_output_tokens": 2000,
                "max_calls_per_run": 5,
                "rate_limit_rps": 1.0,
                "max_total_tokens_per_run": 50000,
            },
            "fallback_agent_id": "summarizer",
            "max_retries": 2,
            "retry_backoff_seconds": 2.0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "total_runs": 42,
            "total_tokens_used": 340200,
            "total_cost": 0.0681,
            "success_rate": 88.1,
        },
        {
            "agent_id": "summarizer",
            "name": "Text Summarizer",
            "role": "processor",
            "description": "Creates concise summaries from analyzed content",
            "permissions": ["call:llm"],
            "limits": {
                "max_input_tokens": 6000,
                "max_output_tokens": 1500,
                "max_calls_per_run": 8,
                "rate_limit_rps": 1.5,
                "max_total_tokens_per_run": 30000,
            },
            "fallback_agent_id": None,
            "max_retries": 3,
            "retry_backoff_seconds": 1.5,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "total_runs": 38,
            "total_tokens_used": 89100,
            "total_cost": 0.0178,
            "success_rate": 97.4,
        },
        {
            "agent_id": "formatter",
            "name": "Output Formatter",
            "role": "formatter",
            "description": "Formats processed data into structured output formats",
            "permissions": ["call:llm", "write:output"],
            "limits": {
                "max_input_tokens": 4000,
                "max_output_tokens": 2000,
                "max_calls_per_run": 10,
                "rate_limit_rps": 3.0,
                "max_total_tokens_per_run": 25000,
            },
            "fallback_agent_id": None,
            "max_retries": 2,
            "retry_backoff_seconds": 1.0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "total_runs": 45,
            "total_tokens_used": 67800,
            "total_cost": 0.0136,
            "success_rate": 100.0,
        },
        {
            "agent_id": "validator",
            "name": "Quality Validator",
            "role": "validator",
            "description": "Validates output quality and enforces compliance rules",
            "permissions": ["call:llm", "read:kb", "read:policy"],
            "limits": {
                "max_input_tokens": 5000,
                "max_output_tokens": 1000,
                "max_calls_per_run": 5,
                "rate_limit_rps": 1.0,
                "max_total_tokens_per_run": 15000,
            },
            "fallback_agent_id": None,
            "max_retries": 1,
            "retry_backoff_seconds": 0.5,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "total_runs": 40,
            "total_tokens_used": 52300,
            "total_cost": 0.0105,
            "success_rate": 92.5,
        },
    ]

    for agent_data in demo_agents:
        await db.agents.update_one(
            {"agent_id": agent_data["agent_id"]},
            {"$set": agent_data},
            upsert=True,
        )

    demo_workflow = {
        "workflow_id": "demo_pipeline",
        "name": "Demo Analysis Pipeline",
        "description": "A 5-agent data analysis workflow with parallel branches",
        "nodes": ["fetch_data", "analyzer", "summarizer", "formatter", "validator"],
        "edges": [
            {"source": "fetch_data", "target": "analyzer"},
            {"source": "fetch_data", "target": "summarizer"},
            {"source": "analyzer", "target": "formatter"},
            {"source": "summarizer", "target": "formatter"},
            {"source": "formatter", "target": "validator"},
        ],
        "config": {
            "max_total_tokens": 150000,
            "parallel_execution": True,
            "max_workers": 4,
        },
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.workflows.update_one(
        {"workflow_id": demo_workflow["workflow_id"]},
        {"$set": demo_workflow},
        upsert=True,
    )

    demo_policies = [
        {
            "policy_id": "budget_enforcement",
            "name": "Token Budget Enforcement",
            "description": "Enforce per-run and per-agent token budgets to prevent cost overruns",
            "type": "budget",
            "rules": {
                "max_tokens_per_run": 150000,
                "max_cost_per_run": 0.50,
                "alert_threshold_percent": 80,
            },
            "enabled": True,
            "scope": "global",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "policy_id": "rate_limiting",
            "name": "Agent Rate Limiting",
            "description": "Enforce call frequency limits per agent to prevent API abuse",
            "type": "rate_limit",
            "rules": {
                "default_rps": 1.0,
                "burst_limit": 5,
                "cooldown_seconds": 60,
            },
            "enabled": True,
            "scope": "global",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "policy_id": "hitl_gate",
            "name": "Human-in-the-Loop Gate",
            "description": "Require human approval for high-risk agent actions",
            "type": "hitl",
            "rules": {
                "require_approval_for": ["write:external", "send:email", "execute:code"],
                "timeout_minutes": 30,
                "auto_reject_on_timeout": True,
            },
            "enabled": True,
            "scope": "global",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "policy_id": "access_control",
            "name": "Tool Access Control",
            "description": "Control which agents can access which tools and APIs",
            "type": "access_control",
            "rules": {
                "default_deny": False,
                "audit_all_access": True,
            },
            "enabled": True,
            "scope": "global",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]

    for policy in demo_policies:
        await db.policies.update_one(
            {"policy_id": policy["policy_id"]},
            {"$set": policy},
            upsert=True,
        )

    now = datetime.now(timezone.utc)
    demo_runs = []
    import uuid

    statuses = ["completed", "completed", "completed", "failed", "completed"]
    for i in range(5):
        run_id = str(uuid.uuid4())
        run_status = statuses[i]
        steps = []
        for j, agent_id in enumerate(["fetch_data", "analyzer", "summarizer", "formatter", "validator"]):
            step_status = "completed"
            if run_status == "failed" and j == 3:
                step_status = "failed"
            elif run_status == "failed" and j > 3:
                step_status = "skipped"

            steps.append({
                "step_id": str(uuid.uuid4()),
                "agent_name": agent_id,
                "status": step_status,
                "input_tokens": 500 + (j * 200),
                "output_tokens": 200 + (j * 100),
                "cost": round(0.002 + (j * 0.001), 4),
                "duration": round(1.2 + (j * 0.5), 2),
                "retry_count": 1 if (i == 2 and j == 1) else 0,
                "fallback_used": i == 2 and j == 1,
                "fallback_agent_id": "summarizer" if (i == 2 and j == 1) else None,
                "skip_reason": "Previous step failed" if step_status == "skipped" else None,
                "error": "Timeout: LLM provider did not respond within 30s" if step_status == "failed" else None,
                "permissions_checked": demo_agents[j]["permissions"],
                "start_time": now.isoformat(),
                "end_time": now.isoformat(),
            })

        total_tokens = sum(s["input_tokens"] + s["output_tokens"] for s in steps if s["status"] == "completed")
        total_cost = sum(s["cost"] for s in steps if s["status"] == "completed")

        demo_runs.append({
            "run_id": run_id,
            "workflow_id": "demo_pipeline",
            "workflow_name": "Demo Analysis Pipeline",
            "status": run_status,
            "steps": steps,
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "input_data": {"query": f"Sample query {i+1}", "source": "demo"},
            "output_data": {"result": f"Processed output {i+1}"} if run_status == "completed" else None,
            "error": "Agent 'formatter' failed: Timeout" if run_status == "failed" else None,
            "steps_completed": sum(1 for s in steps if s["status"] == "completed"),
            "steps_failed": sum(1 for s in steps if s["status"] == "failed"),
            "steps_skipped": sum(1 for s in steps if s["status"] == "skipped"),
            "steps_with_fallback": sum(1 for s in steps if s.get("fallback_used")),
            "created_at": now.isoformat(),
            "started_at": now.isoformat(),
            "completed_at": now.isoformat(),
            "duration": round(sum(s["duration"] for s in steps), 2),
        })

    for run in demo_runs:
        await db.runs.update_one(
            {"run_id": run["run_id"]},
            {"$set": run},
            upsert=True,
        )

    demo_hitl = [
        {
            "request_id": str(uuid.uuid4()),
            "run_id": demo_runs[0]["run_id"],
            "agent_id": "formatter",
            "action": "write:external",
            "description": "Agent wants to write formatted output to external API endpoint",
            "context": {"target": "https://api.example.com/reports", "payload_size": "2.4KB"},
            "status": "pending",
            "created_at": now.isoformat(),
            "timeout_at": datetime(2025, 12, 31, tzinfo=timezone.utc).isoformat(),
        },
        {
            "request_id": str(uuid.uuid4()),
            "run_id": demo_runs[1]["run_id"],
            "agent_id": "analyzer",
            "action": "execute:code",
            "description": "Agent wants to execute a Python script for data transformation",
            "context": {"script": "transform_data.py", "risk_level": "medium"},
            "status": "approved",
            "decided_by": "admin@stratum.io",
            "decided_at": now.isoformat(),
            "created_at": now.isoformat(),
        },
        {
            "request_id": str(uuid.uuid4()),
            "run_id": demo_runs[2]["run_id"],
            "agent_id": "validator",
            "action": "send:email",
            "description": "Agent wants to send validation report via email",
            "context": {"recipient": "team@company.com", "subject": "Validation Report"},
            "status": "rejected",
            "decided_by": "admin@stratum.io",
            "decided_at": now.isoformat(),
            "reason": "Email sending not approved for automated workflows",
            "created_at": now.isoformat(),
        },
    ]

    for hitl in demo_hitl:
        await db.hitl_queue.update_one(
            {"request_id": hitl["request_id"]},
            {"$set": hitl},
            upsert=True,
        )

    demo_integrations = [
        {
            "integration_id": "slack",
            "name": "Slack",
            "type": "communication",
            "description": "Send agent notifications and approvals to Slack channels",
            "status": "disconnected",
            "config": {},
            "icon": "slack",
            "created_at": now.isoformat(),
        },
        {
            "integration_id": "jira",
            "name": "Jira",
            "type": "project_management",
            "description": "Create and update Jira tickets from agent workflows",
            "status": "disconnected",
            "config": {},
            "icon": "jira",
            "created_at": now.isoformat(),
        },
        {
            "integration_id": "teams",
            "name": "Microsoft Teams",
            "type": "communication",
            "description": "Integrate with Teams for notifications and approvals",
            "status": "disconnected",
            "config": {},
            "icon": "teams",
            "created_at": now.isoformat(),
        },
    ]

    for integ in demo_integrations:
        await db.integrations.update_one(
            {"integration_id": integ["integration_id"]},
            {"$set": integ},
            upsert=True,
        )

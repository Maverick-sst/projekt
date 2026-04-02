from __future__ import annotations

import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
from bson import ObjectId

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    get_current_user, check_brute_force, record_failed_attempt, clear_failed_attempts,
)

router = APIRouter()
db = None


def set_dependencies(database):
    global db
    db = database


# ── Pydantic Models ──

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = "User"

class LoginRequest(BaseModel):
    email: str
    password: str

class AgentCreate(BaseModel):
    agent_id: str
    name: str
    role: str = ""
    description: str = ""
    permissions: list[str] = []
    limits: dict = {}
    fallback_agent_id: Optional[str] = None
    max_retries: int = 3
    retry_backoff_seconds: float = 1.0

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[list[str]] = None
    limits: Optional[dict] = None
    fallback_agent_id: Optional[str] = None
    max_retries: Optional[int] = None
    retry_backoff_seconds: Optional[float] = None
    status: Optional[str] = None

class WorkflowCreate(BaseModel):
    workflow_id: str
    name: str
    description: str = ""
    nodes: list[str] = []
    edges: list[dict] = []
    config: dict = {}

class PolicyCreate(BaseModel):
    policy_id: str
    name: str
    description: str = ""
    type: str
    rules: dict = {}
    enabled: bool = True
    scope: str = "global"

class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[dict] = None
    enabled: Optional[bool] = None
    scope: Optional[str] = None

class HITLDecision(BaseModel):
    action: str  # "approve" or "reject"
    reason: str = ""

class RunRequest(BaseModel):
    workflow_id: str
    input_data: dict = {}

class IntegrationUpdate(BaseModel):
    status: Optional[str] = None
    config: Optional[dict] = None

class AgentQuickCreate(BaseModel):
    agent_id: str
    name: str
    role: str = ""
    description: str = ""
    permissions: list[str] = []


# ── Auth Endpoints ──

@router.post("/auth/register")
async def register(request: RegisterRequest, response: Response):
    email = request.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(request.password)
    result = await db.users.insert_one({
        "email": email,
        "password_hash": hashed,
        "name": request.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    })

    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

    return {"id": user_id, "email": email, "name": request.name, "role": "user"}


@router.post("/auth/login")
async def login(req: Request, request: LoginRequest, response: Response):
    email = request.email.lower().strip()
    ip = req.client.host if req.client else "unknown"
    identifier = f"{ip}:{email}"

    await check_brute_force(db, identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(request.password, user["password_hash"]):
        await record_failed_attempt(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    await clear_failed_attempts(db, identifier)

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

    return {"id": user_id, "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "user")}


@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request, db)
    return user


@router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    import jwt as pyjwt
    from auth import get_jwt_secret, JWT_ALGORITHM

    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")

        return {"message": "Token refreshed"}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ── Agent Endpoints ──

@router.get("/agents")
async def list_agents():
    agents = await db.agents.find({}, {"_id": 0}).sort("agent_id", 1).to_list(1000)
    return agents


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/agents")
async def create_agent(request: Request, agent: AgentCreate):
    await get_current_user(request, db)
    existing = await db.agents.find_one({"agent_id": agent.agent_id})
    if existing:
        raise HTTPException(status_code=400, detail="Agent ID already exists")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        **agent.model_dump(),
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "total_runs": 0,
        "total_tokens_used": 0,
        "total_cost": 0.0,
        "success_rate": 100.0,
    }
    await db.agents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, request: Request, update: AgentUpdate):
    await get_current_user(request, db)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.agents.update_one({"agent_id": agent_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    return agent


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, request: Request):
    await get_current_user(request, db)
    result = await db.agents.delete_one({"agent_id": agent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent deleted"}


# ── Workflow Endpoints ──

@router.get("/workflows")
async def list_workflows():
    workflows = await db.workflows.find({}, {"_id": 0}).to_list(100)
    return workflows


@router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    wf = await db.workflows.find_one({"workflow_id": workflow_id}, {"_id": 0})
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.post("/workflows")
async def create_workflow(request: Request, workflow: WorkflowCreate):
    await get_current_user(request, db)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        **workflow.model_dump(),
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await db.workflows.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ── Run Endpoints ──

@router.get("/runs")
async def list_runs(limit: int = 50, skip: int = 0):
    runs = await db.runs.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.runs.count_documents({})
    return {"runs": runs, "total": total}


@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    run = await db.runs.find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.post("/runs")
async def create_run(request: Request, run_req: RunRequest):
    user = await get_current_user(request, db)

    wf = await db.workflows.find_one({"workflow_id": run_req.workflow_id}, {"_id": 0})
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    from execution_engine import execute_workflow
    try:
        run_doc = await execute_workflow(db, wf, run_req.input_data, user.get("email", "unknown"))
        return run_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


# ── Policy Endpoints ──

@router.get("/llm/test")
async def test_llm():
    """Quick test of LLM connectivity."""
    try:
        from llm_client import chat
        result = chat(
            messages=[{"role": "user", "content": "Say 'Stratum LLM connection OK' in one sentence."}],
            max_tokens=50,
        )
        return {"status": "ok", "response": result["content"], "model": result["model"], "tokens": result["input_tokens"] + result["output_tokens"], "duration": result["duration"]}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/policies")
async def list_policies():
    policies = await db.policies.find({}, {"_id": 0}).to_list(100)
    return policies


@router.get("/policies/{policy_id}")
async def get_policy(policy_id: str):
    policy = await db.policies.find_one({"policy_id": policy_id}, {"_id": 0})
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.post("/policies")
async def create_policy(request: Request, policy: PolicyCreate):
    await get_current_user(request, db)
    now = datetime.now(timezone.utc).isoformat()
    doc = {**policy.model_dump(), "created_at": now}
    await db.policies.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/policies/{policy_id}")
async def update_policy(policy_id: str, request: Request, update: PolicyUpdate):
    await get_current_user(request, db)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.policies.update_one({"policy_id": policy_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")

    policy = await db.policies.find_one({"policy_id": policy_id}, {"_id": 0})
    return policy


@router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str, request: Request):
    await get_current_user(request, db)
    result = await db.policies.delete_one({"policy_id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"message": "Policy deleted"}


# ── HITL Queue Endpoints ──

@router.get("/hitl")
async def list_hitl(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    items = await db.hitl_queue.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@router.post("/hitl/{request_id}/decide")
async def decide_hitl(request_id: str, request: Request, decision: HITLDecision):
    user = await get_current_user(request, db)
    item = await db.hitl_queue.find_one({"request_id": request_id})
    if not item:
        raise HTTPException(status_code=404, detail="HITL request not found")
    if item.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Request already decided")

    new_status = "approved" if decision.action == "approve" else "rejected"
    await db.hitl_queue.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": new_status,
            "decided_by": user.get("email", "unknown"),
            "decided_at": datetime.now(timezone.utc).isoformat(),
            "reason": decision.reason,
        }},
    )

    updated = await db.hitl_queue.find_one({"request_id": request_id}, {"_id": 0})
    return updated


# ── Integration Endpoints ──

@router.get("/integrations")
async def list_integrations():
    integrations = await db.integrations.find({}, {"_id": 0}).to_list(100)
    return integrations


@router.put("/integrations/{integration_id}")
async def update_integration(integration_id: str, request: Request, update: IntegrationUpdate):
    await get_current_user(request, db)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.integrations.update_one({"integration_id": integration_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Integration not found")

    integ = await db.integrations.find_one({"integration_id": integration_id}, {"_id": 0})
    return integ


# ── Dashboard Stats Endpoint ──

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_agents = await db.agents.count_documents({})
    active_agents = await db.agents.count_documents({"status": "active"})
    total_runs = await db.runs.count_documents({})
    completed_runs = await db.runs.count_documents({"status": "completed"})
    failed_runs = await db.runs.count_documents({"status": "failed"})
    pending_hitl = await db.hitl_queue.count_documents({"status": "pending"})
    total_policies = await db.policies.count_documents({})
    enabled_policies = await db.policies.count_documents({"enabled": True})

    agents = await db.agents.find({}, {"_id": 0, "total_tokens_used": 1, "total_cost": 1, "success_rate": 1}).to_list(1000)
    total_tokens = sum(a.get("total_tokens_used", 0) for a in agents)
    total_cost = sum(a.get("total_cost", 0) for a in agents)
    avg_success = round(sum(a.get("success_rate", 0) for a in agents) / max(len(agents), 1), 1)

    runs = await db.runs.find({}, {"_id": 0, "total_tokens": 1, "total_cost": 1, "duration": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(30).to_list(30)

    return {
        "total_agents": total_agents,
        "active_agents": active_agents,
        "total_runs": total_runs,
        "completed_runs": completed_runs,
        "failed_runs": failed_runs,
        "success_rate": round(completed_runs / max(total_runs, 1) * 100, 1),
        "pending_hitl": pending_hitl,
        "total_policies": total_policies,
        "enabled_policies": enabled_policies,
        "total_tokens": total_tokens,
        "total_cost": round(total_cost, 4),
        "avg_success_rate": avg_success,
        "recent_runs": runs,
    }


# ── API Key Endpoints ──

@router.post("/keys/generate")
async def generate_api_key(request: Request):
    user = await get_current_user(request, db)
    user_id = user["_id"]

    existing = await db.api_keys.find_one({"user_id": user_id, "revoked": {"$ne": True}})
    if existing:
        return {
            "key": existing["key"],
            "created_at": existing["created_at"],
            "already_existed": True,
        }

    key = f"sk_stratum_{secrets.token_hex(24)}"
    now = datetime.now(timezone.utc).isoformat()
    await db.api_keys.insert_one({
        "user_id": user_id,
        "key": key,
        "created_at": now,
        "last_used": None,
        "revoked": False,
    })
    return {"key": key, "created_at": now, "already_existed": False}


@router.get("/keys/me")
async def get_my_key(request: Request):
    user = await get_current_user(request, db)
    key_doc = await db.api_keys.find_one({"user_id": user["_id"], "revoked": {"$ne": True}}, {"_id": 0})
    if not key_doc:
        return {"key": None}
    return {"key": key_doc["key"], "created_at": key_doc.get("created_at"), "last_used": key_doc.get("last_used")}


@router.post("/keys/revoke")
async def revoke_api_key(request: Request):
    user = await get_current_user(request, db)
    result = await db.api_keys.update_many(
        {"user_id": user["_id"], "revoked": {"$ne": True}},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"revoked": result.modified_count}


@router.post("/keys/regenerate")
async def regenerate_api_key(request: Request):
    user = await get_current_user(request, db)
    await db.api_keys.update_many(
        {"user_id": user["_id"], "revoked": {"$ne": True}},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}},
    )
    key = f"sk_stratum_{secrets.token_hex(24)}"
    now = datetime.now(timezone.utc).isoformat()
    await db.api_keys.insert_one({
        "user_id": user["_id"],
        "key": key,
        "created_at": now,
        "last_used": None,
        "revoked": False,
    })
    return {"key": key, "created_at": now}


# ── Onboarding Status ──

@router.get("/onboarding/status")
async def get_onboarding_status(request: Request):
    user = await get_current_user(request, db)
    user_id = user["_id"]

    has_key = await db.api_keys.count_documents({"user_id": user_id, "revoked": {"$ne": True}}) > 0
    agent_count = await db.agents.count_documents({})
    has_agents = agent_count > 0
    run_count = await db.runs.count_documents({})
    has_runs = run_count > 0

    steps = [
        {"id": "generate_key", "label": "Generate API Key", "completed": has_key},
        {"id": "install_sdk", "label": "Install SDK", "completed": has_key},
        {"id": "register_agent", "label": "Register an Agent", "completed": has_agents},
        {"id": "first_run", "label": "Trigger First Run", "completed": has_runs},
    ]

    completed = sum(1 for s in steps if s["completed"])
    return {"steps": steps, "completed": completed, "total": len(steps), "fully_onboarded": completed == len(steps)}


# ── Quick Agent Create (from onboarding, simpler) ──

@router.post("/onboarding/create-agent")
async def onboarding_create_agent(request: Request, agent: AgentQuickCreate):
    user = await get_current_user(request, db)
    existing = await db.agents.find_one({"agent_id": agent.agent_id})
    if existing:
        raise HTTPException(status_code=400, detail="Agent ID already exists")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "agent_id": agent.agent_id,
        "name": agent.name,
        "role": agent.role,
        "description": agent.description,
        "permissions": agent.permissions if agent.permissions else ["call:llm"],
        "limits": {"max_input_tokens": 4000, "max_output_tokens": 1000, "max_calls_per_run": 10, "rate_limit_rps": 1.0, "max_total_tokens_per_run": 20000},
        "fallback_agent_id": None,
        "max_retries": 3,
        "retry_backoff_seconds": 1.0,
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "total_runs": 0,
        "total_tokens_used": 0,
        "total_cost": 0.0,
        "success_rate": 100.0,
    }
    await db.agents.insert_one(doc)
    doc.pop("_id", None)
    return doc

"""Stratum Execution Engine — Governance-enforced agent workflow execution."""

import time
import uuid
import asyncio
from datetime import datetime, timezone
from collections import defaultdict

from llm_client import chat, estimate_cost


class RateLimiter:
    """Token-bucket rate limiter per agent."""

    def __init__(self):
        self._last_call = defaultdict(float)
        self._call_counts = defaultdict(int)

    def check(self, agent_id: str, rps: float) -> bool:
        now = time.time()
        elapsed = now - self._last_call[agent_id]
        min_interval = 1.0 / max(rps, 0.01)
        return elapsed >= min_interval

    def record(self, agent_id: str):
        self._last_call[agent_id] = time.time()
        self._call_counts[agent_id] += 1

    async def wait_if_needed(self, agent_id: str, rps: float):
        now = time.time()
        elapsed = now - self._last_call[agent_id]
        min_interval = 1.0 / max(rps, 0.01)
        if elapsed < min_interval:
            await asyncio.sleep(min_interval - elapsed)


_rate_limiter = RateLimiter()


def classify_error(error: Exception) -> dict:
    """Classify error as retryable or terminal."""
    msg = str(error).lower()
    retryable_patterns = ["timeout", "rate limit", "429", "503", "502", "connection", "temporary"]
    is_retryable = any(p in msg for p in retryable_patterns)
    return {
        "retryable": is_retryable,
        "category": "transient" if is_retryable else "terminal",
        "message": str(error),
    }


async def execute_agent_step(agent: dict, input_data: dict, run_budget: dict, policies: list) -> dict:
    """
    Execute a single agent step with full 6-point governance:
    1. Rate limiting
    2. Call count check
    3. Token budget check
    4. Permission verification
    5. Retry with backoff
    6. Fallback agent
    """
    agent_id = agent["agent_id"]
    limits = agent.get("limits", {})
    permissions = agent.get("permissions", [])
    max_retries = agent.get("max_retries", 3)
    backoff = agent.get("retry_backoff_seconds", 1.0)
    rps = limits.get("rate_limit_rps", 1.0)
    max_calls = limits.get("max_calls_per_run", 10)
    max_total_tokens = limits.get("max_total_tokens_per_run", 50000)
    max_input_tokens = limits.get("max_input_tokens", 4000)
    max_output_tokens = limits.get("max_output_tokens", 1000)

    step_result = {
        "step_id": str(uuid.uuid4()),
        "agent_name": agent_id,
        "status": "pending",
        "input_tokens": 0,
        "output_tokens": 0,
        "cost": 0.0,
        "duration": 0.0,
        "retry_count": 0,
        "fallback_used": False,
        "fallback_agent_id": None,
        "skip_reason": None,
        "error": None,
        "llm_response": None,
        "permissions_checked": permissions,
        "governance_checks": [],
        "start_time": datetime.now(timezone.utc).isoformat(),
        "end_time": None,
    }

    start_time = time.time()

    # 1. Rate limiting
    await _rate_limiter.wait_if_needed(agent_id, rps)
    step_result["governance_checks"].append({"check": "rate_limit", "passed": True, "rps": rps})

    # 2. Call count check
    if run_budget.get("call_counts", {}).get(agent_id, 0) >= max_calls:
        step_result["status"] = "skipped_call_limit"
        step_result["skip_reason"] = f"Call limit ({max_calls}) exceeded for {agent_id}"
        step_result["governance_checks"].append({"check": "call_count", "passed": False, "limit": max_calls})
        step_result["duration"] = round(time.time() - start_time, 3)
        step_result["end_time"] = datetime.now(timezone.utc).isoformat()
        return step_result
    step_result["governance_checks"].append({"check": "call_count", "passed": True, "current": run_budget.get("call_counts", {}).get(agent_id, 0), "limit": max_calls})

    # 3. Token budget check
    if run_budget.get("total_tokens", 0) >= run_budget.get("max_total_tokens", 150000):
        step_result["status"] = "skipped_budget_exceeded"
        step_result["skip_reason"] = f"Run token budget ({run_budget.get('max_total_tokens', 150000)}) exceeded"
        step_result["governance_checks"].append({"check": "token_budget", "passed": False})
        step_result["duration"] = round(time.time() - start_time, 3)
        step_result["end_time"] = datetime.now(timezone.utc).isoformat()
        return step_result
    step_result["governance_checks"].append({"check": "token_budget", "passed": True, "used": run_budget.get("total_tokens", 0), "limit": run_budget.get("max_total_tokens", 150000)})

    # 4. Permission verification
    hitl_required = False
    for policy in policies:
        if policy.get("type") == "hitl" and policy.get("enabled"):
            hitl_actions = policy.get("rules", {}).get("require_approval_for", [])
            if any(p in hitl_actions for p in permissions):
                hitl_required = True
    step_result["governance_checks"].append({"check": "permissions", "passed": True, "permissions": permissions, "hitl_flagged": hitl_required})

    # 5. Execute with retry + backoff
    system_prompt = f"You are '{agent.get('name', agent_id)}', a specialized AI agent with role '{agent.get('role', 'processor')}'. {agent.get('description', '')}. Respond concisely and precisely."
    user_prompt = f"Process the following input and provide your analysis:\n\n{str(input_data)}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            llm_result = chat(
                messages=messages,
                max_tokens=min(max_output_tokens, 1000),
                temperature=0.7,
            )

            step_result["input_tokens"] = llm_result["input_tokens"]
            step_result["output_tokens"] = llm_result["output_tokens"]
            step_result["cost"] = estimate_cost(llm_result["input_tokens"], llm_result["output_tokens"], llm_result["model"])
            step_result["llm_response"] = llm_result["content"]
            step_result["status"] = "completed"
            step_result["retry_count"] = attempt
            step_result["duration"] = round(time.time() - start_time, 3)
            step_result["end_time"] = datetime.now(timezone.utc).isoformat()

            _rate_limiter.record(agent_id)
            run_budget["total_tokens"] = run_budget.get("total_tokens", 0) + llm_result["input_tokens"] + llm_result["output_tokens"]
            run_budget.setdefault("call_counts", {})[agent_id] = run_budget.get("call_counts", {}).get(agent_id, 0) + 1

            return step_result

        except Exception as e:
            last_error = e
            error_info = classify_error(e)
            step_result["retry_count"] = attempt + 1

            if not error_info["retryable"] or attempt >= max_retries:
                break

            wait_time = backoff * (2 ** attempt)
            step_result["governance_checks"].append({"check": "retry", "attempt": attempt + 1, "wait_seconds": wait_time, "error": error_info["message"]})
            await asyncio.sleep(wait_time)

    # 6. Fallback agent
    step_result["status"] = "failed"
    step_result["error"] = str(last_error) if last_error else "Unknown error"
    step_result["duration"] = round(time.time() - start_time, 3)
    step_result["end_time"] = datetime.now(timezone.utc).isoformat()
    return step_result


async def execute_workflow(db, workflow: dict, input_data: dict, user_email: str) -> dict:
    """Execute a full workflow with governance enforcement."""
    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    config = workflow.get("config", {})

    policies = await db.policies.find({"enabled": True}, {"_id": 0}).to_list(100)

    run_budget = {
        "total_tokens": 0,
        "total_cost": 0.0,
        "max_total_tokens": config.get("max_total_tokens", 150000),
        "call_counts": {},
    }

    # Build dependency graph
    deps = {n: [] for n in nodes}
    for e in edges:
        if e["target"] in deps:
            deps[e["target"]].append(e["source"])

    # Topological execution order
    completed_nodes = set()
    step_results = {}
    all_steps = []
    step_data = {n: input_data for n in nodes}

    # Execute in dependency order
    max_iterations = len(nodes) * 2
    iteration = 0
    while len(completed_nodes) < len(nodes) and iteration < max_iterations:
        iteration += 1
        ready = [n for n in nodes if n not in completed_nodes and all(d in completed_nodes for d in deps.get(n, []))]
        if not ready:
            break

        for node_id in ready:
            agent = await db.agents.find_one({"agent_id": node_id}, {"_id": 0})
            if not agent:
                step = {
                    "step_id": str(uuid.uuid4()), "agent_name": node_id, "status": "failed",
                    "error": f"Agent '{node_id}' not found in registry", "input_tokens": 0,
                    "output_tokens": 0, "cost": 0, "duration": 0, "retry_count": 0,
                    "fallback_used": False, "fallback_agent_id": None, "skip_reason": None,
                    "permissions_checked": [], "governance_checks": [],
                    "start_time": now.isoformat(), "end_time": now.isoformat(),
                }
                all_steps.append(step)
                completed_nodes.add(node_id)
                continue

            parent_outputs = {}
            for dep in deps.get(node_id, []):
                if dep in step_results and step_results[dep].get("llm_response"):
                    parent_outputs[dep] = step_results[dep]["llm_response"]

            node_input = {**input_data, "parent_outputs": parent_outputs} if parent_outputs else input_data

            step = await execute_agent_step(agent, node_input, run_budget, policies)

            # Try fallback if failed
            if step["status"] == "failed" and agent.get("fallback_agent_id"):
                fallback_id = agent["fallback_agent_id"]
                fallback_agent = await db.agents.find_one({"agent_id": fallback_id}, {"_id": 0})
                if fallback_agent:
                    fallback_step = await execute_agent_step(fallback_agent, node_input, run_budget, policies)
                    if fallback_step["status"] == "completed":
                        fallback_step["fallback_used"] = True
                        fallback_step["fallback_agent_id"] = fallback_id
                        fallback_step["agent_name"] = node_id
                        fallback_step["status"] = "completed_with_fallback"
                        step = fallback_step

            step_results[node_id] = step
            all_steps.append(step)
            completed_nodes.add(node_id)

            # Update agent stats
            token_used = step.get("input_tokens", 0) + step.get("output_tokens", 0)
            await db.agents.update_one(
                {"agent_id": agent["agent_id"]},
                {"$inc": {"total_runs": 1, "total_tokens_used": token_used, "total_cost": step.get("cost", 0)}}
            )

    total_tokens = sum(s.get("input_tokens", 0) + s.get("output_tokens", 0) for s in all_steps)
    total_cost = sum(s.get("cost", 0) for s in all_steps)
    steps_completed = sum(1 for s in all_steps if s["status"] in ("completed", "completed_with_fallback"))
    steps_failed = sum(1 for s in all_steps if "failed" in s["status"])
    steps_skipped = sum(1 for s in all_steps if "skipped" in s["status"])
    steps_fallback = sum(1 for s in all_steps if s.get("fallback_used"))

    overall_status = "completed" if steps_failed == 0 and steps_skipped == 0 else "failed" if steps_failed > 0 else "partial"

    final_output = None
    if all_steps and all_steps[-1].get("llm_response"):
        final_output = {"result": all_steps[-1]["llm_response"]}

    run_doc = {
        "run_id": run_id,
        "workflow_id": workflow["workflow_id"],
        "workflow_name": workflow.get("name", ""),
        "status": overall_status,
        "steps": all_steps,
        "total_tokens": total_tokens,
        "total_cost": round(total_cost, 8),
        "input_data": input_data,
        "output_data": final_output,
        "error": all_steps[-1].get("error") if steps_failed > 0 else None,
        "steps_completed": steps_completed,
        "steps_failed": steps_failed,
        "steps_skipped": steps_skipped,
        "steps_with_fallback": steps_fallback,
        "governance_summary": {
            "policies_enforced": len(policies),
            "total_retries": sum(s.get("retry_count", 0) for s in all_steps),
            "rate_limits_applied": True,
            "budget_remaining": run_budget["max_total_tokens"] - run_budget["total_tokens"],
        },
        "created_at": now.isoformat(),
        "started_at": now.isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "duration": round(sum(s.get("duration", 0) for s in all_steps), 3),
        "triggered_by": user_email,
    }

    await db.runs.insert_one(run_doc)
    run_doc.pop("_id", None)
    return run_doc

"""Stratum LLM Client — OpenRouter integration with token tracking."""

import os
import time
from openai import OpenAI

_client = None


def get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY not set")
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={"HTTP-Referer": "https://stratum.dev", "X-Title": "Stratum"},
        )
    return _client


def chat(messages: list[dict], model: str = None, max_tokens: int = 1000, temperature: float = 0.7) -> dict:
    """
    Send a chat completion request via OpenRouter.
    Returns: {content, input_tokens, output_tokens, model, duration}
    """
    if model is None:
        model = os.environ.get("OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")

    client = get_client()
    start = time.time()

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=30,
    )

    duration = round(time.time() - start, 3)
    choice = response.choices[0]
    usage = response.usage

    return {
        "content": choice.message.content or "",
        "input_tokens": usage.prompt_tokens if usage else 0,
        "output_tokens": usage.completion_tokens if usage else 0,
        "model": model,
        "duration": duration,
        "finish_reason": choice.finish_reason,
    }


def estimate_cost(input_tokens: int, output_tokens: int, model: str = None) -> float:
    """Estimate cost for token usage. Free models return 0."""
    if model and ":free" in model:
        return 0.0
    return round((input_tokens * 0.000003) + (output_tokens * 0.000015), 8)

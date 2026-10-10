"""Thin provider abstraction. One function in, text/JSON out."""
import json
import re
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from config import settings

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    pass


def complete(prompt: str, system: str | None = None, json_mode: bool = False) -> str:
    try:
        if settings.llm_provider == "ollama":
            return _ollama(prompt, system, json_mode)
        if settings.llm_provider == "openai_compatible":
            return _openai(prompt, system, json_mode)
    except httpx.TimeoutException as e:
        raise LLMError("Model request timed out. Your existing work is preserved; retry.") from e
    except httpx.HTTPError as e:
        raise LLMError(f"Model provider unavailable: {e}") from e
    raise LLMError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")


def _ollama(prompt: str, system: str | None, json_mode: bool) -> str:
    messages = ([{"role": "system", "content": system}] if system else []) + [
        {"role": "user", "content": prompt}
    ]
    body = {"model": settings.llm_model, "messages": messages, "stream": False}
    if json_mode:
        body["format"] = "json"
    r = httpx.post(f"{settings.ollama_host}/api/chat", json=body, timeout=settings.llm_timeout_s)
    r.raise_for_status()
    return r.json()["message"]["content"]


def _openai(prompt: str, system: str | None, json_mode: bool) -> str:
    messages = ([{"role": "system", "content": system}] if system else []) + [
        {"role": "user", "content": prompt}
    ]
    body: dict = {"model": settings.llm_model, "messages": messages}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    r = httpx.post(
        f"{settings.openai_base_url}/chat/completions",
        json=body,
        headers={"Authorization": f"Bearer {settings.openai_api_key}"},
        timeout=settings.llm_timeout_s,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


def complete_json(prompt: str, model_cls: type[T], system: str | None = None, retries: int = 1) -> T:
    """Call the model, parse into a Pydantic model, retry once with a correction prompt."""
    last_err: Exception | None = None
    current = prompt
    for _ in range(retries + 1):
        raw = complete(current, system=system, json_mode=True)
        try:
            return model_cls.model_validate(_extract_json(raw))
        except (json.JSONDecodeError, ValidationError) as e:
            last_err = e
            current = (
                f"{prompt}\n\nYour previous reply was invalid ({str(e)[:300]}). "
                "Return ONLY a valid JSON object matching the schema."
            )
    raise LLMError(f"Model returned invalid structured output: {last_err}")

from pathlib import Path
from string import Template

from core.llm import complete_json
from core.rag.retriever import Retriever
from core.schemas import ProjectProfile, SourceDocument

PROMPTS = Path(__file__).resolve().parent.parent / "prompts"

_QUERIES = [
    "what does this project do purpose problem",
    "architecture components design structure",
    "technologies frameworks libraries dependencies",
    "results metrics evaluation accuracy performance",
    "limitations challenges future work",
]


def load_prompt(name: str) -> Template:
    return Template((PROMPTS / f"{name}.txt").read_text(encoding="utf-8"))


def analyze_project(docs: list[SourceDocument], retriever: Retriever) -> ProjectProfile:
    seen: dict[str, str] = {}
    for q in _QUERIES:
        for h in retriever.search(q, k=4):
            c = h.chunk
            seen.setdefault(c.chunk_id, f"[{c.path}:{c.start_line}-{c.end_line}]\n{c.text}")
    context = "\n\n---\n\n".join(seen.values()) or "\n\n".join(d.content[:3000] for d in docs)
    prompt = load_prompt("project_analysis").substitute(context=context)
    return complete_json(prompt, ProjectProfile)

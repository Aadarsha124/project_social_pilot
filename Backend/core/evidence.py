"""Deterministic claim checking against retrieved chunks.
Statuses are PRELIMINARY: lexical support, not proof of truth. Excerpts stay visible for the user."""
import re

from core.rag.bm25 import tokenize
from core.rag.retriever import Retriever
from core.schemas import Claim, EvidenceReference, SourceDocument

_STOP = set("the a an and or of to in on for with is are was were be by as at it this that from its their can".split())
_NUM = re.compile(r"\b\d+(?:\.\d+)?\s?(?:%|ms|s|x|k|m|users|requests|rps)?", re.I)
SUPPORTED, REVIEW = 0.6, 0.3


def _terms(text: str) -> set[str]:
    return {t for t in tokenize(text) if t not in _STOP and len(t) > 2}


def verify_claim(text: str, retriever: Retriever, docs: list[SourceDocument] | None = None) -> Claim:
    terms = _terms(text)
    best, best_cov = [], 0.0
    for hit in retriever.search(text, k=3):
        cov = len(terms & _terms(hit.chunk.text)) / len(terms) if terms else 0.0
        if cov > 0:
            best.append((cov, hit.chunk))
        best_cov = max(best_cov, cov)
    evidence = [
        EvidenceReference(
            source_id=c.source_id, path=c.path, start_line=c.start_line, end_line=c.end_line,
            source_url=c.source_url, excerpt=c.text[:400],
        )
        for cov, c in sorted(best, key=lambda x: -x[0])[:2]
    ]
    status = "supported" if best_cov >= SUPPORTED else "needs_review" if best_cov >= REVIEW else "unsupported"
    note = None
    if docs:
        missing = unsupported_numbers(text, docs)
        if missing:
            status, note = "unsupported", f"Numbers not found in sources: {', '.join(missing)}"
    return Claim(text=text, evidence=evidence if status != "unsupported" else [], status=status, note=note)


def unsupported_numbers(text: str, docs: list[SourceDocument]) -> list[str]:
    """Flag invented metrics: any number in generated text that never appears in the sources."""
    corpus = " ".join(d.content for d in docs)
    return sorted({m.group().strip() for m in _NUM.finditer(text)
                   if len(m.group().strip()) > 1 and m.group().strip() not in corpus})


def verify_claims(claims: list[str], retriever: Retriever, docs: list[SourceDocument] | None = None) -> list[Claim]:
    return [verify_claim(c, retriever, docs) for c in claims if c.strip()]

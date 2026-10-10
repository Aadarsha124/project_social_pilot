from core.evidence import unsupported_numbers, verify_claim
from core.rag.retriever import Retriever
from core.schemas import SourceDocument

DOC = SourceDocument(source_id="s1", path="README.md",
                     content="# API\nThe project exposes image classification through a FastAPI endpoint.")


def test_supported_claim_has_evidence():
    c = verify_claim("The project exposes image classification through a FastAPI endpoint.", Retriever([DOC], False), [DOC])
    assert c.status == "supported" and c.evidence


def test_unrelated_claim_unsupported():
    c = verify_claim("Handles Kubernetes autoscaling across regions.", Retriever([DOC], False), [DOC])
    assert c.status == "unsupported"


def test_invented_metric_flagged():
    assert "50 ms" in unsupported_numbers("Inference takes 50 ms.", [DOC])
    c = verify_claim("FastAPI endpoint with 50 ms latency", Retriever([DOC], False), [DOC])
    assert c.status == "unsupported" and "50" in (c.note or "")

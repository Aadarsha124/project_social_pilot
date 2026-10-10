from typing import Literal
from pydantic import BaseModel, Field


class SourceDocument(BaseModel):
    source_id: str
    path: str
    content: str
    source_url: str | None = None
    commit_sha: str | None = None


class Chunk(BaseModel):
    chunk_id: str
    source_id: str
    path: str
    text: str
    start_line: int
    end_line: int
    heading: str | None = None
    source_url: str | None = None


class ProjectProfile(BaseModel):
    name: str
    summary: str
    problem: str = ""
    target_users: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    architecture: list[str] = Field(default_factory=list)
    engineering_decisions: list[str] = Field(default_factory=list)
    challenges: list[str] = Field(default_factory=list)
    results: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)


class EvidenceReference(BaseModel):
    source_id: str
    path: str
    start_line: int | None = None
    end_line: int | None = None
    source_url: str | None = None
    excerpt: str


ClaimStatus = Literal["supported", "needs_review", "unsupported"]


class Claim(BaseModel):
    text: str
    evidence: list[EvidenceReference] = Field(default_factory=list)
    status: ClaimStatus = "needs_review"
    note: str | None = None


Angle = Literal["technical_lesson", "engineering_decision", "personal_reflection"]


class LinkedInDraft(BaseModel):
    angle: Angle
    hook: str
    insight: str
    body: str
    takeaway: str
    question: str | None = None
    needs_user_input: str | None = None  # e.g. personal reflection missing context
    claims: list[str] = Field(default_factory=list)  # raw claim texts from the LLM
    verified_claims: list[Claim] = Field(default_factory=list)  # filled by evidence.py


class CaseStudy(BaseModel):
    title: str
    summary: str
    problem: str
    architecture: str
    implementation: str
    challenges: str
    results: str
    limitations: str
    future_work: str
    claims: list[str] = Field(default_factory=list)
    verified_claims: list[Claim] = Field(default_factory=list)

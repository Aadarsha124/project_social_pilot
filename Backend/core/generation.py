import json

from core.analysis import load_prompt
from core.evidence import verify_claims
from core.llm import complete_json
from core.rag.retriever import Retriever
from core.schemas import Angle, CaseStudy, LinkedInDraft, ProjectProfile, SourceDocument

ANGLES: dict[str, tuple[str, str]] = {
    "technical_lesson": ("technical lesson: how something works or an insight learned", "how it works architecture implementation"),
    "engineering_decision": ("engineering decision: a documented design choice, alternatives and trade-offs", "design decision trade-off why chose instead"),
    "personal_reflection": ("personal reflection: what the developer learned or struggled with (needs USER CONTEXT)", "challenges limitations lessons"),
}

CASE_SECTIONS = ["summary", "problem", "architecture", "implementation", "challenges", "results", "limitations", "future_work"]


def generate_linkedin_draft(profile: ProjectProfile, retriever: Retriever, docs: list[SourceDocument],
                            angle: Angle, user_context: str = "") -> LinkedInDraft:
    desc, query = ANGLES[angle]
    prompt = load_prompt("linkedin_posts").substitute(
        angle=angle, angle_description=desc, profile=profile.model_dump_json(indent=2),
        context=retriever.context_for(query), user_context=user_context or "(none)",
    )
    draft = complete_json(prompt, LinkedInDraft)
    draft.angle = angle
    draft.verified_claims = verify_claims(draft.claims, retriever, docs)
    return draft


def generate_all_drafts(profile, retriever, docs, user_context: str = "") -> dict[str, LinkedInDraft | str]:
    """One failure must not discard the others: errors come back as strings."""
    out: dict[str, LinkedInDraft | str] = {}
    for angle in ANGLES:
        try:
            out[angle] = generate_linkedin_draft(profile, retriever, docs, angle, user_context)  # type: ignore[arg-type]
        except Exception as e:  # noqa: BLE001
            out[angle] = f"error: {e}"
    return out


def generate_case_study(profile: ProjectProfile, retriever: Retriever, docs: list[SourceDocument],
                        user_context: str = "") -> CaseStudy:
    prompt = load_prompt("case_study").substitute(
        profile=profile.model_dump_json(indent=2), context=retriever.context_for("architecture implementation results limitations", k=8),
        user_context=user_context or "(none)", section_rule="",
    )
    cs = complete_json(prompt, CaseStudy)
    cs.verified_claims = verify_claims(cs.claims, retriever, docs)
    return cs


def regenerate_section(cs: CaseStudy, section: str, profile: ProjectProfile, retriever: Retriever,
                       docs: list[SourceDocument], user_context: str = "") -> CaseStudy:
    if section not in CASE_SECTIONS:
        raise ValueError(f"Unknown section: {section}")
    fresh = generate_case_study(profile, retriever, docs, user_context)
    data = json.loads(cs.model_dump_json())
    data[section] = getattr(fresh, section)
    return CaseStudy.model_validate(data)

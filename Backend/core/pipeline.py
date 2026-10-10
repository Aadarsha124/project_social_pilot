"""Service layer: the only thing a frontend or API needs to call."""
from core import analysis, generation, ingestion, storage
from core.rag.retriever import Retriever
from core.schemas import CaseStudy, ProjectProfile, SourceDocument


def import_project(repo_url: str | None = None, pasted_readme: str | None = None) -> str:
    if repo_url:
        docs = ingestion.from_github(repo_url)
    elif pasted_readme:
        docs = ingestion.from_pasted_markdown(pasted_readme)
    else:
        raise ingestion.IngestionError("Provide a GitHub URL or a pasted README.")
    name = repo_url.rstrip("/").split("/")[-1] if repo_url else "Pasted project"
    return storage.create_project(name, repo_url, docs[0].commit_sha, [d.model_dump() for d in docs])


def _load(project_id: str) -> tuple[dict, list[SourceDocument], Retriever]:
    p = storage.get_project(project_id)
    if not p:
        raise KeyError("Project not found")
    docs = [SourceDocument(**d) for d in p["documents"]]
    return p, docs, Retriever(docs)


def run_analysis(project_id: str) -> ProjectProfile:
    _, docs, retriever = _load(project_id)
    profile = analysis.analyze_project(docs, retriever)
    storage.save_profile(project_id, profile.model_dump())
    return profile


def run_linkedin(project_id: str, angle: str, user_context: str = ""):
    p, docs, retriever = _load(project_id)
    profile = ProjectProfile(**p["profile"])
    draft = generation.generate_linkedin_draft(profile, retriever, docs, angle, user_context)  # type: ignore[arg-type]
    storage.save_artifact(project_id, f"linkedin:{angle}", draft.model_dump())
    return draft


def run_case_study(project_id: str, user_context: str = "") -> CaseStudy:
    p, docs, retriever = _load(project_id)
    cs = generation.generate_case_study(ProjectProfile(**p["profile"]), retriever, docs, user_context)
    storage.save_artifact(project_id, "case_study", cs.model_dump())
    return cs

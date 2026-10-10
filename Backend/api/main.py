"""Thin HTTP layer so any frontend (Streamlit, React, .NET) can use the same backend.
Run: uvicorn api.main:app --reload"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from core import export, generation, pipeline, storage
from core.ingestion import IngestionError
from core.llm import LLMError
from core.schemas import CaseStudy

app = FastAPI(title="SocialPilot AI", version="0.1.0")


class ImportReq(BaseModel):
    repo_url: str | None = None
    pasted_readme: str | None = None


class GenReq(BaseModel):
    user_context: str = ""


def _guard(fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except IngestionError as e:
        raise HTTPException(422, str(e))
    except LLMError as e:
        raise HTTPException(502, str(e))
    except KeyError as e:
        raise HTTPException(404, str(e))
    except export.ExportError as e:
        raise HTTPException(503, str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/projects")
def projects():
    return storage.list_projects()


@app.post("/projects/import")
def import_project(req: ImportReq):
    return {"project_id": _guard(pipeline.import_project, req.repo_url, req.pasted_readme)}


@app.get("/projects/{pid}")
def get_project(pid: str):
    p = storage.get_project(pid)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@app.post("/projects/{pid}/analyze")
def analyze(pid: str):
    return _guard(pipeline.run_analysis, pid)


@app.post("/projects/{pid}/linkedin/{angle}")
def linkedin(pid: str, angle: str, req: GenReq):
    if angle not in generation.ANGLES:
        raise HTTPException(400, f"angle must be one of {list(generation.ANGLES)}")
    return _guard(pipeline.run_linkedin, pid, angle, req.user_context)


@app.post("/projects/{pid}/case-study")
def case_study(pid: str, req: GenReq):
    return _guard(pipeline.run_case_study, pid, req.user_context)


@app.put("/projects/{pid}/artifacts/{artifact_type}")
def save_edit(pid: str, artifact_type: str, content: dict):
    storage.save_artifact(pid, artifact_type, content, edited=True)
    return {"saved": True}


@app.post("/export/pdf")
def pdf(cs: CaseStudy, repo_url: str | None = None):
    data = _guard(export.export_pdf, cs, repo_url)
    return Response(data, media_type="application/pdf")


@app.post("/export/markdown")
def markdown(cs: CaseStudy, repo_url: str | None = None):
    return Response(export.case_study_to_markdown(cs, repo_url), media_type="text/markdown")

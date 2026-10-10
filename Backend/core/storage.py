import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects(
  project_id TEXT PRIMARY KEY, name TEXT, repository_url TEXT, commit_sha TEXT,
  profile_json TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS source_documents(
  project_id TEXT, source_id TEXT, path TEXT, content TEXT, source_url TEXT, commit_sha TEXT,
  PRIMARY KEY(project_id, source_id));
CREATE TABLE IF NOT EXISTS artifacts(
  artifact_id TEXT PRIMARY KEY, project_id TEXT, artifact_type TEXT,
  generated_json TEXT, edited_json TEXT, created_at TEXT, updated_at TEXT,
  UNIQUE(project_id, artifact_type));
"""


@contextmanager
def conn(db_path: str | None = None):
    path = db_path or settings.db_path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(path)
    c.row_factory = sqlite3.Row
    c.executescript(SCHEMA)
    try:
        yield c
        c.commit()
    finally:
        c.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_project(name: str, repository_url: str | None, commit_sha: str | None,
                   docs: list[dict], db_path: str | None = None) -> str:
    pid = uuid.uuid4().hex
    with conn(db_path) as c:
        c.execute("INSERT INTO projects VALUES(?,?,?,?,?,?)", (pid, name, repository_url, commit_sha, None, _now()))
        c.executemany(
            "INSERT INTO source_documents VALUES(?,?,?,?,?,?)",
            [(pid, d["source_id"], d["path"], d["content"], d.get("source_url"), d.get("commit_sha")) for d in docs],
        )
    return pid


def save_profile(project_id: str, profile: dict, db_path: str | None = None) -> None:
    with conn(db_path) as c:
        c.execute("UPDATE projects SET profile_json=?, name=? WHERE project_id=?",
                  (json.dumps(profile), profile.get("name"), project_id))


def get_project(project_id: str, db_path: str | None = None) -> dict | None:
    with conn(db_path) as c:
        p = c.execute("SELECT * FROM projects WHERE project_id=?", (project_id,)).fetchone()
        if not p:
            return None
        docs = c.execute("SELECT source_id,path,content,source_url,commit_sha FROM source_documents WHERE project_id=?",
                         (project_id,)).fetchall()
        arts = c.execute("SELECT * FROM artifacts WHERE project_id=?", (project_id,)).fetchall()
    out = dict(p)
    out["profile"] = json.loads(p["profile_json"]) if p["profile_json"] else None
    out["documents"] = [dict(d) for d in docs]
    out["artifacts"] = {a["artifact_type"]: {
        "generated": json.loads(a["generated_json"]),
        "edited": json.loads(a["edited_json"]) if a["edited_json"] else None,
        "updated_at": a["updated_at"]} for a in arts}
    return out


def list_projects(db_path: str | None = None) -> list[dict]:
    with conn(db_path) as c:
        return [dict(r) for r in c.execute(
            "SELECT project_id,name,repository_url,created_at FROM projects ORDER BY created_at DESC")]


def save_artifact(project_id: str, artifact_type: str, content: dict, edited: bool = False,
                  db_path: str | None = None) -> None:
    """Generated and edited versions are kept separately so users can revert."""
    now, blob = _now(), json.dumps(content)
    with conn(db_path) as c:
        row = c.execute("SELECT artifact_id FROM artifacts WHERE project_id=? AND artifact_type=?",
                        (project_id, artifact_type)).fetchone()
        if row and edited:
            c.execute("UPDATE artifacts SET edited_json=?, updated_at=? WHERE artifact_id=?", (blob, now, row["artifact_id"]))
        elif row:
            c.execute("UPDATE artifacts SET generated_json=?, edited_json=NULL, updated_at=? WHERE artifact_id=?",
                      (blob, now, row["artifact_id"]))
        else:
            c.execute("INSERT INTO artifacts VALUES(?,?,?,?,?,?,?)",
                      (uuid.uuid4().hex, project_id, artifact_type, blob, blob if edited else None, now, now))

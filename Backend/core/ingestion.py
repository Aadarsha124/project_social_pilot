"""Import a public GitHub repo (REST + raw files) or pasted Markdown into SourceDocuments.
Repository content is untrusted data: never executed, never treated as instructions."""
import hashlib
import re
from urllib.parse import urlparse

import httpx

from config import settings
from core.schemas import SourceDocument


class IngestionError(ValueError):
    pass


_GH_RE = re.compile(r"^/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$")

ALLOW_NAMES = {
    "readme.md", "readme.rst", "readme.txt", "pyproject.toml", "requirements.txt",
    "package.json", "dockerfile", "docker-compose.yml", "architecture.md", "contributing.md",
}
ALLOW_EXT = {".md", ".py", ".ts", ".js", ".cs", ".csproj", ".go", ".rs", ".java", ".toml", ".yml", ".yaml"}
BLOCK_PARTS = {"node_modules", "dist", "build", ".git", "venv", ".venv", "__pycache__", "vendor", "bin", "obj"}
SECRET_PAT = re.compile(r"(\.env|id_rsa|\.pem$|\.key$|secrets?\.|credentials)", re.I)


def parse_github_url(url: str) -> tuple[str, str]:
    p = urlparse(url.strip())
    if p.scheme not in ("http", "https") or p.netloc.lower() not in ("github.com", "www.github.com"):
        raise IngestionError("Only public github.com repository URLs are supported.")
    m = _GH_RE.match(p.path)
    if not m:
        raise IngestionError("URL must look like https://github.com/<owner>/<repo>.")
    return m.group(1), m.group(2)


def _sid(path: str) -> str:
    return hashlib.sha1(path.encode()).hexdigest()[:10]


def from_pasted_markdown(text: str, path: str = "pasted/README.md") -> list[SourceDocument]:
    if not text.strip():
        raise IngestionError("Pasted README is empty.")
    return [SourceDocument(source_id=_sid(path), path=path, content=text[: settings.max_file_bytes])]


def is_candidate(path: str, size: int) -> bool:
    parts = set(path.lower().split("/"))
    if parts & BLOCK_PARTS or SECRET_PAT.search(path) or size > settings.max_file_bytes:
        return False
    name = path.rsplit("/", 1)[-1].lower()
    ext = "." + name.rsplit(".", 1)[-1] if "." in name else ""
    return name in ALLOW_NAMES or ext in ALLOW_EXT


def _score(path: str) -> int:
    """Lower is better: READMEs/manifests first, shallow paths before deep ones, tests last."""
    name = path.rsplit("/", 1)[-1].lower()
    s = path.count("/") * 2
    if name in ALLOW_NAMES:
        s -= 10
    if "test" in path.lower():
        s += 5
    return s


def _headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "User-Agent": "socialpilot-ai"}
    if settings.github_token:
        h["Authorization"] = f"Bearer {settings.github_token}"
    return h


def from_github(url: str, client: httpx.Client | None = None) -> list[SourceDocument]:
    owner, repo = parse_github_url(url)
    own = client is None
    client = client or httpx.Client(timeout=settings.http_timeout_s, headers=_headers())
    try:
        commit = client.get(f"https://api.github.com/repos/{owner}/{repo}/commits/HEAD")
        _check(commit)
        sha = commit.json()["sha"]
        tree = client.get(f"https://api.github.com/repos/{owner}/{repo}/git/trees/{sha}?recursive=1")
        _check(tree)
        entries = [
            e for e in tree.json().get("tree", [])
            if e["type"] == "blob" and is_candidate(e["path"], e.get("size", 0))
        ]
        entries.sort(key=lambda e: _score(e["path"]))
        docs: list[SourceDocument] = []
        total = 0
        for e in entries[: settings.max_files]:
            if total + e.get("size", 0) > settings.max_total_bytes:
                break
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{sha}/{e['path']}"
            r = client.get(raw_url)
            if r.status_code != 200:
                continue
            text = r.text
            total += len(text.encode())
            docs.append(SourceDocument(
                source_id=_sid(e["path"]), path=e["path"], content=text,
                source_url=f"https://github.com/{owner}/{repo}/blob/{sha}/{e['path']}", commit_sha=sha,
            ))
        if not docs:
            raise IngestionError("No usable files found. Paste the README instead.")
        return docs
    except httpx.TimeoutException as e:
        raise IngestionError("GitHub request timed out. Try again or paste the README.") from e
    except httpx.HTTPError as e:
        raise IngestionError(f"Could not reach GitHub: {e}") from e
    finally:
        if own:
            client.close()


def _check(r: httpx.Response) -> None:
    if r.status_code == 404:
        raise IngestionError("Repository not found or not public.")
    if r.status_code in (403, 429):
        raise IngestionError("GitHub rate limit hit. Set GITHUB_TOKEN or paste the README.")
    r.raise_for_status()

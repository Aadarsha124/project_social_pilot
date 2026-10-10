import pytest
from core.ingestion import IngestionError, from_pasted_markdown, is_candidate, parse_github_url


def test_parse_valid():
    assert parse_github_url("https://github.com/foo/bar") == ("foo", "bar")
    assert parse_github_url("https://github.com/foo/bar.git/") == ("foo", "bar")


@pytest.mark.parametrize("u", ["https://evil.com/foo/bar", "ftp://github.com/a/b", "https://github.com/onlyowner", "nonsense"])
def test_parse_invalid(u):
    with pytest.raises(IngestionError):
        parse_github_url(u)


def test_secret_and_build_files_excluded():
    assert not is_candidate(".env", 10)
    assert not is_candidate("config/id_rsa", 10)
    assert not is_candidate("node_modules/x/index.js", 10)
    assert not is_candidate("big.py", 10**9)
    assert is_candidate("README.md", 100)


def test_paste_fallback():
    docs = from_pasted_markdown("# Hi")
    assert docs[0].path == "pasted/README.md"
    with pytest.raises(IngestionError):
        from_pasted_markdown("  ")

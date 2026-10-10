from core import storage


def test_persistence_and_edit_separation(tmp_path):
    db = str(tmp_path / "t.db")
    pid = storage.create_project("P", None, None, [{"source_id": "1", "path": "README.md", "content": "x"}], db)
    storage.save_artifact(pid, "case_study", {"v": 1}, db_path=db)
    storage.save_artifact(pid, "case_study", {"v": 2}, edited=True, db_path=db)
    art = storage.get_project(pid, db)["artifacts"]["case_study"]
    assert art["generated"] == {"v": 1} and art["edited"] == {"v": 2}
    assert storage.list_projects(db)[0]["project_id"] == pid

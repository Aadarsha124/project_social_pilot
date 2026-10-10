# SocialPilot AI frontend

React + TypeScript + Vite interface for the SocialPilot project-to-content workflow.

## Run locally

Start the FastAPI backend from `Backend/` first:

```bash
uvicorn api.main:app --reload
```

Then start the frontend from this directory:

```bash
npm install
npm run dev
```

Vite proxies `/projects`, `/export`, and `/health` to `http://localhost:8000`. To use a different backend URL in the frontend, set `VITE_API_URL` in the frontend environment.

## Workflow

1. Import a public GitHub repository or paste a README.
2. Analyze the indexed sources to create a project profile.
3. Generate and edit LinkedIn drafts or a project case study.
4. Review claim evidence, save edits, and export a case study as Markdown or PDF.

The UI uses the endpoints documented by the FastAPI app in `Backend/api/main.py`.

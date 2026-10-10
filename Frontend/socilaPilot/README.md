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

## Source layout

- `src/App.tsx` coordinates the workspace state and connects pages to API actions.
- `src/pages/` contains the Overview, Content Studio, Case Study, and Sources screens.
- `src/components/` contains shared layout, import dialog, headings, and evidence UI.
- `src/services/api.ts` contains backend requests and export/download helpers.
- `src/types.ts` defines the shared API and UI types.
- `src/App.css` and `src/index.css` contain the application and global styles.

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'

type ProjectSummary = {
  project_id: string
  name: string
  repository_url: string | null
  created_at: string
}

type EvidenceClaim = {
  text: string
  status: 'supported' | 'needs_review' | 'unsupported'
  note?: string | null
  evidence?: { path: string; start_line?: number | null; end_line?: number | null }[]
}

type Draft = {
  angle: string
  hook: string
  insight: string
  body: string
  takeaway: string
  question?: string | null
  needs_user_input?: string | null
  verified_claims?: EvidenceClaim[]
}

type CaseStudy = {
  title: string
  summary: string
  problem: string
  architecture: string
  implementation: string
  challenges: string
  results: string
  limitations: string
  future_work: string
  verified_claims?: EvidenceClaim[]
}

type ProjectDetail = ProjectSummary & {
  profile: {
    name: string
    summary: string
    problem?: string
    technologies?: string[]
    architecture?: string[]
    challenges?: string[]
    results?: string[]
    unknowns?: string[]
  } | null
  documents: { source_id: string; path: string; content: string }[]
  artifacts: Record<string, { generated: Draft | CaseStudy; edited: Draft | CaseStudy | null }>
}

type Page = 'Overview' | 'Content studio' | 'Case studies' | 'Sources'
type Angle = 'technical_lesson' | 'engineering_decision' | 'personal_reflection'

const angles: { id: Angle; title: string; description: string; icon: string }[] = [
  { id: 'technical_lesson', title: 'Technical lesson', description: 'Explain how it works and what you learned.', icon: '↗' },
  { id: 'engineering_decision', title: 'Engineering decision', description: 'Share a design choice and its trade-offs.', icon: '⌘' },
  { id: 'personal_reflection', title: 'Personal reflection', description: 'Tell the story behind the work.', icon: '✳' },
]

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function Icon({ children }: { children: ReactNode }) {
  return <span className="nav-icon" aria-hidden="true">{children}</span>
}

function App() {
  const [page, setPage] = useState<Page>('Overview')
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [projectId, setProjectId] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [readme, setReadme] = useState('')
  const [importMode, setImportMode] = useState<'github' | 'readme'>('github')
  const [selectedAngle, setSelectedAngle] = useState<Angle>('technical_lesson')
  const [userContext, setUserContext] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refreshProjects = async () => {
    const result = await api<ProjectSummary[]>('/projects')
    setProjects(result)
    if (!projectId && result.length) setProjectId(result[0].project_id)
  }

  useEffect(() => {
    api<ProjectSummary[]>('/projects')
      .then((result) => {
        setProjects(result)
        if (result.length) setProjectId((current) => current || result[0].project_id)
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not connect to SocialPilot API.'))
  }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    api<ProjectDetail>(`/projects/${projectId}`)
      .then((result) => {
        if (cancelled) return
        setProject(result)
        setDraft(null)
        setCaseStudy(null)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load project.')
      })
    return () => { cancelled = true }
  }, [projectId])

  const currentArtifact = useMemo(() => {
    if (!project) return null
    return project.artifacts[`linkedin:${selectedAngle}`]?.edited
      ?? project.artifacts[`linkedin:${selectedAngle}`]?.generated
  }, [project, selectedAngle])

  const run = async <T,>(label: string, task: () => Promise<T>, done: (result: T) => void) => {
    setLoading(label)
    setError('')
    setNotice('')
    try {
      const result = await task()
      done(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading('')
    }
  }

  const importProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = importMode === 'github' ? { repo_url: repoUrl } : { pasted_readme: readme }
    await run('Importing project', async () => {
      const result = await api<{ project_id: string }>('/projects/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await refreshProjects()
      return result
    }, ({ project_id }) => {
      setProjectId(project_id)
      setShowImport(false)
      setRepoUrl('')
      setReadme('')
      setNotice('Project imported. Analyze it to build your project profile.')
      setPage('Overview')
    })
  }

  const analyzeProject = async () => {
    if (!project) return
    await run('Analyzing sources', () => api<ProjectDetail['profile']>(`/projects/${project.project_id}/analyze`, { method: 'POST' }), (profile) => {
      setProject({ ...project, profile })
      setNotice('Project analysis complete. Your source-backed profile is ready.')
    })
  }

  const generateDraft = async () => {
    if (!project) return
    await run('Writing draft', () => api<Draft>(`/projects/${project.project_id}/linkedin/${selectedAngle}`, {
      method: 'POST',
      body: JSON.stringify({ user_context: userContext }),
    }), (result) => {
      setDraft(result)
      setNotice('Draft generated with evidence checks.')
    })
  }

  const generateCaseStudy = async () => {
    if (!project) return
    await run('Creating case study', () => api<CaseStudy>(`/projects/${project.project_id}/case-study`, {
      method: 'POST',
      body: JSON.stringify({ user_context: userContext }),
    }), (result) => {
      setCaseStudy(result)
      setNotice('Case study generated. Review claims before sharing.')
    })
  }

  const saveArtifact = async (type: string, content: Draft | CaseStudy) => {
    if (!project) return
    await run('Saving changes', async () => {
      await api(`/projects/${project.project_id}/artifacts/${type}`, {
        method: 'PUT',
        body: JSON.stringify(content),
      })
      return true
    }, () => {
      setNotice('Your edits have been saved.')
      if (type === 'case_study') setCaseStudy(content as CaseStudy)
      else setDraft(content as Draft)
    })
  }

  const exportCaseStudy = async (format: 'markdown' | 'pdf') => {
    if (!caseStudy || !project) return
    const route = format === 'pdf' ? '/export/pdf' : '/export/markdown'
    await run(`Preparing ${format.toUpperCase()}`, async () => {
      const response = await fetch(`${API_BASE}${route}?repo_url=${encodeURIComponent(project.repository_url ?? '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseStudy),
      })
      if (!response.ok) throw new Error(await response.text() || `Export failed (${response.status})`)
      return response.blob()
    }, (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${caseStudy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format === 'pdf' ? 'pdf' : 'md'}`
      link.click()
      URL.revokeObjectURL(url)
      setNotice(`${format === 'pdf' ? 'PDF' : 'Markdown'} exported.`)
    })
  }

  const setPageAndClear = (next: Page) => {
    setPage(next)
    setError('')
    setNotice('')
  }

  const activeDraft = draft ?? (currentArtifact as Draft | null)
  const allClaims = activeDraft?.verified_claims ?? caseStudy?.verified_claims ?? []

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPageAndClear('Overview') }}>
          <span className="brand-mark"><span>SP</span></span>
          <span className="brand-name">social<span>pilot</span><small>AI CONTENT STUDIO</small></span>
        </a>

        <button className="new-project" onClick={() => setShowImport(true)}>
          <span>＋</span> New project
        </button>

        <div className="side-label">WORKSPACE</div>
        <nav className="navigation">
          {([
            ['Overview', '⌂'],
            ['Content studio', '✦'],
            ['Case studies', '▤'],
            ['Sources', '◫'],
          ] as [Page, string][]).map(([label, icon]) => (
            <button key={label} className={`nav-link ${page === label ? 'active' : ''}`} onClick={() => setPageAndClear(label)}>
              <Icon>{icon}</Icon>{label}
              {label === 'Sources' && project && <span className="nav-count">{project.documents?.length ?? 0}</span>}
            </button>
          ))}
        </nav>

        <div className="side-label project-label">YOUR PROJECTS</div>
        {projects.length ? (
          <div className="project-list">
            {projects.slice(0, 5).map((item) => (
              <button key={item.project_id} className={`project-link ${item.project_id === projectId ? 'selected' : ''}`} onClick={() => setProjectId(item.project_id)}>
                <span className="project-dot" />{item.name}
              </button>
            ))}
          </div>
        ) : <p className="sidebar-empty">Your projects will show up here.</p>}

        <div className="sidebar-bottom">
          <div className="api-status"><span className={`status-dot ${error ? 'offline' : ''}`} /> API connection <span>{error ? 'Offline' : 'Ready'}</span></div>
          <div className="profile-chip"><div className="avatar">SP</div><div><strong>SocialPilot</strong><small>Personal workspace</small></div><span className="more">···</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{page}</strong>{project && <><b>/</b><span>{project.name}</span></>}</div>
          <div className="top-actions">
            {projects.length > 0 && <label className="project-select-wrap">
              <span className="sr-only">Select project</span>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {projects.map((item) => <option key={item.project_id} value={item.project_id}>{item.name}</option>)}
              </select>
            </label>}
            <span className="top-avatar">S</span>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="feedback error-feedback"><span>!</span><div><strong>Something needs attention</strong><p>{error.replace(/^"|"$/g, '')}</p></div><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
          {notice && <div className="feedback success-feedback"><span>✓</span><p>{notice}</p><button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

          {!project ? (
            <OverviewEmpty onImport={() => setShowImport(true)} page={page} loading={loading} />
          ) : page === 'Overview' ? (
            <Overview project={project} loading={loading} onAnalyze={analyzeProject} onOpenStudio={() => setPage('Content studio')} onOpenCase={() => setPage('Case studies')} onImport={() => setShowImport(true)} />
          ) : page === 'Content studio' ? (
            <ContentStudio
              key={`${project.project_id}:${selectedAngle}:${activeDraft?.hook ?? 'new'}`}
              project={project}
              angle={selectedAngle}
              onAngle={setSelectedAngle}
              userContext={userContext}
              onContext={setUserContext}
              draft={activeDraft}
              loading={loading}
              onGenerate={generateDraft}
              onSave={(content) => saveArtifact(`linkedin:${selectedAngle}`, content)}
              claims={allClaims}
            />
          ) : page === 'Case studies' ? (
            <CaseStudyPage
              key={`${project.project_id}:${(caseStudy ?? (project.artifacts.case_study?.edited as CaseStudy | null) ?? (project.artifacts.case_study?.generated as CaseStudy | null))?.title ?? 'new'}`}
              project={project}
              content={caseStudy ?? (project.artifacts.case_study?.edited as CaseStudy | null) ?? (project.artifacts.case_study?.generated as CaseStudy | null)}
              loading={loading}
              userContext={userContext}
              onContext={setUserContext}
              onGenerate={generateCaseStudy}
              onSave={(content) => saveArtifact('case_study', content)}
              onExport={exportCaseStudy}
            />
          ) : (
            <SourcesPage project={project} onAnalyze={analyzeProject} loading={loading} />
          )}
        </div>
      </main>

      {showImport && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowImport(false) }}>
          <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <button className="modal-close" onClick={() => setShowImport(false)} aria-label="Close">×</button>
            <div className="modal-eyebrow">START WITH YOUR PROJECT</div>
            <h2 id="import-title">Bring your work into focus.</h2>
            <p className="modal-description">SocialPilot reads your project sources to create accurate, evidence-backed content.</p>
            <div className="import-tabs">
              <button className={importMode === 'github' ? 'selected' : ''} onClick={() => setImportMode('github')}>GitHub repository</button>
              <button className={importMode === 'readme' ? 'selected' : ''} onClick={() => setImportMode('readme')}>Paste a README</button>
            </div>
            <form onSubmit={importProject}>
              {importMode === 'github' ? (
                <label className="field-label">Repository URL
                  <input autoFocus type="url" placeholder="https://github.com/you/your-project" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} required />
                  <small>Public GitHub repositories are supported.</small>
                </label>
              ) : (
                <label className="field-label">README content
                  <textarea autoFocus rows={7} placeholder="# My project&#10;Describe what you built..." value={readme} onChange={(event) => setReadme(event.target.value)} required />
                </label>
              )}
              <button className="button button-primary modal-submit" type="submit" disabled={Boolean(loading)}>
                {loading === 'Importing project' ? <><span className="spinner" /> Importing…</> : <>Import project <span>→</span></>}
              </button>
            </form>
            <div className="privacy-note"><span>◇</span> Your content is only used to generate drafts for your workspace.</div>
          </section>
        </div>
      )}
    </div>
  )
}

function OverviewEmpty({ onImport, page, loading }: { onImport: () => void; page: Page; loading: string }) {
  return (
    <div className="welcome-view">
      <div className="welcome-copy">
        <div className="eyebrow"><span className="sparkle">✳</span> YOUR WORK, WELL TOLD</div>
        <h1>Turn what you<br />built into <em>your story.</em></h1>
        <p>SocialPilot helps developers turn real project work into thoughtful LinkedIn content and polished case studies — grounded in your code and sources.</p>
        <button className="button button-primary" onClick={onImport} disabled={Boolean(loading)}>Import your first project <span>→</span></button>
        <div className="trust-note"><span>✳</span> Evidence-first, always. Your content stays yours.</div>
      </div>
      <div className="welcome-visual">
        <div className="visual-glow" />
        <div className="floating-card source-card"><span className="mini-icon violet">⌘</span><div><strong>Your project</strong><small>README · source code</small></div><span className="check-mark">✓</span></div>
        <div className="visual-connector">·····················</div>
        <div className="floating-card insight-card"><span className="mini-icon amber">✦</span><div><strong>Real insights</strong><small>Analyzed with your sources</small></div><span className="check-mark">✓</span></div>
        <div className="visual-connector second">·····················</div>
        <div className="floating-card draft-card"><span className="mini-icon pink">↗</span><div><strong>Your next great post</strong><small>LinkedIn draft · claims checked</small></div><span className="draft-lines"><i /><i /><i /></span></div>
        <div className="visual-caption">FROM REPOSITORY TO READY-TO-SHARE</div>
      </div>
      <div className="welcome-features">
        <div><span className="feature-icon">⌘</span><strong>Know your project</strong><p>Build a profile from your README and source material.</p></div>
        <div><span className="feature-icon">✦</span><strong>Find your angle</strong><p>Create three distinct, developer-friendly LinkedIn drafts.</p></div>
        <div><span className="feature-icon">✓</span><strong>Back it with proof</strong><p>See which claims are supported by your project evidence.</p></div>
      </div>
      {page !== 'Overview' && <div className="empty-page-hint">{page} is ready when you import a project.</div>}
    </div>
  )
}

function Overview({ project, loading, onAnalyze, onOpenStudio, onOpenCase, onImport }: {
  project: ProjectDetail; loading: string; onAnalyze: () => void; onOpenStudio: () => void; onOpenCase: () => void; onImport: () => void
}) {
  const profile = project.profile
  const artifactCount = Object.keys(project.artifacts ?? {}).length
  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div><div className="eyebrow">PROJECT WORKSPACE</div><h1>{profile?.name || project.name}<span className="heading-spark">✳</span></h1><p>{profile?.summary || 'Your project is connected. Analyze its sources to uncover the story behind the build.'}</p></div>
        <div className="heading-buttons">
          <button className="button button-secondary" onClick={onImport}>＋ Add project</button>
          <button className="button button-primary" onClick={onAnalyze} disabled={Boolean(loading)}>{loading === 'Analyzing sources' ? <><span className="spinner" /> Analyzing…</> : <>{profile ? 'Refresh analysis' : 'Analyze project'} <span>→</span></>}</button>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card"><span className="stat-label">PROJECT SOURCES</span><strong>{project.documents?.length ?? 0}</strong><small>files indexed</small><span className="stat-decoration lilac">◫</span></div>
        <div className="stat-card"><span className="stat-label">CONTENT DRAFTS</span><strong>{artifactCount}</strong><small>{artifactCount === 1 ? 'artifact created' : 'artifacts created'}</small><span className="stat-decoration peach">✦</span></div>
        <div className="stat-card"><span className="stat-label">PROFILE STATUS</span><strong className="status-text">{profile ? 'Ready' : 'Not analyzed'}</strong><small>{profile ? 'Your project story is mapped' : 'Run analysis to get started'}</small><span className="stat-decoration mint">✓</span></div>
      </div>
      <div className="dashboard-grid">
        <section className="panel project-panel">
          <div className="panel-heading"><div><span className="panel-kicker">PROJECT SNAPSHOT</span><h2>A clearer view of your work</h2></div><span className="panel-symbol">✳</span></div>
          {profile ? (
            <div className="snapshot-content">
              <div className="snapshot-block"><span>THE PROBLEM</span><p>{profile.problem || 'No problem statement found yet.'}</p></div>
              <div className="snapshot-block"><span>TECHNOLOGIES</span><div className="tag-list">{profile.technologies?.length ? profile.technologies.map((tech) => <span className="tag" key={tech}>{tech}</span>) : <small>Not identified yet</small>}</div></div>
              <div className="snapshot-block"><span>ARCHITECTURE</span><p>{profile.architecture?.slice(0, 3).join(' · ') || 'Explore your architecture in the project profile.'}</p></div>
            </div>
          ) : (
            <div className="analyze-callout"><div className="callout-art"><span>⌘</span><i>✦</i></div><div><strong>Let’s get to know your project</strong><p>Analyze your repository to surface its purpose, technology, architecture, and engineering decisions.</p><button className="text-button" onClick={onAnalyze} disabled={Boolean(loading)}>Analyze project <span>→</span></button></div></div>
          )}
          <div className="panel-footer"><span>◫</span> {project.repository_url || 'README imported'} <a href={project.repository_url || undefined} target="_blank" rel="noreferrer">{project.repository_url ? 'View repository ↗' : ''}</a></div>
        </section>
        <section className="panel next-panel">
          <div className="panel-heading"><div><span className="panel-kicker">MAKE SOMETHING OF IT</span><h2>What will you create?</h2></div></div>
          <button className="action-tile" onClick={onOpenStudio}><span className="action-icon lilac">↗</span><span><strong>LinkedIn content</strong><small>Turn a technical insight into a post</small></span><b>→</b></button>
          <button className="action-tile" onClick={onOpenCase}><span className="action-icon peach">▤</span><span><strong>Project case study</strong><small>Tell the full story, from problem to impact</small></span><b>→</b></button>
          <div className="evidence-tip"><span>✳</span><p><strong>Built on evidence</strong><br />Every draft is checked against your project sources.</p></div>
        </section>
      </div>
    </div>
  )
}

function ContentStudio({ project, angle, onAngle, userContext, onContext, draft, loading, onGenerate, onSave, claims }: {
  project: ProjectDetail; angle: Angle; onAngle: (value: Angle) => void; userContext: string; onContext: (value: string) => void
  draft: Draft | null; loading: string; onGenerate: () => void; onSave: (draft: Draft) => void; claims: EvidenceClaim[]
}) {
  const [edited, setEdited] = useState<Draft | null>(draft)
  return (
    <div className="studio-page">
      <PageHeading eyebrow="CONTENT STUDIO" title="A post worth stopping for." subtitle={`Create a thoughtful LinkedIn draft grounded in ${project.name} and the work behind it.`} />
      <div className="studio-layout">
        <div className="studio-controls">
          <section className="panel angle-panel">
            <div className="section-title"><span className="step-number">01</span><div><h2>Choose your angle</h2><p>Every good post starts with a point of view.</p></div></div>
            <div className="angle-options">{angles.map((item) => <button key={item.id} className={`angle-option ${angle === item.id ? 'chosen' : ''}`} onClick={() => onAngle(item.id)}><span className="angle-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span className="radio-dot" /></button>)}</div>
          </section>
          <section className="panel context-panel">
            <div className="section-title"><span className="step-number">02</span><div><h2>Add your perspective</h2><p>Optional context makes the draft sound more like you.</p></div></div>
            <label className="sr-only" htmlFor="post-context">Your personal context</label><textarea id="post-context" value={userContext} onChange={(event) => onContext(event.target.value)} placeholder="What surprised you? What was tricky? Add a few notes..." rows={4} />
            <div className="context-note"><span>✦</span> Especially helpful for personal reflections.</div>
          </section>
          <button className="button button-primary generate-button" onClick={onGenerate} disabled={Boolean(loading) || !project.profile}>
            {loading === 'Writing draft' ? <><span className="spinner" /> Writing your draft…</> : <>Generate LinkedIn draft <span>→</span></>}
          </button>
          {!project.profile && <p className="prerequisite-note">Analyze the project from Overview before generating content.</p>}
        </div>
        <section className="panel draft-panel">
          <div className="draft-panel-header"><div><span className="panel-kicker">YOUR DRAFT</span><h2>{edited ? 'Ready for your review' : 'Your next post starts here'}</h2></div><span className="linkedin-badge">in</span></div>
          {edited ? (
            <>
              <div className="draft-editor">
                <label>HOOK<input value={edited.hook} onChange={(event) => setEdited({ ...edited, hook: event.target.value })} /></label>
                <label>POST BODY<textarea rows={10} value={edited.body} onChange={(event) => setEdited({ ...edited, body: event.target.value })} /></label>
                <label>TAKEAWAY<input value={edited.takeaway} onChange={(event) => setEdited({ ...edited, takeaway: event.target.value })} /></label>
                {edited.question && <label>CLOSING QUESTION<input value={edited.question} onChange={(event) => setEdited({ ...edited, question: event.target.value })} /></label>}
              </div>
              {edited.needs_user_input && <div className="review-note"><span>✳</span><p><strong>Add your voice</strong><br />{edited.needs_user_input}</p></div>}
              <ClaimSummary claims={claims} />
              <div className="draft-actions"><span className="draft-help">Make it yours before sharing.</span><button className="button button-primary" onClick={() => onSave(edited)} disabled={Boolean(loading)}>{loading === 'Saving changes' ? 'Saving…' : 'Save draft'}</button></div>
            </>
          ) : (
            <div className="draft-placeholder"><div className="paper-art"><span>✦</span><i /><i /><i /><b>in</b></div><strong>Your source-backed draft will appear here.</strong><p>Pick an angle and generate a draft to get started.</p><div className="placeholder-footer"><span>✓ Evidence checked</span><span>◷ Ready to edit</span></div></div>
          )}
        </section>
      </div>
    </div>
  )
}

function CaseStudyPage({ project, content, loading, userContext, onContext, onGenerate, onSave, onExport }: {
  project: ProjectDetail; content: CaseStudy | null; loading: string; userContext: string; onContext: (value: string) => void
  onGenerate: () => void; onSave: (content: CaseStudy) => void; onExport: (format: 'markdown' | 'pdf') => void
}) {
  const [edited, setEdited] = useState<CaseStudy | null>(content)
  const sections: { key: keyof CaseStudy; title: string }[] = [
    { key: 'summary', title: 'Executive summary' }, { key: 'problem', title: 'Problem and motivation' },
    { key: 'architecture', title: 'Architecture and technologies' }, { key: 'implementation', title: 'Implementation decisions' },
    { key: 'challenges', title: 'Engineering challenges' }, { key: 'results', title: 'Results and evaluation' },
    { key: 'limitations', title: 'Limitations' }, { key: 'future_work', title: 'Future work' },
  ]
  return (
    <div className="case-page">
      <PageHeading eyebrow="CASE STUDY BUILDER" title="The story behind the build." subtitle={`A clear, source-backed case study for ${project.name}.`} />
      {!edited ? (
        <div className="case-start panel">
          <div className="case-cover"><span className="case-cover-orbit orbit-one" /><span className="case-cover-orbit orbit-two" /><span className="case-cover-mark">SP<span>✳</span></span><small>PROJECT STORY / 01</small></div>
          <div className="case-start-content"><span className="panel-kicker">FROM FIRST IDEA TO FINAL BUILD</span><h2>Make the work legible.</h2><p>Generate a structured case study with your project’s problem, decisions, architecture, challenges, and results.</p>
            <label className="field-label">Anything else we should know? <textarea rows={3} value={userContext} onChange={(event) => onContext(event.target.value)} placeholder="Add context that isn't in your project files..." /></label>
            <button className="button button-primary" onClick={onGenerate} disabled={Boolean(loading) || !project.profile}>{loading === 'Creating case study' ? <><span className="spinner" /> Building your story…</> : <>Generate case study <span>→</span></>}</button>
            {!project.profile && <small className="prerequisite-note">Analyze the project first to generate a case study.</small>}
          </div>
        </div>
      ) : (
        <section className="panel case-editor">
          <div className="case-editor-top"><div><span className="panel-kicker">DRAFT CASE STUDY</span><input className="case-title-input" value={edited.title} onChange={(event) => setEdited({ ...edited, title: event.target.value })} /></div><div className="export-actions"><button className="button button-secondary" onClick={() => onExport('markdown')} disabled={Boolean(loading)}>↓ Markdown</button><button className="button button-primary" onClick={() => onExport('pdf')} disabled={Boolean(loading)}>↓ PDF</button></div></div>
          <p className="case-editor-intro">Edit any section below. Review evidence before publishing.</p>
          <div className="case-sections">{sections.map(({ key, title }) => <label key={key} className="case-section"><span>{title}</span><textarea rows={key === 'summary' ? 3 : 4} value={String(edited[key] ?? '')} onChange={(event) => setEdited({ ...edited, [key]: event.target.value })} /></label>)}</div>
          <ClaimSummary claims={edited.verified_claims ?? []} />
          <div className="case-footer"><span>✳ Generated from {project.documents?.length ?? 0} project sources</span><button className="button button-primary" onClick={() => onSave(edited)} disabled={Boolean(loading)}>{loading === 'Saving changes' ? 'Saving…' : 'Save case study'}</button></div>
        </section>
      )}
    </div>
  )
}

function SourcesPage({ project, onAnalyze, loading }: { project: ProjectDetail; onAnalyze: () => void; loading: string }) {
  return (
    <div className="sources-page">
      <PageHeading eyebrow="SOURCE LIBRARY" title="The facts behind the story." subtitle="SocialPilot uses your project sources to keep generated content grounded and verifiable." />
      <div className="source-summary panel"><div className="source-count"><span>◫</span><div><strong>{project.documents?.length ?? 0}</strong><small>source documents</small></div></div><div className="source-details"><strong>{project.name}</strong><p>{project.repository_url || 'Imported README'} · indexed for project insights</p></div><button className="button button-secondary" onClick={onAnalyze} disabled={Boolean(loading)}>{loading === 'Analyzing sources' ? 'Analyzing…' : 'Re-analyze sources'}</button></div>
      <div className="source-list panel"><div className="source-list-heading"><div><span className="panel-kicker">INDEXED FILES</span><h2>Project materials</h2></div><span className="source-file-count">{project.documents?.length ?? 0} files</span></div>
        {project.documents?.length ? project.documents.map((document) => <div className="source-row" key={document.source_id}><span className="file-icon">▤</span><div><strong>{document.path}</strong><small>{document.content.length.toLocaleString()} characters</small></div><span className="indexed-label"><i /> Indexed</span></div>) : <div className="empty-sources">No project sources were found.</div>}
      </div>
    </div>
  )
}

function ClaimSummary({ claims }: { claims: EvidenceClaim[] }) {
  if (!claims.length) return null
  const supported = claims.filter((claim) => claim.status === 'supported').length
  const review = claims.length - supported
  return (
    <div className="claims-box">
      <div className="claims-heading"><span className="claims-check">✓</span><div><strong>Evidence check</strong><small>Draft claims compared with project sources</small></div><b>{supported}/{claims.length}</b></div>
      <div className="claim-badges"><span className="supported-badge">✓ {supported} supported</span>{review > 0 && <span className="review-badge">! {review} need review</span>}</div>
      {claims.slice(0, 4).map((claim, index) => <div className="claim-row" key={`${claim.text}-${index}`}><span className={`claim-status ${claim.status === 'supported' ? 'good' : 'caution'}`}>{claim.status === 'supported' ? '✓' : '!'}</span><div><p>{claim.text}</p><small>{claim.evidence?.[0] ? `${claim.evidence[0].path}${claim.evidence[0].start_line ? `:${claim.evidence[0].start_line}` : ''}` : claim.note || 'No supporting source found'}</small></div></div>)}
    </div>
  )
}

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="page-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>
}

export default App

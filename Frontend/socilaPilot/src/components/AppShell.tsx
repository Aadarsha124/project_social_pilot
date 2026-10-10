import type { ReactNode } from 'react'
import type { Page, ProjectSummary } from '../types'

type AppShellProps = {
  children: ReactNode
  page: Page
  projects: ProjectSummary[]
  projectId: string
  projectSourceCount: number
  error: string
  onNavigate: (page: Page) => void
  onSelectProject: (projectId: string) => void
  onNewProject: () => void
}

const navigation: { page: Page; icon: string }[] = [
  { page: 'Overview', icon: '⌂' },
  { page: 'Content studio', icon: '✦' },
  { page: 'Case studies', icon: '▤' },
  { page: 'Sources', icon: '◫' },
]

function NavIcon({ children }: { children: ReactNode }) {
  return <span className="nav-icon" aria-hidden="true">{children}</span>
}

export function AppShell({
  children,
  page,
  projects,
  projectId,
  projectSourceCount,
  error,
  onNavigate,
  onSelectProject,
  onNewProject,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); onNavigate('Overview') }}>
          <span className="brand-mark"><span>SP</span></span>
          <span className="brand-name">social<span>pilot</span><small>AI CONTENT STUDIO</small></span>
        </a>

        <button className="new-project" onClick={onNewProject}>
          <span>＋</span> New project
        </button>

        <div className="side-label">WORKSPACE</div>
        <nav className="navigation">
          {navigation.map(({ page: target, icon }) => (
            <button
              key={target}
              className={`nav-link ${page === target ? 'active' : ''}`}
              onClick={() => onNavigate(target)}
            >
              <NavIcon>{icon}</NavIcon>{target}
              {target === 'Sources' && projectSourceCount > 0 && <span className="nav-count">{projectSourceCount}</span>}
            </button>
          ))}
        </nav>

        <div className="side-label project-label">YOUR PROJECTS</div>
        {projects.length ? (
          <div className="project-list">
            {projects.slice(0, 5).map((project) => (
              <button
                key={project.project_id}
                className={`project-link ${project.project_id === projectId ? 'selected' : ''}`}
                onClick={() => onSelectProject(project.project_id)}
              >
                <span className="project-dot" />{project.name}
              </button>
            ))}
          </div>
        ) : <p className="sidebar-empty">Your projects will show up here.</p>}

        <div className="sidebar-bottom">
          <div className="api-status">
            <span className={`status-dot ${error ? 'offline' : ''}`} />
            API connection <span>{error ? 'Offline' : 'Ready'}</span>
          </div>
          <div className="profile-chip">
            <div className="avatar">SP</div>
            <div><strong>SocialPilot</strong><small>Personal workspace</small></div>
            <span className="more">···</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{page}</strong></div>
          <div className="top-actions">
            {projects.length > 0 && (
              <label className="project-select-wrap">
                <span className="sr-only">Select project</span>
                <select value={projectId} onChange={(event) => onSelectProject(event.target.value)}>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>{project.name}</option>
                  ))}
                </select>
              </label>
            )}
            <span className="top-avatar">S</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}

type FeedbackProps = {
  error: string
  notice: string
  onDismissError: () => void
  onDismissNotice: () => void
}

export function FeedbackMessages({ error, notice, onDismissError, onDismissNotice }: FeedbackProps) {
  return (
    <>
      {error && (
        <div className="feedback error-feedback">
          <span>!</span>
          <div><strong>Something needs attention</strong><p>{error.replace(/^"|"$/g, '')}</p></div>
          <button onClick={onDismissError} aria-label="Dismiss error">×</button>
        </div>
      )}
      {notice && (
        <div className="feedback success-feedback">
          <span>✓</span><p>{notice}</p>
          <button onClick={onDismissNotice} aria-label="Dismiss message">×</button>
        </div>
      )}
    </>
  )
}

import type { Page, ProjectDetail } from '../types'

type EmptyOverviewProps = {
  onImport: () => void
  page: Page
  loading: boolean
}

export function EmptyOverview({ onImport, page, loading }: EmptyOverviewProps) {
  return (
    <div className="welcome-view">
      <div className="welcome-copy">
        <div className="eyebrow"><span className="sparkle">✳</span> YOUR WORK, WELL TOLD</div>
        <h1>Turn what you<br />built into <em>your story.</em></h1>
        <p>SocialPilot helps developers turn real project work into thoughtful LinkedIn content and polished case studies — grounded in your code and sources.</p>
        <button className="button button-primary" onClick={onImport} disabled={loading}>Import your first project <span>→</span></button>
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

type ProjectOverviewProps = {
  project: ProjectDetail
  loading: boolean
  onAnalyze: () => void
  onOpenStudio: () => void
  onOpenCaseStudy: () => void
  onImport: () => void
}

export function ProjectOverview({
  project,
  loading,
  onAnalyze,
  onOpenStudio,
  onOpenCaseStudy,
  onImport,
}: ProjectOverviewProps) {
  const profile = project.profile
  const artifactCount = Object.keys(project.artifacts ?? {}).length

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">PROJECT WORKSPACE</div>
          <h1>{profile?.name || project.name}<span className="heading-spark">✳</span></h1>
          <p>{profile?.summary || 'Your project is connected. Analyze its sources to uncover the story behind the build.'}</p>
        </div>
        <div className="heading-buttons">
          <button className="button button-secondary" onClick={onImport}>＋ Add project</button>
          <button className="button button-primary" onClick={onAnalyze} disabled={loading}>
            {loading ? <><span className="spinner" /> Analyzing…</> : <>{profile ? 'Refresh analysis' : 'Analyze project'} <span>→</span></>}
          </button>
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
            <div className="analyze-callout"><div className="callout-art"><span>⌘</span><i>✦</i></div><div><strong>Let’s get to know your project</strong><p>Analyze your repository to surface its purpose, technology, architecture, and engineering decisions.</p><button className="text-button" onClick={onAnalyze} disabled={loading}>Analyze project <span>→</span></button></div></div>
          )}
          <div className="panel-footer"><span>◫</span> {project.repository_url || 'README imported'} <a href={project.repository_url || undefined} target="_blank" rel="noreferrer">{project.repository_url ? 'View repository ↗' : ''}</a></div>
        </section>
        <section className="panel next-panel">
          <div className="panel-heading"><div><span className="panel-kicker">MAKE SOMETHING OF IT</span><h2>What will you create?</h2></div></div>
          <button className="action-tile" onClick={onOpenStudio}><span className="action-icon lilac">↗</span><span><strong>LinkedIn content</strong><small>Turn a technical insight into a post</small></span><b>→</b></button>
          <button className="action-tile" onClick={onOpenCaseStudy}><span className="action-icon peach">▤</span><span><strong>Project case study</strong><small>Tell the full story, from problem to impact</small></span><b>→</b></button>
          <div className="evidence-tip"><span>✳</span><p><strong>Built on evidence</strong><br />Every draft is checked against your project sources.</p></div>
        </section>
      </div>
    </div>
  )
}

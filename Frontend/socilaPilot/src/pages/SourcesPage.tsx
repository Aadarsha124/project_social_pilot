import { PageHeading } from '../components/PageHeading'
import type { ProjectDetail } from '../types'

type SourcesPageProps = {
  project: ProjectDetail
  loading: boolean
  onAnalyze: () => void
}

export function SourcesPage({ project, loading, onAnalyze }: SourcesPageProps) {
  return (
    <div className="sources-page">
      <PageHeading
        eyebrow="SOURCE LIBRARY"
        title="The facts behind the story."
        subtitle="SocialPilot uses your project sources to keep generated content grounded and verifiable."
      />
      <div className="source-summary panel">
        <div className="source-count"><span>◫</span><div><strong>{project.documents?.length ?? 0}</strong><small>source documents</small></div></div>
        <div className="source-details"><strong>{project.name}</strong><p>{project.repository_url || 'Imported README'} · indexed for project insights</p></div>
        <button className="button button-secondary" onClick={onAnalyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Re-analyze sources'}
        </button>
      </div>
      <div className="source-list panel">
        <div className="source-list-heading">
          <div><span className="panel-kicker">INDEXED FILES</span><h2>Project materials</h2></div>
          <span className="source-file-count">{project.documents?.length ?? 0} files</span>
        </div>
        {project.documents?.length ? project.documents.map((document) => (
          <div className="source-row" key={document.source_id}>
            <span className="file-icon">▤</span>
            <div><strong>{document.path}</strong><small>{document.content.length.toLocaleString()} characters</small></div>
            <span className="indexed-label"><i /> Indexed</span>
          </div>
        )) : <div className="empty-sources">No project sources were found.</div>}
      </div>
    </div>
  )
}

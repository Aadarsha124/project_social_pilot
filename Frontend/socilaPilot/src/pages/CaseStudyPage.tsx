import { useState } from 'react'
import { ClaimSummary } from '../components/ClaimSummary'
import { PageHeading } from '../components/PageHeading'
import type { CaseStudy, ExportFormat, ProjectDetail } from '../types'

type CaseStudyPageProps = {
  project: ProjectDetail
  content: CaseStudy | null
  loading: boolean
  userContext: string
  onUserContextChange: (value: string) => void
  onGenerate: () => void
  onSave: (content: CaseStudy) => void
  onExport: (format: ExportFormat, content: CaseStudy) => void
}

type CaseStudySection = Exclude<keyof CaseStudy, 'verified_claims'>

const sections: { key: CaseStudySection; title: string }[] = [
  { key: 'summary', title: 'Executive summary' },
  { key: 'problem', title: 'Problem and motivation' },
  { key: 'architecture', title: 'Architecture and technologies' },
  { key: 'implementation', title: 'Implementation decisions' },
  { key: 'challenges', title: 'Engineering challenges' },
  { key: 'results', title: 'Results and evaluation' },
  { key: 'limitations', title: 'Limitations' },
  { key: 'future_work', title: 'Future work' },
]

export function CaseStudyPage({
  project,
  content,
  loading,
  userContext,
  onUserContextChange,
  onGenerate,
  onSave,
  onExport,
}: CaseStudyPageProps) {
  const [editedCaseStudy, setEditedCaseStudy] = useState<CaseStudy | null>(content)

  return (
    <div className="case-page">
      <PageHeading
        eyebrow="CASE STUDY BUILDER"
        title="The story behind the build."
        subtitle={`A clear, source-backed case study for ${project.name}.`}
      />
      {!editedCaseStudy ? (
        <div className="case-start panel">
          <div className="case-cover">
            <span className="case-cover-orbit orbit-one" />
            <span className="case-cover-orbit orbit-two" />
            <span className="case-cover-mark">SP<span>✳</span></span>
            <small>PROJECT STORY / 01</small>
          </div>
          <div className="case-start-content">
            <span className="panel-kicker">FROM FIRST IDEA TO FINAL BUILD</span>
            <h2>Make the work legible.</h2>
            <p>Generate a structured case study with your project’s problem, decisions, architecture, challenges, and results.</p>
            <label className="field-label">Anything else we should know?
              <textarea
                rows={3}
                value={userContext}
                onChange={(event) => onUserContextChange(event.target.value)}
                placeholder="Add context that isn't in your project files..."
              />
            </label>
            <button className="button button-primary" onClick={onGenerate} disabled={loading || !project.profile}>
              {loading ? <><span className="spinner" /> Building your story…</> : <>Generate case study <span>→</span></>}
            </button>
            {!project.profile && <small className="prerequisite-note">Analyze the project first to generate a case study.</small>}
          </div>
        </div>
      ) : (
        <section className="panel case-editor">
          <div className="case-editor-top">
            <div>
              <span className="panel-kicker">DRAFT CASE STUDY</span>
              <input
                className="case-title-input"
                value={editedCaseStudy.title}
                onChange={(event) => setEditedCaseStudy({ ...editedCaseStudy, title: event.target.value })}
              />
            </div>
            <div className="export-actions">
              <button className="button button-secondary" onClick={() => onExport('markdown', editedCaseStudy)} disabled={loading}>↓ Markdown</button>
              <button className="button button-primary" onClick={() => onExport('pdf', editedCaseStudy)} disabled={loading}>↓ PDF</button>
            </div>
          </div>
          <p className="case-editor-intro">Edit any section below. Review evidence before publishing.</p>
          <div className="case-sections">
            {sections.map(({ key, title }) => (
              <label key={key} className="case-section">
                <span>{title}</span>
                <textarea
                  rows={key === 'summary' ? 3 : 4}
                  value={editedCaseStudy[key] ?? ''}
                  onChange={(event) => setEditedCaseStudy({ ...editedCaseStudy, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
          <ClaimSummary claims={editedCaseStudy.verified_claims ?? []} />
          <div className="case-footer">
            <span>✳ Generated from {project.documents?.length ?? 0} project sources</span>
            <button className="button button-primary" onClick={() => onSave(editedCaseStudy)} disabled={loading}>
              {loading ? 'Saving…' : 'Save case study'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

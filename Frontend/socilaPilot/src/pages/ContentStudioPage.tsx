import { useState } from 'react'
import { ClaimSummary } from '../components/ClaimSummary'
import { PageHeading } from '../components/PageHeading'
import { LINKEDIN_ANGLES, type EvidenceClaim, type LinkedInAngle, type LinkedInDraft, type ProjectDetail } from '../types'

type ContentStudioPageProps = {
  project: ProjectDetail
  angle: LinkedInAngle
  onAngleChange: (angle: LinkedInAngle) => void
  userContext: string
  onUserContextChange: (value: string) => void
  draft: LinkedInDraft | null
  claims: EvidenceClaim[]
  loading: boolean
  onGenerate: () => void
  onSave: (draft: LinkedInDraft) => void
}

export function ContentStudioPage({
  project,
  angle,
  onAngleChange,
  userContext,
  onUserContextChange,
  draft,
  claims,
  loading,
  onGenerate,
  onSave,
}: ContentStudioPageProps) {
  const [editedDraft, setEditedDraft] = useState<LinkedInDraft | null>(draft)

  return (
    <div className="studio-page">
      <PageHeading
        eyebrow="CONTENT STUDIO"
        title="A post worth stopping for."
        subtitle={`Create a thoughtful LinkedIn draft grounded in ${project.name} and the work behind it.`}
      />
      <div className="studio-layout">
        <div className="studio-controls">
          <section className="panel angle-panel">
            <div className="section-title"><span className="step-number">01</span><div><h2>Choose your angle</h2><p>Every good post starts with a point of view.</p></div></div>
            <div className="angle-options">
              {LINKEDIN_ANGLES.map((option) => (
                <button
                  key={option.id}
                  className={`angle-option ${angle === option.id ? 'chosen' : ''}`}
                  onClick={() => onAngleChange(option.id)}
                >
                  <span className="angle-icon">{option.icon}</span>
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                  <span className="radio-dot" />
                </button>
              ))}
            </div>
          </section>
          <section className="panel context-panel">
            <div className="section-title"><span className="step-number">02</span><div><h2>Add your perspective</h2><p>Optional context makes the draft sound more like you.</p></div></div>
            <label className="sr-only" htmlFor="post-context">Your personal context</label>
            <textarea
              id="post-context"
              value={userContext}
              onChange={(event) => onUserContextChange(event.target.value)}
              placeholder="What surprised you? What was tricky? Add a few notes..."
              rows={4}
            />
            <div className="context-note"><span>✦</span> Especially helpful for personal reflections.</div>
          </section>
          <button className="button button-primary generate-button" onClick={onGenerate} disabled={loading || !project.profile}>
            {loading ? <><span className="spinner" /> Writing your draft…</> : <>Generate LinkedIn draft <span>→</span></>}
          </button>
          {!project.profile && <p className="prerequisite-note">Analyze the project from Overview before generating content.</p>}
        </div>

        <section className="panel draft-panel">
          <div className="draft-panel-header">
            <div><span className="panel-kicker">YOUR DRAFT</span><h2>{editedDraft ? 'Ready for your review' : 'Your next post starts here'}</h2></div>
            <span className="linkedin-badge">in</span>
          </div>
          {editedDraft ? (
            <>
              <div className="draft-editor">
                <label>HOOK<input value={editedDraft.hook} onChange={(event) => setEditedDraft({ ...editedDraft, hook: event.target.value })} /></label>
                <label>POST BODY<textarea rows={10} value={editedDraft.body} onChange={(event) => setEditedDraft({ ...editedDraft, body: event.target.value })} /></label>
                <label>TAKEAWAY<input value={editedDraft.takeaway} onChange={(event) => setEditedDraft({ ...editedDraft, takeaway: event.target.value })} /></label>
                {editedDraft.question && <label>CLOSING QUESTION<input value={editedDraft.question} onChange={(event) => setEditedDraft({ ...editedDraft, question: event.target.value })} /></label>}
              </div>
              {editedDraft.needs_user_input && (
                <div className="review-note"><span>✳</span><p><strong>Add your voice</strong><br />{editedDraft.needs_user_input}</p></div>
              )}
              <ClaimSummary claims={claims} />
              <div className="draft-actions">
                <span className="draft-help">Make it yours before sharing.</span>
                <button className="button button-primary" onClick={() => onSave(editedDraft)} disabled={loading}>
                  {loading ? 'Saving…' : 'Save draft'}
                </button>
              </div>
            </>
          ) : (
            <div className="draft-placeholder">
              <div className="paper-art"><span>✦</span><i /><i /><i /><b>in</b></div>
              <strong>Your source-backed draft will appear here.</strong>
              <p>Pick an angle and generate a draft to get started.</p>
              <div className="placeholder-footer"><span>✓ Evidence checked</span><span>◷ Ready to edit</span></div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

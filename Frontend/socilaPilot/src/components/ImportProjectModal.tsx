import type { FormEvent } from 'react'

export type ImportMode = 'github' | 'readme'

type ImportProjectModalProps = {
  mode: ImportMode
  repoUrl: string
  readme: string
  loading: boolean
  onModeChange: (mode: ImportMode) => void
  onRepoUrlChange: (value: string) => void
  onReadmeChange: (value: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ImportProjectModal({
  mode,
  repoUrl,
  readme,
  loading,
  onModeChange,
  onRepoUrlChange,
  onReadmeChange,
  onClose,
  onSubmit,
}: ImportProjectModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-eyebrow">START WITH YOUR PROJECT</div>
        <h2 id="import-title">Bring your work into focus.</h2>
        <p className="modal-description">SocialPilot reads your project sources to create accurate, evidence-backed content.</p>
        <div className="import-tabs">
          <button className={mode === 'github' ? 'selected' : ''} onClick={() => onModeChange('github')}>GitHub repository</button>
          <button className={mode === 'readme' ? 'selected' : ''} onClick={() => onModeChange('readme')}>Paste a README</button>
        </div>
        <form onSubmit={onSubmit}>
          {mode === 'github' ? (
            <label className="field-label">Repository URL
              <input
                autoFocus
                type="url"
                placeholder="https://github.com/you/your-project"
                value={repoUrl}
                onChange={(event) => onRepoUrlChange(event.target.value)}
                required
              />
              <small>Public GitHub repositories are supported.</small>
            </label>
          ) : (
            <label className="field-label">README content
              <textarea
                autoFocus
                rows={7}
                placeholder={'# My project\nDescribe what you built...'}
                value={readme}
                onChange={(event) => onReadmeChange(event.target.value)}
                required
              />
            </label>
          )}
          <button className="button button-primary modal-submit" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Importing…</> : <>Import project <span>→</span></>}
          </button>
        </form>
        <div className="privacy-note"><span>◇</span> Your content is only used to generate drafts for your workspace.</div>
      </section>
    </div>
  )
}

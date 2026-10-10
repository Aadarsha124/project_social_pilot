import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AppShell, FeedbackMessages } from './components/AppShell'
import { ImportProjectModal, type ImportMode } from './components/ImportProjectModal'
import { CaseStudyPage } from './pages/CaseStudyPage'
import { ContentStudioPage } from './pages/ContentStudioPage'
import { EmptyOverview, ProjectOverview } from './pages/OverviewPage'
import { SourcesPage } from './pages/SourcesPage'
import {
  api,
  caseStudyFilename,
  downloadFile,
  exportCaseStudy as requestCaseStudyExport,
  saveCaseStudy,
  saveLinkedInDraft,
} from './services/api'
import type {
  CaseStudy,
  ExportFormat,
  LinkedInAngle,
  LinkedInDraft,
  Page,
  ProjectDetail,
  ProjectSummary,
} from './types'
import './App.css'

function isLinkedInDraft(value: LinkedInDraft | CaseStudy | null | undefined): value is LinkedInDraft {
  return Boolean(value && 'hook' in value)
}

function getErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

function App() {
  const [page, setPage] = useState<Page>('Overview')
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [projectId, setProjectId] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [readme, setReadme] = useState('')
  const [selectedAngle, setSelectedAngle] = useState<LinkedInAngle>('technical_lesson')
  const [userContext, setUserContext] = useState('')
  const [draft, setDraft] = useState<LinkedInDraft | null>(null)
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
      .catch((cause: unknown) => setError(getErrorMessage(cause, 'Could not connect to SocialPilot API.')))
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
        if (!cancelled) setError(getErrorMessage(cause, 'Could not load project.'))
      })
    return () => { cancelled = true }
  }, [projectId])

  const savedDraft = useMemo(() => {
    const artifact = project?.artifacts[`linkedin:${selectedAngle}`]
    const saved = artifact?.edited ?? artifact?.generated
    return isLinkedInDraft(saved) ? saved : null
  }, [project, selectedAngle])

  const activeDraft = draft ?? savedDraft
  const savedCaseStudy = project?.artifacts.case_study
  const activeCaseStudy = caseStudy ?? (
    savedCaseStudy?.edited && 'title' in savedCaseStudy.edited
      ? savedCaseStudy.edited
      : savedCaseStudy?.generated && 'title' in savedCaseStudy.generated
        ? savedCaseStudy.generated
        : null
  )
  const runAction = async <T,>(
    label: string,
    task: () => Promise<T>,
    onSuccess: (result: T) => void,
  ) => {
    setLoading(label)
    setError('')
    setNotice('')
    try {
      onSuccess(await task())
    } catch (cause) {
      setError(getErrorMessage(cause, 'Something went wrong. Please try again.'))
    } finally {
      setLoading('')
    }
  }

  const importProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = importMode === 'github' ? { repo_url: repoUrl } : { pasted_readme: readme }
    await runAction('Importing project', async () => {
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
      setPage('Overview')
      setNotice('Project imported. Analyze it to build your project profile.')
    })
  }

  const analyzeProject = async () => {
    if (!project) return
    await runAction('Analyzing sources', () =>
      api<ProjectDetail['profile']>(`/projects/${project.project_id}/analyze`, { method: 'POST' }),
    (profile) => {
      setProject({ ...project, profile })
      setNotice('Project analysis complete. Your source-backed profile is ready.')
    })
  }

  const generateDraft = async () => {
    if (!project) return
    await runAction('Writing draft', () => api<LinkedInDraft>(
      `/projects/${project.project_id}/linkedin/${selectedAngle}`,
      {
        method: 'POST',
        body: JSON.stringify({ user_context: userContext }),
      },
    ), (result) => {
      setDraft(result)
      setNotice('Draft generated with evidence checks.')
    })
  }

  const generateCaseStudy = async () => {
    if (!project) return
    await runAction('Creating case study', () => api<CaseStudy>(
      `/projects/${project.project_id}/case-study`,
      {
        method: 'POST',
        body: JSON.stringify({ user_context: userContext }),
      },
    ), (result) => {
      setCaseStudy(result)
      setNotice('Case study generated. Review claims before sharing.')
    })
  }

  const saveDraft = async (content: LinkedInDraft) => {
    if (!project) return
    await runAction('Saving changes', () => saveLinkedInDraft(project.project_id, selectedAngle, content), () => {
      setDraft(content)
      setNotice('Your edits have been saved.')
    })
  }

  const saveStudy = async (content: CaseStudy) => {
    if (!project) return
    await runAction('Saving changes', () => saveCaseStudy(project.project_id, content), () => {
      setCaseStudy(content)
      setNotice('Your edits have been saved.')
    })
  }

  const exportStudy = async (format: ExportFormat, content: CaseStudy) => {
    if (!project) return
    await runAction(`Preparing ${format.toUpperCase()}`, () =>
      requestCaseStudyExport(format, content, project.repository_url),
    (blob) => {
      downloadFile(blob, caseStudyFilename(content, format))
      setNotice(`${format === 'pdf' ? 'PDF' : 'Markdown'} exported.`)
    })
  }

  const navigate = (nextPage: Page) => {
    setPage(nextPage)
    setError('')
    setNotice('')
  }

  return (
    <>
      <AppShell
        page={page}
        projects={projects}
        projectId={projectId}
        projectSourceCount={project?.documents.length ?? 0}
        error={error}
        onNavigate={navigate}
        onSelectProject={setProjectId}
        onNewProject={() => setShowImport(true)}
      >
        <div className="page-content">
          <FeedbackMessages
            error={error}
            notice={notice}
            onDismissError={() => setError('')}
            onDismissNotice={() => setNotice('')}
          />
          {!project ? (
            <EmptyOverview onImport={() => setShowImport(true)} page={page} loading={Boolean(loading)} />
          ) : page === 'Overview' ? (
            <ProjectOverview
              project={project}
              loading={loading === 'Analyzing sources'}
              onAnalyze={analyzeProject}
              onOpenStudio={() => navigate('Content studio')}
              onOpenCaseStudy={() => navigate('Case studies')}
              onImport={() => setShowImport(true)}
            />
          ) : page === 'Content studio' ? (
            <ContentStudioPage
              key={`${project.project_id}:${selectedAngle}:${activeDraft?.hook ?? 'new'}`}
              project={project}
              angle={selectedAngle}
              onAngleChange={setSelectedAngle}
              userContext={userContext}
              onUserContextChange={setUserContext}
              draft={activeDraft}
              claims={activeDraft?.verified_claims ?? []}
              loading={loading === 'Writing draft' || loading === 'Saving changes'}
              onGenerate={generateDraft}
              onSave={saveDraft}
            />
          ) : page === 'Case studies' ? (
            <CaseStudyPage
              key={`${project.project_id}:${activeCaseStudy?.title ?? 'new'}`}
              project={project}
              content={activeCaseStudy}
              loading={loading === 'Creating case study' || loading === 'Saving changes' || loading.startsWith('Preparing')}
              userContext={userContext}
              onUserContextChange={setUserContext}
              onGenerate={generateCaseStudy}
              onSave={saveStudy}
              onExport={exportStudy}
            />
          ) : (
            <SourcesPage
              project={project}
              loading={loading === 'Analyzing sources'}
              onAnalyze={analyzeProject}
            />
          )}
        </div>
      </AppShell>

      {showImport && (
        <ImportProjectModal
          mode={importMode}
          repoUrl={repoUrl}
          readme={readme}
          loading={loading === 'Importing project'}
          onModeChange={setImportMode}
          onRepoUrlChange={setRepoUrl}
          onReadmeChange={setReadme}
          onClose={() => setShowImport(false)}
          onSubmit={importProject}
        />
      )}
    </>
  )
}

export default App

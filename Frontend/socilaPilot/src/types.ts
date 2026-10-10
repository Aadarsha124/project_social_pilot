export type ProjectSummary = {
  project_id: string
  name: string
  repository_url: string | null
  created_at: string
}

export type EvidenceClaim = {
  text: string
  status: 'supported' | 'needs_review' | 'unsupported'
  note?: string | null
  evidence?: {
    path: string
    start_line?: number | null
    end_line?: number | null
  }[]
}

export type LinkedInDraft = {
  angle: string
  hook: string
  insight: string
  body: string
  takeaway: string
  question?: string | null
  needs_user_input?: string | null
  verified_claims?: EvidenceClaim[]
}

export type CaseStudy = {
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

export type ProjectProfile = {
  name: string
  summary: string
  problem?: string
  technologies?: string[]
  architecture?: string[]
  challenges?: string[]
  results?: string[]
  unknowns?: string[]
}

export type Artifact<T> = {
  generated: T
  edited: T | null
  updated_at?: string
}

export type ProjectDetail = ProjectSummary & {
  profile: ProjectProfile | null
  documents: { source_id: string; path: string; content: string }[]
  artifacts: Record<string, Artifact<LinkedInDraft | CaseStudy>>
}

export type Page = 'Overview' | 'Content studio' | 'Case studies' | 'Sources'
export type LinkedInAngle = 'technical_lesson' | 'engineering_decision' | 'personal_reflection'
export type ExportFormat = 'markdown' | 'pdf'
export type EditableArtifact = LinkedInDraft | CaseStudy

export const LINKEDIN_ANGLES: {
  id: LinkedInAngle
  title: string
  description: string
  icon: string
}[] = [
  { id: 'technical_lesson', title: 'Technical lesson', description: 'Explain how it works and what you learned.', icon: '↗' },
  { id: 'engineering_decision', title: 'Engineering decision', description: 'Share a design choice and its trade-offs.', icon: '⌘' },
  { id: 'personal_reflection', title: 'Personal reflection', description: 'Tell the story behind the work.', icon: '✳' },
]

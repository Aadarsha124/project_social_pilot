import type { CaseStudy, ExportFormat, LinkedInDraft } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function exportCaseStudy(
  format: ExportFormat,
  caseStudy: CaseStudy,
  repositoryUrl: string | null,
): Promise<Blob> {
  const path = format === 'pdf' ? '/export/pdf' : '/export/markdown'
  const response = await fetch(
    `${API_BASE}${path}?repo_url=${encodeURIComponent(repositoryUrl ?? '')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseStudy),
    },
  )
  if (!response.ok) {
    throw new Error(await response.text() || `Export failed (${response.status})`)
  }
  return response.blob()
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function caseStudyFilename(caseStudy: CaseStudy, format: ExportFormat): string {
  const slug = caseStudy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${slug}.${format === 'pdf' ? 'pdf' : 'md'}`
}

export function saveLinkedInDraft(projectId: string, angle: string, content: LinkedInDraft): Promise<{ saved: boolean }> {
  return api(`/projects/${projectId}/artifacts/linkedin:${angle}`, {
    method: 'PUT',
    body: JSON.stringify(content),
  })
}

export function saveCaseStudy(projectId: string, content: CaseStudy): Promise<{ saved: boolean }> {
  return api(`/projects/${projectId}/artifacts/case_study`, {
    method: 'PUT',
    body: JSON.stringify(content),
  })
}

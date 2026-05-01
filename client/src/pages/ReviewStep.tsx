import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFloppyDisk,
  faPlus,
  faSpinner,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from 'react-router-dom'
import { commitResume, createGenerateJob, getResume, rewritePreview, waitForJob } from '../api/resumeSync'
import { useNotification } from '../context/useNotification'
import SectionCard from '../components/SectionCard'
import ResumeSheet from '../components/ResumeSheet'
import { useWorkspace } from '../context/useWorkspace'
import { mockDraftResume, mockMasterResume, strategicKeywords } from '../data/mockData'
import type { ResumeDocument } from '../types/resume'

type ReviewStepProps = {
  onNext: () => void
  onBack: () => void
}

function ReviewStep({ onNext, onBack }: ReviewStepProps) {
  const { addNotification } = useNotification()
  const [rewriteInstruction, setRewriteInstruction] = useState('make more impactful')
  const [rewriteStatus, setRewriteStatus] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const {
    draftResume,
    generatedResumeId,
    masterResume,
    selectedTemplateId,
    setDraftResume,
    setGeneratedResume,
    setLastGenerateJob,
    lastGenerateJob,
    tailoringMode,
    targetCompany,
    targetRole,
    jobDescription,
  } = useWorkspace()

  function deriveResumeIdFromJsonKey(jsonKey: string | null) {
    if (!jsonKey) return null
    const match = jsonKey.match(/\/json\/([^/]+)\.json$/)
    return match?.[1] ?? null
  }

  // Poll for the generation job if it was started in the previous step
  useEffect(() => {
    if (lastGenerateJob && lastGenerateJob.status !== 'complete' && lastGenerateJob.status !== 'failed') {
      void (async () => {
        setIsGenerating(true)
        setRewriteStatus('Finalizing your tailored resume...')
        try {
          const finalJob = await waitForJob(lastGenerateJob.job_id)
          setLastGenerateJob(finalJob)

          if (finalJob.status === 'failed') {
            throw new Error(finalJob.error || 'The tailoring job failed.')
          }

          const newResumeId = deriveResumeIdFromJsonKey(finalJob.output_json_key)
          if (newResumeId) {
            const tailoredDoc = await getResume(newResumeId)
            setGeneratedResume(newResumeId, finalJob.output_json_key)
            setDraftResume(tailoredDoc)
            setRewriteStatus('Tailoring complete.')
          }
        } catch (error) {
          addNotification({
            type: 'error',
            message: 'Tailoring Failed',
            description: error instanceof Error ? error.message : 'Unable to load tailored resume.'
          })
        } finally {
          setIsGenerating(false)
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastGenerateJob?.job_id, lastGenerateJob?.status])

  async function handleGenerateDraft() {
    if (!masterResume) {
      setRewriteStatus('Upload a master resume first.')
      return
    }

    setIsGenerating(true)
    setRewriteStatus('Submitting a new tailoring job...')

    try {
      const job = await createGenerateJob({
        job_type: 'generate',
        mode: tailoringMode,
        source_type: 'master',
        template_id: selectedTemplateId,
        target_role: targetRole || null,
        target_company: targetCompany || null,
        job_description: jobDescription || null,
      })

      const finalJob = await waitForJob(job.job_id)
      setLastGenerateJob(finalJob)
      if (finalJob.status === 'failed') {
        throw new Error(finalJob.error || 'The generation job failed.')
      }

      const newResumeId = deriveResumeIdFromJsonKey(finalJob.output_json_key)
      if (!newResumeId) {
        throw new Error('Invalid resume key returned.')
      }

      const tailoredDoc = await getResume(newResumeId)
      setGeneratedResume(newResumeId, finalJob.output_json_key)
      setDraftResume(tailoredDoc)
      addNotification({
        type: 'success',
        message: 'Tailoring Complete',
        description: 'Your resume has been successfully tailored for the target role.'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unable to tailor.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  function handleLoadMockData() {
    setMasterResume(mockMasterResume)
    setDraftResume(mockDraftResume)
    setGeneratedResume('mock-resume-id', 'mock/json/mock-resume-id.json')
    setRewriteStatus('Loaded mock data for testing.')
  }

  async function handleSummaryRewrite() {
    if (!draftResume?.summary) {
      setRewriteStatus('Load or generate a draft first so there is something to rewrite.')
      return
    }

    setIsRewriting(true)
    setRewriteStatus('Asking the backend for a real-time rewrite preview...')
    try {
      const response = await rewritePreview({
        text: draftResume.summary,
        instruction: rewriteInstruction,
        mode: tailoringMode,
      })
      setDraftResume({
        ...draftResume,
        summary: response.rewritten_text,
      })
      setRewriteStatus('Preview applied locally. Save the draft to persist it.')
    } catch (error) {
      setRewriteStatus(error instanceof Error ? error.message : 'Unable to rewrite the summary.')
    } finally {
      setIsRewriting(false)
    }
  }

  async function handleCommitDraft() {
    if (!generatedResumeId || !draftResume) {
      setRewriteStatus('Generate a draft first so there is a backend resume id to commit to.')
      return
    }

    setIsSaving(true)
    setRewriteStatus('Saving the full JSON draft back to the backend...')
    try {
      const commitJob = await commitResume(generatedResumeId, draftResume)
      const finalJob = await import('../api/resumeSync').then(({ waitForJob }) => waitForJob(commitJob.job_id))
      if (finalJob.status === 'failed') {
        throw new Error(finalJob.error || 'Commit failed.')
      }
      setRewriteStatus('Draft committed successfully.')
    } catch (error) {
      setRewriteStatus(error instanceof Error ? error.message : 'Unable to commit the draft.')
    } finally {
      setIsSaving(false)
    }
  }

  const originalDocument = masterResume
  const workingDocument = draftResume

  return (
    <div className="page-stack">
      {createPortal(
        <div className="page-toolbar__actions">
          <button className="button button--ghost" onClick={() => void handleCommitDraft()} type="button">
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faFloppyDisk} />}
            Save Draft
          </button>
          <div style={{ width: '10px' }} />
          <button className="button button--primary" onClick={onNext} type="button">
            Approve & Continue
          </button>
        </div>,
        document.getElementById('header-actions-portal')!
      )}

      <div className="review-grid">
        <SectionCard className="review-panel">
          <ResumeSheet
            document={originalDocument}
            title="Master Resume"
            subtitle="Uploaded document data"
          />
        </SectionCard>

        <SectionCard className="review-panel" style={{ border: '1px solid var(--color-success-soft, #dcfce7)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <p className="tag tag--success" style={{ margin: 0 }}>ATS Optimized</p>
          </div>

          <ResumeSheet
            document={workingDocument}
            isLoading={isGenerating}
            title="Tailored Resume"
            subtitle="AI enhanced for target role"
          />

          <div className="review-section" style={{ marginTop: 'var(--space-6)' }}>
            <p className="section-label">Strategic Keywords Added</p>
            <div className="tag-row">
              {strategicKeywords.map((keyword) => (
                <span className="tag tag--soft-blue" key={keyword}>
                  {keyword} <FontAwesomeIcon icon={faPlus} />
                </span>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default ReviewStep

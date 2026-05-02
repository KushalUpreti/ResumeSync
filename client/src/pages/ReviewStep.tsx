import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFloppyDisk,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { commitResume, getResume, waitForJob } from '../api/resumeSync'
import { useNotification } from '../context/useNotification'
import SectionCard from '../components/SectionCard'
import ResumeSheet from '../components/ResumeSheet'
import { useWorkspace } from '../context/useWorkspace'

type ReviewStepProps = {
  onNext: () => void
  onBack: () => void
}

function ReviewStep({ onNext }: ReviewStepProps) {
  const { addNotification } = useNotification()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const {
    draftResume,
    generatedResumeId,
    masterResume,
    setDraftResume,
    setGeneratedResume,
    setLastGenerateJob,
    lastGenerateJob,
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
        try {
          const finalJob = await waitForJob(lastGenerateJob.job_id)
          setLastGenerateJob(finalJob)

          if (finalJob.status === 'failed') {
            throw new Error(finalJob.error || 'The tailoring job failed.')
          }

          const newResumeId = deriveResumeIdFromJsonKey(finalJob.output_s3_key)
          if (newResumeId) {
            const tailoredDoc = await getResume(newResumeId)
            setGeneratedResume(newResumeId, finalJob.output_s3_key)
            setDraftResume(tailoredDoc)
            addNotification({
              type: 'success',
              message: 'Tailoring Complete',
              description: 'Your tailored resume is ready for review.'
            })
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

  async function handleCommitDraft() {
    if (!generatedResumeId || !draftResume) {
      addNotification({
        type: 'warning',
        message: 'Cannot Save',
        description: 'You need a generated draft before you can save.'
      })
      return
    }

    setIsSaving(true)
    try {
      const commitJob = await commitResume(generatedResumeId, draftResume)
      const finalJob = await waitForJob(commitJob.job_id)
      if (finalJob.status === 'failed') {
        throw new Error(finalJob.error || 'Commit failed.')
      }
      addNotification({
        type: 'success',
        message: 'Draft Saved',
        description: 'Your tailored resume has been committed to the backend.'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Save Failed',
        description: error instanceof Error ? error.message : 'Unable to commit the draft.'
      })
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

        </SectionCard>
      </div>
    </div>
  )
}

export default ReviewStep

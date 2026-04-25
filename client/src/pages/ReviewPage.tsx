import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFloppyDisk,
  faPenToSquare,
  faPlus,
  faSpinner,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { Link, useLocation } from 'react-router-dom'
import { commitResume, rewritePreview } from '../api/resumeSync'
import FlowStepper from '../components/FlowStepper'
import SectionCard from '../components/SectionCard'
import { useWorkspace } from '../context/useWorkspace'
import { flowSteps, strategicKeywords } from '../data/mockData'

function ReviewPage() {
  const location = useLocation()
  const {
    draftResume,
    generatedResumeId,
    lastGenerateJob,
    masterResume,
    setDraftResume,
    tailoringMode,
  } = useWorkspace()
  const [rewriteInstruction, setRewriteInstruction] = useState('make more impactful')
  const [rewriteStatus, setRewriteStatus] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
      <div className="page-toolbar">
        <FlowStepper currentPath={location.pathname} steps={flowSteps} />
        <div className="page-toolbar__actions">
          <button className="button button--ghost" onClick={() => void handleCommitDraft()} type="button">
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faFloppyDisk} />}
            Save Draft
          </button>
          <Link className="button button--primary" to="/export">
            Approve & Continue
          </Link>
        </div>
      </div>

      <div className="review-grid">
        <SectionCard className="review-panel">
          <div className="section-card__header section-card__header--split">
            <h2 className="section-card__title">Original Resume Source</h2>
            <span className="tag tag--neutral">
              {originalDocument ? 'Master resume JSON loaded' : 'No master resume loaded'}
            </span>
          </div>

          <div className="review-section">
            <p className="section-label">Summary</p>
            <div className="resume-block">
              <p className="section-copy">{originalDocument?.summary ?? 'Upload and parse a master resume to populate this review pane.'}</p>
            </div>
          </div>

          <div className="review-section">
            <p className="section-label">Experience</p>
            {(originalDocument?.experience ?? []).map((entry) => (
              <div className="resume-block" key={`${entry.company}-${entry.role}`}>
                <h3>{entry.role} @ {entry.company}</h3>
                <ul className="clean-list">
                  {entry.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="review-section">
            <p className="section-label">Skills</p>
            <div className="tag-row">
              {(originalDocument?.skills ?? []).map((skill) => (
                <span className="tag tag--neutral" key={skill}>{skill}</span>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard className="review-panel review-panel--dark">
          <div className="review-scorebar">
            <div>
              <div className="review-title-row">
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                <h2 className="review-panel__title">AI Optimized Output</h2>
              </div>
              <p className="tag tag--success">ATS Optimized</p>
            </div>
            <div className="metrics-row">
              <div>
                <span>Generate Job</span>
                <strong>{lastGenerateJob?.status ?? 'idle'}</strong>
              </div>
              <div>
                <span>Resume ID</span>
                <strong>{generatedResumeId ?? 'n/a'}</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>{tailoringMode}</strong>
              </div>
            </div>
          </div>

          <div className="optimized-card">
            <div className="optimized-card__header">
              <p className="section-label">Working Draft Summary</p>
              <button className="icon-action" onClick={() => void handleSummaryRewrite()} type="button">
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
            </div>
            <div className="optimized-card__body">
              <textarea
                className="text-area"
                onChange={(event) =>
                  workingDocument &&
                  setDraftResume({
                    ...workingDocument,
                    summary: event.target.value,
                  })
                }
                value={workingDocument?.summary ?? ''}
              />
              <label className="field">
                <span>Rewrite instruction</span>
                <input
                  className="field__control"
                  onChange={(event) => setRewriteInstruction(event.target.value)}
                  type="text"
                  value={rewriteInstruction}
                />
              </label>
              <button className="button button--ghost" onClick={() => void handleSummaryRewrite()} type="button">
                {isRewriting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faWandMagicSparkles} />}
                Preview Rewrite
              </button>
              <div className="review-tooltip">{rewriteStatus || 'Use rewrite preview for fast text iteration, then save the full JSON draft.'}</div>
            </div>
          </div>

          <div className="review-section">
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

export default ReviewPage

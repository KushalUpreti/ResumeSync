import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileArrowDown,
  faFilePdf,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from 'react-router-dom'
import { renderResume, waitForJob } from '../api/resumeSync'
import FlowStepper from '../components/FlowStepper'
import TemplateCard from '../components/TemplateCard'
import { useWorkspace } from '../context/useWorkspace'
import { flowSteps, templates } from '../data/mockData'

function ExportPage() {
  const location = useLocation()
  const {
    generatedResumeId,
    lastRenderJob,
    selectedTemplateId,
    setLastRenderJob,
    setSelectedTemplateId,
  } = useWorkspace()
  const [renderStatus, setRenderStatus] = useState('')
  const [isRendering, setIsRendering] = useState(false)

  async function handleRender() {
    if (!generatedResumeId) {
      setRenderStatus('Generate a draft first so the backend has a resume id to render.')
      return
    }

    setIsRendering(true)
    setRenderStatus('Submitting a render job to the backend...')

    try {
      const renderJob = await renderResume(generatedResumeId, {
        template_id: selectedTemplateId,
      })
      const finalJob = await waitForJob(renderJob.job_id)
      setLastRenderJob(finalJob)
      if (finalJob.status === 'failed') {
        throw new Error(finalJob.error || 'Render failed.')
      }
      setRenderStatus(`Render complete. Output stored at ${finalJob.output_s3_key}.`)
    } catch (error) {
      setRenderStatus(error instanceof Error ? error.message : 'Unable to render the resume.')
    } finally {
      setIsRendering(false)
    }
  }

  return (
    <div className="page-stack">
      <FlowStepper currentPath={location.pathname} steps={flowSteps} />

      <section className="page-intro page-intro--split">
        <div>
          <p className="eyebrow">Step 4 / Final Export</p>
          <h1 className="page-title page-title--medium">Choose Your Template</h1>
          <p className="page-copy">
            Select a layout optimized by our AI for your specific industry and experience
            level. You can switch templates at any time.
          </p>
        </div>
        <div className="page-intro__actions">
          <button className="button button--ghost" onClick={() => void handleRender()} type="button">
            {isRendering ? <FontAwesomeIcon icon={faSpinner} spin /> : null}
            <FontAwesomeIcon icon={faFileArrowDown} />
            Render .docx
          </button>
          <button className="button button--primary" disabled type="button">
            <FontAwesomeIcon icon={faFilePdf} />
            PDF not wired yet
          </button>
        </div>
      </section>

      <div className="template-grid">
        {templates.map((template) => (
          <TemplateCard
            accent={template.accent}
            description={template.description}
            isSelected={selectedTemplateId === template.title.toLowerCase()}
            key={template.title}
            onSelect={() => setSelectedTemplateId(template.title.toLowerCase())}
            title={template.title}
          />
        ))}
      </div>

      <div className="auth-note">
        {renderStatus || (lastRenderJob ? `Latest render job status: ${lastRenderJob.status}` : 'Choose a template and render the backend docx output into S3.')}
      </div>

      <section className="selected-template-bar">
        <div className="selected-template-bar__info">
          <div className="selected-template-bar__icon">
            <div className="template-sheet template-sheet--tiny" />
          </div>
          <div>
            <p className="section-label">Selected Template</p>
            <h3>{selectedTemplateId}</h3>
          </div>
        </div>
        <div className="selected-template-bar__actions">
          <button className="button button--ghost" onClick={() => void handleRender()} type="button">
            <FontAwesomeIcon icon={faFileArrowDown} />
            Render .docx
          </button>
          <button className="button button--primary" disabled type="button">
            <FontAwesomeIcon icon={faFilePdf} />
            Download PDF
          </button>
        </div>
      </section>
    </div>
  )
}

export default ExportPage

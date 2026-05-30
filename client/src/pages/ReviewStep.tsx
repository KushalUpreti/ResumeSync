import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFloppyDisk,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { commitResume, getResume, rewritePreview, waitForJob } from '../api/resumeSync'
import { useNotification } from '../context/useNotification'
import SectionCard from '../components/SectionCard'
import ResumeSheet from '../components/ResumeSheet'
import { useWorkspace } from '../context/useWorkspace'
import type { ResumeDocument } from '../types/resume'

type ReviewStepProps = {
  onNext: () => void
  onBack: () => void
}

function ReviewStep({ onNext }: ReviewStepProps) {
  const { addNotification } = useNotification()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeRewritePath, setActiveRewritePath] = useState<string | null>(null)
  const [rewriteHistory, setRewriteHistory] = useState<Record<string, string[]>>({})
  const [removedSkillsHistory, setRemovedSkillsHistory] = useState<string[]>([])

  const {
    draftResume,
    generatedResumeId,
    masterResume,
    tailoringMode,
    targetRole,
    targetCompany,
    jobDescription,
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

  function buildRewriteInstruction(kind: 'summary' | 'bullet point') {
    const targetBits = [targetRole, targetCompany ? `at ${targetCompany}` : ''].filter(Boolean).join(' ')
    const targetContext = targetBits || 'the current target'
    const modeContext = tailoringMode === 'sniper'
      ? 'Make it sharper, more ATS-focused, and more directly aligned.'
      : 'Make it polished, clear, and broadly professional.'
    const jobContext = jobDescription?.trim()
      ? `If useful, lean on this job description context: ${jobDescription.trim()}`
      : ''

    if (kind === 'summary') {
      return [
        `Rewrite this professional summary as a single strong paragraph for ${targetContext}.`,
        'Preserve the original facts, metrics, and dates if any are mentioned.',
        modeContext,
        jobContext,
      ].filter(Boolean).join(' ')
    }

    return [
      `Rewrite this resume bullet for ${targetContext}.`,
      'Keep the meaning intact while making it more concise, compelling, and specific.',
      'Preserve numbers, dates, and factual details.',
      modeContext,
      jobContext,
    ].filter(Boolean).join(' ')
  }

  function applyRewrite(document: ResumeDocument, path: string, nextText: string): ResumeDocument {
    if (path === 'summary') {
      return { ...document, summary: nextText }
    }

    const match = path.match(/^experience\[(\d+)\]\.bullets\[(\d+)\]$/)
    if (match) {
      const expIndex = Number(match[1])
      const bulletIndex = Number(match[2])
      const nextExperience = document.experience.map((entry, index) => {
        if (index !== expIndex) {
          return entry
        }

        return {
          ...entry,
          bullets: entry.bullets.map((bullet, idx) => (idx === bulletIndex ? nextText : bullet)),
        }
      })

      return {
        ...document,
        experience: nextExperience,
      }
    }

    const roleMatch = path.match(/^experience\[(\d+)\]\.(role|company)$/)
    if (!roleMatch) {
      return document
    }

    const expIndex = Number(roleMatch[1])
    const field = roleMatch[2] as 'role' | 'company'
    const nextExperience = document.experience.map((entry, index) => {
      if (index !== expIndex) return entry
      return {
        ...entry,
        [field]: nextText,
      }
    })

    return {
      ...document,
      experience: nextExperience,
    }
  }

  function getCurrentValue(document: ResumeDocument, path: string): string | null {
    if (path === 'summary') {
      return document.summary
    }
    const match = path.match(/^experience\[(\d+)\]\.bullets\[(\d+)\]$/)
    if (match) {
      const expIndex = Number(match[1])
      const bulletIndex = Number(match[2])
      const entry = document.experience[expIndex]
      if (!entry) return null
      return entry.bullets[bulletIndex] ?? null
    }
    const roleMatch = path.match(/^experience\[(\d+)\]\.(role|company)$/)
    if (roleMatch) {
      const expIndex = Number(roleMatch[1])
      const field = roleMatch[2] as 'role' | 'company'
      const entry = document.experience[expIndex]
      if (!entry) return null
      return entry[field]
    }
    return null
  }

  function handleInlineEdit(path: string, value: string) {
    if (!draftResume) return
    const nextValue = value
    const currentValue = getCurrentValue(draftResume, path)
    if (currentValue === null || currentValue === nextValue) return
    setDraftResume(applyRewrite(draftResume, path, nextValue))
  }

  async function handleRewriteTarget(target: { path: string; text: string; label: string }) {
    if (!draftResume) {
      return
    }

    setActiveRewritePath(target.path)
    try {
      const response = await rewritePreview({
        text: target.text,
        instruction: buildRewriteInstruction(target.label === 'summary' ? 'summary' : 'bullet point'),
        mode: tailoringMode,
      })

      const currentValue = getCurrentValue(draftResume, target.path)
      const rewrittenText = response.rewritten_text.trim()
      if (currentValue && rewrittenText && rewrittenText !== currentValue) {
        setRewriteHistory((current) => ({
          ...current,
          [target.path]: [...(current[target.path] ?? []), currentValue],
        }))
      }

      const nextDocument = applyRewrite(draftResume, target.path, rewrittenText)
      setDraftResume(nextDocument)
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Rewrite Failed',
        description: error instanceof Error ? error.message : 'Unable to rewrite this part of the resume.',
      })
    } finally {
      setActiveRewritePath(null)
    }
  }

  function canUndoPath(path: string) {
    return (rewriteHistory[path]?.length ?? 0) > 0
  }

  function handleUndo(path: string) {
    if (!draftResume) {
      return
    }

    const history = rewriteHistory[path] ?? []
    const previousValue = history[history.length - 1]
    if (!previousValue) {
      return
    }

    setDraftResume(applyRewrite(draftResume, path, previousValue))
    setRewriteHistory((current) => ({
      ...current,
      [path]: (current[path] ?? []).slice(0, -1),
    }))
  }

  function handleRemoveSkill(index: number) {
    if (!draftResume) {
      return
    }

    const removedSkill = draftResume.skills[index]
    if (removedSkill) {
      setRemovedSkillsHistory((current) => [...current, removedSkill])
    }
    const nextSkills = draftResume.skills.filter((_, skillIndex) => skillIndex !== index)
    setDraftResume({
      ...draftResume,
      skills: nextSkills,
    })
  }

  function handleUndoSkillRemoval() {
    if (!draftResume) {
      return
    }
    const previousSkill = removedSkillsHistory[removedSkillsHistory.length - 1]
    if (!previousSkill) {
      return
    }
    setDraftResume({
      ...draftResume,
      skills: [...draftResume.skills, previousSkill],
    })
    setRemovedSkillsHistory((current) => current.slice(0, -1))
  }

  function handleAddSkill(skill: string) {
    if (!draftResume) {
      return
    }
    if (draftResume.skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
      addNotification({
        type: 'info',
        message: 'Skill already present',
        description: `"${skill}" is already in your skills list.`,
      })
      return
    }
    setDraftResume({
      ...draftResume,
      skills: [...draftResume.skills, skill],
    })
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
        {originalDocument && (
          <SectionCard className="review-panel">
            <ResumeSheet
              document={originalDocument}
              title="Master Resume"
              subtitle="Uploaded document data"
            />
          </SectionCard>
        )}

      
        <SectionCard className="review-panel" style={{ border: '1px solid var(--color-success-soft, #dcfce7)' }}>
          <ResumeSheet
            document={workingDocument}
            isLoading={isGenerating}
            title="Tailored Resume"
            subtitle="AI enhanced for target role"
            activeRewritePath={activeRewritePath}
            canUndoPath={canUndoPath}
            onUndo={handleUndo}
            onAddSkill={handleAddSkill}
            canUndoSkillRemoval={removedSkillsHistory.length > 0}
            onUndoSkillRemoval={handleUndoSkillRemoval}
            onRemoveSkill={(skill, index) => {
              void skill
              handleRemoveSkill(index)
            }}
            onRewrite={(target) => void handleRewriteTarget(target)}
            onInlineEdit={handleInlineEdit}
          />

        </SectionCard>
      </div>
    </div>
  )
}

export default ReviewStep

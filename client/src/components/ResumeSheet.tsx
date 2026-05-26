import { useLayoutEffect, useRef, useState } from 'react'
import type { ResumeDocument } from '../types/resume'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPlus, faRotateLeft, faSpinner, faWandMagicSparkles, faXmark } from '@fortawesome/free-solid-svg-icons'

type RewriteTarget = {
  path: string
  text: string
  label: string
}

type ResumeSheetProps = {
  document: ResumeDocument | null
  title?: string
  subtitle?: string
  isLoading?: boolean
  activeRewritePath?: string | null
  canUndoPath?: (path: string) => boolean
  onUndo?: (path: string) => void
  onRewrite?: (target: RewriteTarget) => void
  onRemoveSkill?: (skill: string, index: number) => void
  onAddSkill?: (skill: string) => void
  canUndoSkillRemoval?: boolean
  onUndoSkillRemoval?: () => void
  onInlineEdit?: (path: string, value: string) => void
}

type EditableTextProps = {
  value: string
  path: string
  className?: string
  multiline?: boolean
  commitOnChange?: boolean
  onInlineEdit?: (path: string, value: string) => void
}

function EditableText({ value, path, className, multiline, commitOnChange, onInlineEdit }: EditableTextProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function resizeTextarea(element: HTMLTextAreaElement) {
    element.style.height = '0px'
    element.style.height = `${element.scrollHeight}px`
  }

  useLayoutEffect(() => {
    if (multiline && textareaRef.current) {
      if (textareaRef.current.value !== value) {
        textareaRef.current.value = value
      }
      resizeTextarea(textareaRef.current)
    }
    if (!multiline && inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value
    }
  }, [multiline, value])

  function commitIfChanged(nextRawValue: string) {
    const originalValue = value
    if (!onInlineEdit || nextRawValue === originalValue) {
      return
    }
    onInlineEdit(path, nextRawValue)
  }

  if (!onInlineEdit) {
    return <span className={className}>{value}</span>
  }

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        className={`${className ?? ''} resume-sheet__inline-editor resume-sheet__inline-editor--multiline`.trim()}
        defaultValue={value}
        onChange={(event) => {
          resizeTextarea(event.currentTarget)
          if (commitOnChange && onInlineEdit) {
            onInlineEdit(path, event.currentTarget.value)
          }
        }}
        onBlur={(event) => {
          if (!commitOnChange) {
            commitIfChanged(event.currentTarget.value)
          }
        }}
        rows={3}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.currentTarget.value = value
            resizeTextarea(event.currentTarget)
            event.currentTarget.blur()
          }
        }}
      />
    )
  }

  return (
      <input
      ref={inputRef}
      className={`${className ?? ''} resume-sheet__inline-editor`.trim()}
      defaultValue={value}
      onBlur={(event) => commitIfChanged(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          ;(event.currentTarget as HTMLInputElement).blur()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.currentTarget.value = value
          ;(event.currentTarget as HTMLInputElement).blur()
        }
      }}
    />
  )
}

function ResumeSheet({
  document,
  title,
  subtitle,
  isLoading,
  activeRewritePath,
  canUndoPath,
  onUndo,
  onRewrite,
  onRemoveSkill,
  onAddSkill,
  canUndoSkillRemoval,
  onUndoSkillRemoval,
  onInlineEdit,
}: ResumeSheetProps) {
  const [isAddingSkill, setIsAddingSkill] = useState(false)
  const [newSkill, setNewSkill] = useState('')

  if (!document) {
    return (
      <div className="resume-sheet" style={{ display: 'grid', placeItems: 'center', color: '#cbd5e0' }}>
        <p>No draft data available to preview.</p>
      </div>
    )
  }

  function handleAddSkill() {
    const value = newSkill.trim()
    if (!value || !onAddSkill) {
      return
    }
    onAddSkill(value)
    setNewSkill('')
    setIsAddingSkill(false)
  }

  return (
    <div className={`resume-sheet ${isLoading ? 'is-loading' : ''}`}>
      <header className="resume-sheet__header">
        <h2 className="resume-sheet__title">{title || 'Resume Preview'}</h2>
        <p className="resume-sheet__subtitle">{subtitle || 'Document Preview'}</p>
      </header>

      <div className="resume-sheet__body">
        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Professional Summary</h3>
          <div className="resume-sheet__rewrite-target">
            <EditableText
              value={document.summary}
              path="summary"
              className="resume-sheet__summary-text"
              multiline
              onInlineEdit={onInlineEdit}
            />
          </div>
        </section>

        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Experience</h3>
          {document.experience.map((exp, idx) => (
            <div className="resume-sheet__experience-item" key={idx}>
              <div className="resume-sheet__role-row">
                <EditableText
                  value={exp.role}
                  path={`experience[${idx}].role`}
                  className="resume-sheet__inline-strong"
                  onInlineEdit={onInlineEdit}
                />
                <EditableText
                  value={exp.company}
                  path={`experience[${idx}].company`}
                  className="resume-sheet__inline-company"
                  onInlineEdit={onInlineEdit}
                />
              </div>
              {(exp.start_date || exp.end_date) ? (
                <p className="resume-sheet__date-line">
                  {[exp.start_date, exp.end_date].filter(Boolean).join(' - ')}
                </p>
              ) : null}
              <ul className="resume-sheet__bullets">
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="resume-sheet__bullet-item">
                    <div className="resume-sheet__bullet-row">
                      <EditableText
                        value={bullet}
                        path={`experience[${idx}].bullets[${bIdx}]`}
                        className="resume-sheet__bullet-text"
                        multiline
                        commitOnChange
                        onInlineEdit={onInlineEdit}
                      />
                    </div>
                    {onRewrite ? (
                      <div className="resume-sheet__bullet-actions">
                        <button
                          className="resume-sheet__rewrite-button resume-sheet__rewrite-button--inline"
                          onClick={() =>
                            onRewrite({
                              path: `experience[${idx}].bullets[${bIdx}]`,
                              text: bullet,
                              label: 'bullet point',
                            })
                          }
                          type="button"
                          aria-label="Suggest replacement for bullet point"
                        >
                          {activeRewritePath === `experience[${idx}].bullets[${bIdx}]` ? (
                            <FontAwesomeIcon icon={faSpinner} spin />
                          ) : (
                            <FontAwesomeIcon icon={faWandMagicSparkles} />
                          )}
                          <span>{activeRewritePath === `experience[${idx}].bullets[${bIdx}]` ? 'Rewriting' : 'Suggest replacement'}</span>
                        </button>
                        {canUndoPath?.(`experience[${idx}].bullets[${bIdx}]`) && onUndo ? (
                          <button
                            className="resume-sheet__rewrite-button resume-sheet__rewrite-button--undo"
                            onClick={() => onUndo(`experience[${idx}].bullets[${bIdx}]`)}
                            type="button"
                            aria-label="Undo previous rewrite"
                          >
                            <FontAwesomeIcon icon={faRotateLeft} />
                            <span>Undo</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Skills</h3>
          {onRemoveSkill ? (
            <div className="resume-sheet__skills-list">
              {document.skills.map((skill, index) => (
                <button
                  key={`${skill}-${index}`}
                  className="resume-sheet__skill-chip"
                  onClick={() => onRemoveSkill(skill, index)}
                  type="button"
                  aria-label={`Remove skill ${skill}`}
                  title={`Remove ${skill}`}
                >
                  <span>{skill}</span>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              ))}
              {isAddingSkill ? (
                <div className="resume-sheet__skill-chip resume-sheet__skill-chip--editor">
                  <input
                    className="resume-sheet__skill-input"
                    value={newSkill}
                    onChange={(event) => setNewSkill(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddSkill()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setIsAddingSkill(false)
                        setNewSkill('')
                      }
                    }}
                    placeholder="New skill"
                    autoFocus
                  />
                  <button
                    className="resume-sheet__skill-action"
                    onClick={handleAddSkill}
                    type="button"
                    aria-label="Add skill"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button
                    className="resume-sheet__skill-action"
                    onClick={() => {
                      setIsAddingSkill(false)
                      setNewSkill('')
                    }}
                    type="button"
                    aria-label="Cancel adding skill"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <button
                  className="resume-sheet__skill-chip resume-sheet__skill-chip--add"
                  onClick={() => setIsAddingSkill(true)}
                  type="button"
                  aria-label="Add skill"
                >
                  <span>Add skill</span>
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
              {canUndoSkillRemoval && onUndoSkillRemoval ? (
                <button
                  className="resume-sheet__skill-chip resume-sheet__skill-chip--undo"
                  onClick={onUndoSkillRemoval}
                  type="button"
                  aria-label="Undo removed skill"
                >
                  <span>Undo remove</span>
                  <FontAwesomeIcon icon={faRotateLeft} />
                </button>
              ) : null}
            </div>
          ) : (
            <p>{document.skills.join(' • ')}</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default ResumeSheet

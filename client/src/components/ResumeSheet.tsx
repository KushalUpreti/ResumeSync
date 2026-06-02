import { useLayoutEffect, useRef, useState } from "react";
import type { ResumeDocument } from "../types/resume";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faPlus,
  faRotateLeft,
  faSpinner,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

type RewriteTarget = {
  path: string;
  text: string;
  label: string;
};

type RewriteButtonProps = {
  path: string;
  label: string;
  text: string;
  activeRewritePath?: string | null;
  onRewrite?: (target: RewriteTarget) => void;
  compact?: boolean;
};

function RewriteButton({
  path,
  label,
  text,
  activeRewritePath,
  onRewrite,
  compact,
}: RewriteButtonProps) {
  if (!onRewrite) {
    return null;
  }

  return (
    <button
      className={`resume-sheet__rewrite-button ${
        compact
          ? "resume-sheet__rewrite-button--tooltip"
          : "resume-sheet__rewrite-button--floating resume-sheet__rewrite-button--summary"
      }`}
      onClick={() => onRewrite({ path, text, label })}
      type="button"
      aria-label={`AI rewrite ${label}`}
      title={`AI rewrite ${label}`}
    >
      {activeRewritePath === path ? (
        <FontAwesomeIcon icon={faSpinner} spin />
      ) : (
        <FontAwesomeIcon icon={faWandMagicSparkles} />
      )}
      {compact ? null : (
        <span>{activeRewritePath === path ? "Rewriting" : "AI rewrite"}</span>
      )}
    </button>
  );
}

type ResumeSheetProps = {
  document: ResumeDocument | null;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  activeRewritePath?: string | null;
  canUndoPath?: (path: string) => boolean;
  onUndo?: (path: string) => void;
  onRewrite?: (target: RewriteTarget) => void;
  onRemoveSkill?: (categoryIndex: number, skillIndex: number) => void;
  onAddSkill?: (categoryName: string, skill: string) => void;
  canUndoSkillRemoval?: boolean;
  undoSkillRemovalCategoryIndex?: number | null;
  onUndoSkillRemoval?: () => void;
  onInlineEdit?: (path: string, value: string) => void;
};

type EditableTextProps = {
  value: string;
  path: string;
  className?: string;
  multiline?: boolean;
  commitOnChange?: boolean;
  onInlineEdit?: (path: string, value: string) => void;
};

function isDateField(path: string) {
  return /(?:start_date|end_date|date_obtained)$/.test(path);
}

function EditableText({
  value,
  path,
  className,
  multiline,
  commitOnChange,
  onInlineEdit,
}: EditableTextProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function resizeTextarea(element: HTMLTextAreaElement) {
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }

  useLayoutEffect(() => {
    if (multiline && textareaRef.current) {
      if (textareaRef.current.value !== value) {
        textareaRef.current.value = value;
      }
      resizeTextarea(textareaRef.current);
    }
    if (!multiline && inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [multiline, value]);

  function commitIfChanged(nextRawValue: string) {
    const originalValue = value;
    if (!onInlineEdit || nextRawValue === originalValue) {
      return;
    }
    onInlineEdit(path, nextRawValue);
  }

  if (!onInlineEdit) {
    return <span className={className}>{value}</span>;
  }

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        className={`${className ?? ""} resume-sheet__inline-editor resume-sheet__inline-editor--multiline${isDateField(path) ? " resume-sheet__inline-editor--date" : ""}`.trim()}
        defaultValue={value}
        onChange={(event) => {
          resizeTextarea(event.currentTarget);
          if (commitOnChange && onInlineEdit) {
            onInlineEdit(path, event.currentTarget.value);
          }
        }}
        onBlur={(event) => {
          if (!commitOnChange) {
            commitIfChanged(event.currentTarget.value);
          }
        }}
        rows={1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.value = value;
            resizeTextarea(event.currentTarget);
            event.currentTarget.blur();
          }
        }}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      className={`${className ?? ""} resume-sheet__inline-editor${isDateField(path) ? " resume-sheet__inline-editor--date" : ""}`.trim()}
      defaultValue={value}
      onBlur={(event) => commitIfChanged(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          (event.currentTarget as HTMLInputElement).blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.value = value;
          (event.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
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
  undoSkillRemovalCategoryIndex,
  onUndoSkillRemoval,
  onInlineEdit,
}: ResumeSheetProps) {
  const [addingSkillToCategory, setAddingSkillToCategory] = useState<
    string | null
  >(null);
  const [newSkill, setNewSkill] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  if (!document) {
    return (
      <div
        className="resume-sheet"
        style={{ display: "grid", placeItems: "center", color: "#cbd5e0" }}
      >
        <p>No draft data available to preview.</p>
      </div>
    );
  }

  function handleAddSkill(categoryName: string) {
    const value = newSkill.trim();
    if (!value || !onAddSkill) {
      return;
    }
    onAddSkill(categoryName, value);
    setNewSkill("");
    setAddingSkillToCategory(null);
  }

  function handleAddNewCategory() {
    const cat = newCategoryName.trim();
    const val = newSkill.trim();
    if (!cat || !val || !onAddSkill) return;
    onAddSkill(cat, val);
    setNewCategoryName("");
    setNewSkill("");
    setAddingSkillToCategory(null);
  }

  return (
    <div className={`resume-sheet ${isLoading ? "is-loading" : ""}`}>
      <header className="resume-sheet__header">
        <h2 className="resume-sheet__title">{title || "Resume Preview"}</h2>
        <p className="resume-sheet__subtitle">
          {subtitle || "Document Preview"}
        </p>
      </header>

      <div className="resume-sheet__body">
        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Contact</h3>
          <div
            className="resume-sheet__contact-line"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 8px",
              alignItems: "center",
            }}
          >
            <EditableText
              value={document.full_name}
              path="contact.full_name"
              className="resume-sheet__inline-name"
              onInlineEdit={onInlineEdit}
            />
            <span>|</span>
            <EditableText
              value={document.email}
              path="contact.email"
              className="resume-sheet__inline-company"
              onInlineEdit={onInlineEdit}
            />
            <span>|</span>
            <EditableText
              value={document.phone}
              path="contact.phone"
              className="resume-sheet__inline-company"
              onInlineEdit={onInlineEdit}
            />
            {document.links.map((link, linkIndex) => (
              <span key={linkIndex} style={{ display: "contents" }}>
                <span>|</span>
                <EditableText
                  value={link}
                  path={`contact.links[${linkIndex}]`}
                  className="resume-sheet__inline-company"
                  onInlineEdit={onInlineEdit}
                />
              </span>
            ))}
          </div>
        </section>

        <section className="resume-sheet__section">
          <div className="resume-sheet__section-heading">
            <h3 className="resume-sheet__section-title">
              Professional Summary
            </h3>
            <RewriteButton
              path="summary"
              label="summary"
              text={document.summary}
              activeRewritePath={activeRewritePath}
              onRewrite={onRewrite}
            />
          </div>
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
              {exp.start_date || exp.end_date ? (
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={exp.start_date ?? ""}
                    path={`experience[${idx}].start_date`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                  <span> - </span>
                  <EditableText
                    value={exp.end_date ?? ""}
                    path={`experience[${idx}].end_date`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
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
                              label: "bullet point",
                            })
                          }
                          type="button"
                          aria-label="Suggest replacement for bullet point"
                        >
                          {activeRewritePath ===
                          `experience[${idx}].bullets[${bIdx}]` ? (
                            <FontAwesomeIcon icon={faSpinner} spin />
                          ) : (
                            <FontAwesomeIcon icon={faWandMagicSparkles} />
                          )}
                          <span>
                            {activeRewritePath ===
                            `experience[${idx}].bullets[${bIdx}]`
                              ? "Rewriting"
                              : "Suggest replacement"}
                          </span>
                        </button>
                        {canUndoPath?.(`experience[${idx}].bullets[${bIdx}]`) &&
                        onUndo ? (
                          <button
                            className="resume-sheet__rewrite-button resume-sheet__rewrite-button--undo"
                            onClick={() =>
                              onUndo(`experience[${idx}].bullets[${bIdx}]`)
                            }
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

        {document.education && document.education.length > 0 && (
          <section className="resume-sheet__section">
            <h3 className="resume-sheet__section-title">Education</h3>
            {document.education.map((edu, idx) => (
              <div className="resume-sheet__experience-item" key={idx}>
                <div className="resume-sheet__role-row">
                  <EditableText
                    value={edu.degree}
                    path={`education[${idx}].degree`}
                    className="resume-sheet__inline-strong resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                  <EditableText
                    value={edu.institution}
                    path={`education[${idx}].institution`}
                    className="resume-sheet__inline-company"
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={edu.field_of_study ?? ""}
                    path={`education[${idx}].field_of_study`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                </p>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={edu.start_date ?? ""}
                    path={`education[${idx}].start_date`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                  <span> - </span>
                  <EditableText
                    value={edu.end_date ?? ""}
                    path={`education[${idx}].end_date`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                </p>
                <p className="resume-sheet__date-line">
                  <span>GPA: </span>
                  <EditableText
                    value={edu.gpa ?? ""}
                    path={`education[${idx}].gpa`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                </p>
                <EditableText
                  value={edu.description ?? ""}
                  path={`education[${idx}].description`}
                  className="resume-sheet__summary-text"
                  multiline
                  onInlineEdit={onInlineEdit}
                />
              </div>
            ))}
          </section>
        )}

        {document.projects && document.projects.length > 0 && (
          <section className="resume-sheet__section">
            <h3 className="resume-sheet__section-title">Projects</h3>
            {document.projects.map((proj, idx) => (
              <div className="resume-sheet__experience-item" key={idx}>
                <div className="resume-sheet__role-row">
                  <EditableText
                    value={proj.name}
                    path={`projects[${idx}].name`}
                    className="resume-sheet__inline-strong"
                    onInlineEdit={onInlineEdit}
                  />
                  <EditableText
                    value={proj.role ?? ""}
                    path={`projects[${idx}].role`}
                    className="resume-sheet__inline-company"
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={proj.start_date ?? ""}
                    path={`projects[${idx}].start_date`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                  <span> - </span>
                  <EditableText
                    value={proj.end_date ?? ""}
                    path={`projects[${idx}].end_date`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                </p>
                {proj.technologies && proj.technologies.length > 0 ? (
                  <p className="resume-sheet__date-line">
                    Technologies: {proj.technologies.join(", ")}
                  </p>
                ) : null}
                <div className="resume-sheet__rewrite-target">
                  {onRewrite ? (
                    <div className="resume-sheet__bullet-actions">
                      <button
                        className="resume-sheet__rewrite-button resume-sheet__rewrite-button--inline"
                        onClick={() =>
                          onRewrite({
                            path: `projects[${idx}].description`,
                            text: proj.description ?? "",
                            label: "project description",
                          })
                        }
                        type="button"
                        aria-label="Suggest replacement for project description"
                      >
                        {activeRewritePath ===
                        `projects[${idx}].description` ? (
                          <FontAwesomeIcon icon={faSpinner} spin />
                        ) : (
                          <FontAwesomeIcon icon={faWandMagicSparkles} />
                        )}
                        <span>
                          {activeRewritePath ===
                          `projects[${idx}].description`
                            ? "Rewriting"
                            : "Suggest replacement"}
                        </span>
                      </button>
                    </div>
                  ) : null}
                  <EditableText
                    value={proj.description ?? ""}
                    path={`projects[${idx}].description`}
                    className="resume-sheet__summary-text"
                    multiline
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <ul className="resume-sheet__bullets">
                  {proj.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="resume-sheet__bullet-item">
                      <div className="resume-sheet__bullet-row">
                        <EditableText
                          value={bullet}
                          path={`projects[${idx}].bullets[${bIdx}]`}
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
                                path: `projects[${idx}].bullets[${bIdx}]`,
                                text: bullet,
                                label: "bullet point",
                              })
                            }
                            type="button"
                            aria-label="Suggest replacement for project bullet point"
                          >
                            {activeRewritePath ===
                            `projects[${idx}].bullets[${bIdx}]` ? (
                              <FontAwesomeIcon icon={faSpinner} spin />
                            ) : (
                              <FontAwesomeIcon icon={faWandMagicSparkles} />
                            )}
                            <span>
                              {activeRewritePath ===
                              `projects[${idx}].bullets[${bIdx}]`
                                ? "Rewriting"
                                : "Suggest replacement"}
                            </span>
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {document.certifications && document.certifications.length > 0 && (
          <section className="resume-sheet__section">
            <h3 className="resume-sheet__section-title">Certifications</h3>
            {document.certifications.map((cert, idx) => (
              <div className="resume-sheet__experience-item" key={idx}>
                <div className="resume-sheet__role-row">
                  <EditableText
                    value={cert.name}
                    path={`certifications[${idx}].name`}
                    className="resume-sheet__inline-strong"
                    onInlineEdit={onInlineEdit}
                  />
                  <EditableText
                    value={cert.issuer ?? ""}
                    path={`certifications[${idx}].issuer`}
                    className="resume-sheet__inline-company"
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={cert.date_obtained ?? ""}
                    path={`certifications[${idx}].date_obtained`}
                    className="resume-sheet__inline-left"
                    onInlineEdit={onInlineEdit}
                  />
                </p>
              </div>
            ))}
          </section>
        )}
        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Skills</h3>
          <div
            className="resume-sheet__skills-container"
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {document.skills.map((skillCategory, catIndex) => (
              <div
                key={skillCategory.category}
                className="resume-sheet__skill-category"
              >
                <h4
                  className="resume-sheet__inline-strong"
                  style={{
                    marginBottom: "8px",
                    fontSize: "0.9em",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {skillCategory.category}
                </h4>
                {onRemoveSkill ? (
                  <div className="resume-sheet__skills-list">
                    {skillCategory.items.map((skill, skillIndex) => (
                      <button
                        key={`${skill}-${skillIndex}`}
                        className="resume-sheet__skill-chip"
                        onClick={() => onRemoveSkill(catIndex, skillIndex)}
                        type="button"
                        aria-label={`Remove skill ${skill}`}
                        title={`Remove ${skill}`}
                      >
                        <span>{skill}</span>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    ))}
                    {addingSkillToCategory === skillCategory.category ? (
                      <div className="resume-sheet__skill-chip resume-sheet__skill-chip--editor">
                        <input
                          className="resume-sheet__skill-input"
                          value={newSkill}
                          onChange={(event) => setNewSkill(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleAddSkill(skillCategory.category);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setAddingSkillToCategory(null);
                              setNewSkill("");
                            }
                          }}
                          placeholder="New skill"
                          autoFocus
                        />
                        <button
                          className="resume-sheet__skill-action"
                          onClick={() => handleAddSkill(skillCategory.category)}
                          type="button"
                          aria-label="Add skill"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button
                          className="resume-sheet__skill-action"
                          onClick={() => {
                            setAddingSkillToCategory(null);
                            setNewSkill("");
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
                        onClick={() =>
                          setAddingSkillToCategory(skillCategory.category)
                        }
                        type="button"
                        aria-label="Add skill"
                      >
                        <span>Add skill</span>
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    )}
                    {canUndoSkillRemoval &&
                    onUndoSkillRemoval &&
                    undoSkillRemovalCategoryIndex === catIndex ? (
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
                  <p>{skillCategory.items.join(" • ")}</p>
                )}
              </div>
            ))}

            {/* Add new category block */}
            {onAddSkill && (
              <div
                className="resume-sheet__skill-category"
                style={{ marginTop: "8px" }}
              >
                {addingSkillToCategory === "NEW_CATEGORY" ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      className="resume-sheet__inline-editor"
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.9em",
                        maxWidth: "150px",
                      }}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      autoFocus
                    />
                    <div className="resume-sheet__skill-chip resume-sheet__skill-chip--editor">
                      <input
                        className="resume-sheet__skill-input"
                        value={newSkill}
                        onChange={(event) => setNewSkill(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddNewCategory();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setAddingSkillToCategory(null);
                            setNewCategoryName("");
                            setNewSkill("");
                          }
                        }}
                        placeholder="New skill"
                      />
                      <button
                        className="resume-sheet__skill-action"
                        onClick={handleAddNewCategory}
                        type="button"
                        aria-label="Add category and skill"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                      <button
                        className="resume-sheet__skill-action"
                        onClick={() => {
                          setAddingSkillToCategory(null);
                          setNewCategoryName("");
                          setNewSkill("");
                        }}
                        type="button"
                        aria-label="Cancel"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="button button--ghost"
                    style={{ fontSize: "0.9em", padding: "4px 8px" }}
                    onClick={() => setAddingSkillToCategory("NEW_CATEGORY")}
                    type="button"
                  >
                    <FontAwesomeIcon
                      icon={faPlus}
                      style={{ marginRight: "6px" }}
                    />
                    Add Category
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ResumeSheet;

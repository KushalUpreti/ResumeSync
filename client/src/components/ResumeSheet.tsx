import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ResumeDocument } from "../types/resume";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faPlus,
  faGripVertical,
  faTrashCan,
  faRotateLeft,
  faSpinner,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  defaultAnimateLayoutChanges,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  showEmptyPlaceholders?: boolean;
  activeRewritePath?: string | null;
  canUndoPath?: (path: string) => boolean;
  onUndo?: (path: string) => void;
  onRewrite?: (target: RewriteTarget) => void;
  onReorderBullet?: (
    section: "experience" | "projects",
    entryIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => void;
  onDeleteBullet?: (
    section: "experience" | "projects",
    entryIndex: number,
    bulletIndex: number,
  ) => void;
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
  placeholder?: string;
  onInlineEdit?: (path: string, value: string) => void;
};

function isDateField(path: string) {
  return /(?:start_date|end_date|date_obtained)$/.test(path);
}

function getPlaceholder(path: string) {
  if (path === "contact.full_name") return "Add name";
  if (path === "contact.email") return "Add email";
  if (path === "contact.phone") return "Add phone";
  if (path.startsWith("contact.links[")) return "Add link";

  if (/^experience\[\d+\]\.role$/.test(path)) return "Add role";
  if (/^experience\[\d+\]\.company$/.test(path)) return "Add company";
  if (/^experience\[\d+\]\.(start_date|end_date)$/.test(path)) return "Add date";

  if (/^education\[\d+\]\.degree$/.test(path)) return "Add degree";
  if (/^education\[\d+\]\.institution$/.test(path)) return "Add school";
  if (/^education\[\d+\]\.field_of_study$/.test(path)) return "Add major";
  if (/^education\[\d+\]\.start_date$/.test(path)) return "Add start date";
  if (/^education\[\d+\]\.end_date$/.test(path)) return "Add end date";
  if (/^education\[\d+\]\.gpa$/.test(path)) return "Add GPA";
  if (/^education\[\d+\]\.description$/.test(path)) return "Add details";

  if (/^projects\[\d+\]\.name$/.test(path)) return "Add project name";
  if (/^projects\[\d+\]\.role$/.test(path)) return "Add role";
  if (/^projects\[\d+\]\.description$/.test(path)) return "Add project summary";
  if (/^projects\[\d+\]\.(start_date|end_date)$/.test(path)) return "Add date";
  if (/^projects\[\d+\]\.bullets\[\d+\]$/.test(path)) return "Add bullet";

  if (/^certifications\[\d+\]\.name$/.test(path)) return "Add certification";
  if (/^certifications\[\d+\]\.issuer$/.test(path)) return "Add issuer";
  if (/^certifications\[\d+\]\.date_obtained$/.test(path)) return "Add date";

  if (path === "summary") return "Add summary";
  if (path.includes(".bullets[")) return "Add bullet";
  return "Add content";
}

function EditableText({
  value,
  path,
  className,
  multiline,
  commitOnChange,
  placeholder,
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
        placeholder={placeholder}
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
      placeholder={placeholder}
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

type BulletSection = "experience" | "projects";

type SortableBulletItemProps = {
  id: string;
  section: BulletSection;
  entryIndex: number;
  bulletIndex: number;
  bullet: string;
  activeRewritePath?: string | null;
  canUndoPath?: (path: string) => boolean;
  onUndo?: (path: string) => void;
  onRewrite?: (target: RewriteTarget) => void;
  onInlineEdit?: (path: string, value: string) => void;
  onDeleteBullet?: (
    section: BulletSection,
    entryIndex: number,
    bulletIndex: number,
  ) => void;
  showEmptyPlaceholders?: boolean;
};

function SortableBulletItem({
  id,
  section,
  entryIndex,
  bulletIndex,
  bullet,
  activeRewritePath,
  canUndoPath,
  onUndo,
  onRewrite,
  onInlineEdit,
  onDeleteBullet,
  showEmptyPlaceholders,
}: SortableBulletItemProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { section, entryIndex, bulletIndex },
    animateLayoutChanges: (args) =>
      args.isSorting ? defaultAnimateLayoutChanges(args) : false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? "transform 170ms cubic-bezier(0.22, 1, 0.36, 1)"
      : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      className={`resume-sheet__bullet-item${isDragging ? " is-dragging" : ""}`}
      style={style}
    >
      <div className="resume-sheet__bullet-row">
        <div className="resume-sheet__bullet-controls">
          <button
            ref={setActivatorNodeRef}
            className="resume-sheet__drag-handle"
            type="button"
            aria-label="Drag to reorder bullet"
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <FontAwesomeIcon icon={faGripVertical} />
          </button>
          {onDeleteBullet ? (
            <button
              className="resume-sheet__delete-bullet"
              type="button"
              aria-label="Delete bullet"
              title="Delete bullet"
              onClick={() => onDeleteBullet(section, entryIndex, bulletIndex)}
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
          ) : null}
        </div>
        <EditableText
          value={bullet}
          path={`${section}[${entryIndex}].bullets[${bulletIndex}]`}
          className="resume-sheet__bullet-text"
          multiline
          commitOnChange
          placeholder={
            showEmptyPlaceholders
              ? "Add bullet"
              : undefined
          }
          onInlineEdit={onInlineEdit}
        />
      </div>
      {onRewrite ? (
        <div className="resume-sheet__bullet-actions">
          <button
            className="resume-sheet__rewrite-button resume-sheet__rewrite-button--inline"
            onClick={() =>
              onRewrite({
                path: `${section}[${entryIndex}].bullets[${bulletIndex}]`,
                text: bullet,
                label: "bullet point",
              })
            }
            type="button"
            aria-label="Suggest replacement for bullet point"
          >
            {activeRewritePath ===
            `${section}[${entryIndex}].bullets[${bulletIndex}]` ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            )}
            <span>
              {activeRewritePath ===
              `${section}[${entryIndex}].bullets[${bulletIndex}]`
                ? "Rewriting"
                : "Suggest replacement"}
            </span>
          </button>
          {canUndoPath?.(`${section}[${entryIndex}].bullets[${bulletIndex}]`) &&
          onUndo ? (
            <button
              className="resume-sheet__rewrite-button resume-sheet__rewrite-button--undo"
              onClick={() =>
                onUndo(`${section}[${entryIndex}].bullets[${bulletIndex}]`)
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
  onReorderBullet,
  onDeleteBullet,
  onRemoveSkill,
  onAddSkill,
  canUndoSkillRemoval,
  undoSkillRemovalCategoryIndex,
  onUndoSkillRemoval,
  onInlineEdit,
  showEmptyPlaceholders = false,
}: ResumeSheetProps) {
  const [addingSkillToCategory, setAddingSkillToCategory] = useState<
    string | null
  >(null);
  const [newSkill, setNewSkill] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [suppressBulletControls, setSuppressBulletControls] = useState(false);
  const suppressBulletControlsTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (suppressBulletControlsTimer.current) {
        window.clearTimeout(suppressBulletControlsTimer.current);
      }
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  function handleDragEnd(event: DragEndEvent) {
    setSuppressBulletControls(true);
    if (suppressBulletControlsTimer.current) {
      window.clearTimeout(suppressBulletControlsTimer.current);
    }
    suppressBulletControlsTimer.current = window.setTimeout(() => {
      setSuppressBulletControls(false);
      suppressBulletControlsTimer.current = null;
    }, 180);

    if (!onReorderBullet) {
      return;
    }

    const activeData = event.active.data.current as
      | { section: BulletSection; entryIndex: number; bulletIndex: number }
      | undefined;
    const overData = event.over?.data.current as
      | { section: BulletSection; entryIndex: number; bulletIndex: number }
      | undefined;

    if (
      !activeData ||
      !overData ||
      activeData.section !== overData.section ||
      activeData.entryIndex !== overData.entryIndex ||
      activeData.bulletIndex === overData.bulletIndex
    ) {
      return;
    }

    onReorderBullet(
      activeData.section,
      activeData.entryIndex,
      activeData.bulletIndex,
      overData.bulletIndex,
    );
  }

  return (
    <div
      className={`resume-sheet ${
        isLoading ? "is-loading" : ""
      }${suppressBulletControls ? " resume-sheet--suppress-bullet-controls" : ""}`}
    >
      <header className="resume-sheet__header">
        <h2 className="resume-sheet__title">{title || "Resume Preview"}</h2>
        <p className="resume-sheet__subtitle">
          {subtitle || "Document Preview"}
        </p>
      </header>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={onReorderBullet ? sensors : undefined}
      >
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
              placeholder={showEmptyPlaceholders ? getPlaceholder("contact.full_name") : undefined}
              onInlineEdit={onInlineEdit}
            />
            <span>|</span>
              <EditableText
                value={document.email}
                path="contact.email"
                className="resume-sheet__inline-company"
                placeholder={showEmptyPlaceholders ? getPlaceholder("contact.email") : undefined}
                onInlineEdit={onInlineEdit}
              />
            <span>|</span>
              <EditableText
                value={document.phone}
                path="contact.phone"
                className="resume-sheet__inline-company"
                placeholder={showEmptyPlaceholders ? getPlaceholder("contact.phone") : undefined}
                onInlineEdit={onInlineEdit}
              />
            {document.links.map((link, linkIndex) => (
              <span key={linkIndex} style={{ display: "contents" }}>
                <span>|</span>
                <EditableText
                  value={link}
                  path={`contact.links[${linkIndex}]`}
                  className="resume-sheet__inline-company"
                  placeholder={showEmptyPlaceholders ? getPlaceholder(`contact.links[${linkIndex}]`) : undefined}
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
                placeholder={showEmptyPlaceholders ? getPlaceholder("summary") : undefined}
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
                  placeholder={showEmptyPlaceholders ? getPlaceholder(`experience[${idx}].role`) : undefined}
                  onInlineEdit={onInlineEdit}
                />
                <EditableText
                  value={exp.company}
                  path={`experience[${idx}].company`}
                  className="resume-sheet__inline-company"
                  placeholder={showEmptyPlaceholders ? getPlaceholder(`experience[${idx}].company`) : undefined}
                  onInlineEdit={onInlineEdit}
                />
              </div>
              {exp.start_date || exp.end_date ? (
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={exp.start_date ?? ""}
                    path={`experience[${idx}].start_date`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`experience[${idx}].start_date`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                  <span> - </span>
                  <EditableText
                    value={exp.end_date ?? ""}
                    path={`experience[${idx}].end_date`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`experience[${idx}].end_date`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </p>
              ) : null}
              <SortableContext
                items={exp.bullets.map((_, bIdx) => `experience-${idx}-${bIdx}`)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="resume-sheet__bullets">
                  {exp.bullets.length > 0 ? (
                    exp.bullets.map((bullet, bIdx) => (
                      <SortableBulletItem
                        key={`experience-${idx}-${bIdx}`}
                        id={`experience-${idx}-${bIdx}`}
                        section="experience"
                        entryIndex={idx}
                        bulletIndex={bIdx}
                        bullet={bullet}
                        activeRewritePath={activeRewritePath}
                        canUndoPath={canUndoPath}
                        onUndo={onUndo}
                        onRewrite={onRewrite}
                        onInlineEdit={onInlineEdit}
                        onDeleteBullet={onDeleteBullet}
                        showEmptyPlaceholders={showEmptyPlaceholders}
                      />
                    ))
                  ) : showEmptyPlaceholders ? (
                    <li className="resume-sheet__bullet-item resume-sheet__bullet-item--empty">
                      <div className="resume-sheet__bullet-row">
                        <EditableText
                          value=""
                          path={`experience[${idx}].bullets[0]`}
                          className="resume-sheet__bullet-text"
                          multiline
                          commitOnChange
                          placeholder={getPlaceholder(`experience[${idx}].bullets[0]`)}
                          onInlineEdit={onInlineEdit}
                        />
                      </div>
                    </li>
                  ) : null}
                </ul>
              </SortableContext>
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
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`education[${idx}].degree`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                  <EditableText
                    value={edu.institution}
                    path={`education[${idx}].institution`}
                    className="resume-sheet__inline-company"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`education[${idx}].institution`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={edu.field_of_study ?? ""}
                    path={`education[${idx}].field_of_study`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`education[${idx}].field_of_study`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </p>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={edu.start_date ?? ""}
                    path={`education[${idx}].start_date`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`education[${idx}].start_date`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                  <span> - </span>
                  <EditableText
                    value={edu.end_date ?? ""}
                    path={`education[${idx}].end_date`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`education[${idx}].end_date`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </p>
                <p className="resume-sheet__date-line">
                  <span>GPA: </span>
                  <EditableText
                    value={edu.gpa ?? ""}
                    path={`education[${idx}].gpa`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`education[${idx}].gpa`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </p>
                <EditableText
                  value={edu.description ?? ""}
                  path={`education[${idx}].description`}
                  className="resume-sheet__summary-text"
                  multiline
                  placeholder={showEmptyPlaceholders ? getPlaceholder(`education[${idx}].description`) : undefined}
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
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`projects[${idx}].name`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                  <EditableText
                    value={proj.role ?? ""}
                    path={`projects[${idx}].role`}
                    className="resume-sheet__inline-company"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`projects[${idx}].role`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={proj.start_date ?? ""}
                    path={`projects[${idx}].start_date`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`projects[${idx}].start_date`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                  <span> - </span>
                  <EditableText
                    value={proj.end_date ?? ""}
                    path={`projects[${idx}].end_date`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`projects[${idx}].end_date`) : undefined}
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
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`projects[${idx}].description`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <SortableContext
                  items={proj.bullets.map((_, bIdx) => `projects-${idx}-${bIdx}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="resume-sheet__bullets">
                    {proj.bullets.length > 0 ? (
                      proj.bullets.map((bullet, bIdx) => (
                        <SortableBulletItem
                          key={`projects-${idx}-${bIdx}`}
                          id={`projects-${idx}-${bIdx}`}
                          section="projects"
                          entryIndex={idx}
                          bulletIndex={bIdx}
                          bullet={bullet}
                          activeRewritePath={activeRewritePath}
                          canUndoPath={canUndoPath}
                          onUndo={onUndo}
                          onRewrite={onRewrite}
                          onInlineEdit={onInlineEdit}
                          onDeleteBullet={onDeleteBullet}
                          showEmptyPlaceholders={showEmptyPlaceholders}
                        />
                      ))
                    ) : showEmptyPlaceholders ? (
                      <li className="resume-sheet__bullet-item resume-sheet__bullet-item--empty">
                        <div className="resume-sheet__bullet-row">
                          <EditableText
                            value=""
                            path={`projects[${idx}].bullets[0]`}
                            className="resume-sheet__bullet-text"
                            multiline
                            commitOnChange
                            placeholder={getPlaceholder(`projects[${idx}].bullets[0]`)}
                            onInlineEdit={onInlineEdit}
                          />
                        </div>
                      </li>
                    ) : null}
                  </ul>
                </SortableContext>
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
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`certifications[${idx}].name`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                  <EditableText
                    value={cert.issuer ?? ""}
                    path={`certifications[${idx}].issuer`}
                    className="resume-sheet__inline-company"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`certifications[${idx}].issuer`) : undefined}
                    onInlineEdit={onInlineEdit}
                  />
                </div>
                <p className="resume-sheet__date-line">
                  <EditableText
                    value={cert.date_obtained ?? ""}
                    path={`certifications[${idx}].date_obtained`}
                    className="resume-sheet__inline-left"
                    placeholder={showEmptyPlaceholders ? getPlaceholder(`certifications[${idx}].date_obtained`) : undefined}
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
      </DndContext>
    </div>
  );
}

export default ResumeSheet;

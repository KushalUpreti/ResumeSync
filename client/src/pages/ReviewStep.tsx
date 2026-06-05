import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faChevronDown,
  faFileLines,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  commitResume,
  getResume,
  rewritePreview,
  waitForJob,
} from "../api/resumeSync";
import './ReviewStep.css';
import { arrayMove } from "@dnd-kit/sortable";
import { useNotification } from "../context/useNotification";
import SectionCard from "../components/SectionCard";
import ResumeSheet from "../components/ResumeSheet";
import { useWorkspace } from "../context/useWorkspace";
import {
  deriveResumeFileBaseName,
  isGeneratedDefaultFileBaseName,
  stripDocxExtension,
} from "../lib/resumeFileName";
import type { AiImprovement, ResumeDocument } from "../types/resume";

type ReviewStepProps = {
  onNext: () => void;
  onBack: () => void;
};

type BulletSection = "experience" | "projects";
type ImprovementCategory =
  | "summary"
  | "experience"
  | "ats"
  | "skills"
  | "structure"
  | "clarity"
  | "keywords"
  | "metrics"
  | "projects"
  | "education"
  | "certifications"
  | "formatting";

const aiImprovementCategoryLabels: Record<ImprovementCategory, string> = {
  summary: "Summary",
  experience: "Experience",
  ats: "ATS",
  skills: "Skills",
  structure: "Structure",
  clarity: "Clarity",
  keywords: "Keywords",
  metrics: "Metrics",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  formatting: "Formatting",
};

function normalizeImprovementCategory(category: string): ImprovementCategory {
  return category in aiImprovementCategoryLabels
    ? (category as ImprovementCategory)
    : "clarity";
}

function getImprovementDetails(improvement: AiImprovement) {
  const details = improvement.details?.filter((detail) => detail.trim()) ?? [];
  if (details.length > 0) {
    return details.slice(0, 3);
  }
  return improvement.evidence?.trim() ? [improvement.evidence.trim()] : [];
}

function getBaseFileName(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.split(/[\\/]/).pop()?.trim() ?? "";
}

function truncateFileName(value: string, maxLength = 34) {
  const cleaned = value.trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const lastDot = cleaned.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < cleaned.length - 1;
  const extension = hasExtension ? cleaned.slice(lastDot) : "";
  const stem = hasExtension ? cleaned.slice(0, lastDot) : cleaned;
  const available = Math.max(10, maxLength - extension.length - 3);
  return `${stem.slice(0, available)}...${extension}`;
}

function getBulletPath(
  section: BulletSection,
  entryIndex: number,
  bulletIndex: number,
) {
  return `${section}[${entryIndex}].bullets[${bulletIndex}]`;
}

function remapBulletPath(
  path: string,
  section: BulletSection,
  entryIndex: number,
  fromIndex: number,
  toIndex: number,
) {
  const match = path.match(
    /^(experience|projects)\[(\d+)\]\.bullets\[(\d+)\]$/,
  );
  if (!match) {
    return path;
  }

  const matchedSection = match[1] as BulletSection;
  const matchedEntryIndex = Number(match[2]);
  const matchedBulletIndex = Number(match[3]);

  if (matchedSection !== section || matchedEntryIndex !== entryIndex) {
    return path;
  }

  let nextBulletIndex = matchedBulletIndex;
  if (fromIndex < toIndex) {
    if (matchedBulletIndex === fromIndex) {
      nextBulletIndex = toIndex;
    } else if (matchedBulletIndex > fromIndex && matchedBulletIndex <= toIndex) {
      nextBulletIndex = matchedBulletIndex - 1;
    }
  } else if (fromIndex > toIndex) {
    if (matchedBulletIndex === fromIndex) {
      nextBulletIndex = toIndex;
    } else if (matchedBulletIndex >= toIndex && matchedBulletIndex < fromIndex) {
      nextBulletIndex = matchedBulletIndex + 1;
    }
  }

  return getBulletPath(section, entryIndex, nextBulletIndex);
}

function remapBulletHistory(
  history: Record<string, string[]>,
  section: BulletSection,
  entryIndex: number,
  fromIndex: number,
  toIndex: number,
) {
  const nextHistory: Record<string, string[]> = {};

  for (const [path, values] of Object.entries(history)) {
    const nextPath = remapBulletPath(path, section, entryIndex, fromIndex, toIndex);
    nextHistory[nextPath] = values;
  }

  return nextHistory;
}

function remapBulletPathAfterDelete(
  path: string,
  section: BulletSection,
  entryIndex: number,
  deletedIndex: number,
) {
  const match = path.match(/^(experience|projects)\[(\d+)\]\.bullets\[(\d+)\]$/);
  if (!match) {
    return path;
  }

  const matchedSection = match[1] as BulletSection;
  const matchedEntryIndex = Number(match[2]);
  const matchedBulletIndex = Number(match[3]);

  if (matchedSection !== section || matchedEntryIndex !== entryIndex) {
    return path;
  }

  if (matchedBulletIndex === deletedIndex) {
    return null;
  }

  if (matchedBulletIndex > deletedIndex) {
    return getBulletPath(section, entryIndex, matchedBulletIndex - 1);
  }

  return path;
}

function remapBulletHistoryAfterDelete(
  history: Record<string, string[]>,
  section: BulletSection,
  entryIndex: number,
  deletedIndex: number,
) {
  const nextHistory: Record<string, string[]> = {};

  for (const [path, values] of Object.entries(history)) {
    const nextPath = remapBulletPathAfterDelete(
      path,
      section,
      entryIndex,
      deletedIndex,
    );
    if (!nextPath) {
      continue;
    }
    nextHistory[nextPath] = values;
  }

  return nextHistory;
}

function ReviewStep({ onNext }: ReviewStepProps) {
  const { addNotification } = useNotification();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isImprovementsModalOpen, setIsImprovementsModalOpen] = useState(false);
  const [openImprovementKeys, setOpenImprovementKeys] = useState<
    Record<string, boolean>
  >({});

  const [activeRewritePath, setActiveRewritePath] = useState<string | null>(
    null,
  );
  const [rewriteHistory, setRewriteHistory] = useState<
    Record<string, string[]>
  >({});
  const [removedSkillsHistory, setRemovedSkillsHistory] = useState<
    { categoryName: string; skill: string }[]
  >([]);

  const {
    draftResume,
    generatedResumeId,
    generatedFileBaseName,
    masterResume,
    tailoringMode,
    targetRole,
    targetCompany,
    jobDescription,
    setDraftResume,
    setGeneratedResume,
    setGeneratedFileBaseName,
    setLastGenerateJob,
    lastGenerateJob,
  } = useWorkspace();

  // Determine if we are in the single-resume scenario (no master resume present)
  const singleResume = !masterResume && !!draftResume;
  const undoSkillRemovalCategoryIndex =
    removedSkillsHistory.length > 0 && draftResume
      ? (() => {
          const lastCategoryName =
            removedSkillsHistory[removedSkillsHistory.length - 1]
              ?.categoryName;
          if (!lastCategoryName) {
            return null;
          }
          const categoryIndex = draftResume.skills.findIndex(
            (category) => category.category === lastCategoryName,
          );
          return categoryIndex >= 0 ? categoryIndex : null;
        })()
      : null;

  function deriveResumeIdFromJsonKey(jsonKey: string | null) {
    if (!jsonKey) return null;
    const match = jsonKey.match(/\/json\/([^/]+)\.json$/);
    return match?.[1] ?? null;
  }

  // Poll for the generation job if it was started in the previous step
  useEffect(() => {
    if (
      lastGenerateJob &&
      lastGenerateJob.status !== "complete" &&
      lastGenerateJob.status !== "failed"
    ) {
      void (async () => {
        setIsGenerating(true);
        try {
          const finalJob = await waitForJob(lastGenerateJob.job_id);
          setLastGenerateJob(finalJob);

          if (finalJob.status === "failed") {
            throw new Error(finalJob.error || "The tailoring job failed.");
          }

          const newResumeId = deriveResumeIdFromJsonKey(finalJob.output_s3_key);
          if (newResumeId) {
            const tailoredDoc = await getResume(newResumeId);
            setGeneratedResume(newResumeId, finalJob.output_s3_key);
            setGeneratedFileBaseName(deriveResumeFileBaseName(tailoredDoc));
            setDraftResume(tailoredDoc);
            addNotification({
              type: "success",
              message: "Tailoring Complete",
              description: "Your tailored resume is ready for review.",
            });
          }
        } catch (error) {
          addNotification({
            type: "error",
            message: "Tailoring Failed",
            description:
              error instanceof Error
                ? error.message
                : "Unable to load tailored resume.",
          });
        } finally {
          setIsGenerating(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastGenerateJob?.job_id, lastGenerateJob?.status]);

  function buildRewriteInstruction(
    kind: "summary" | "bullet point" | "project description",
  ) {
    const targetBits = [targetRole, targetCompany ? `at ${targetCompany}` : ""]
      .filter(Boolean)
      .join(" ");
    const targetContext = targetBits || "the current target";
    const modeContext =
      tailoringMode === "sniper"
        ? "Make it sharper, more ATS-focused, and more directly aligned."
        : "Make it polished, clear, and broadly professional.";
    const jobContext = jobDescription?.trim()
      ? `If useful, lean on this job description context: ${jobDescription.trim()}`
      : "";

    if (kind === "summary") {
      return [
        `Rewrite this professional summary as a single strong paragraph for ${targetContext}.`,
        "Preserve the original facts, metrics, and dates if any are mentioned.",
        modeContext,
        jobContext,
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (kind === "project description") {
      return [
        `Rewrite this project description for ${targetContext}.`,
        "Keep it concise, clear, and specific while preserving the key facts and outcomes.",
        "Preserve numbers, dates, and factual details.",
        modeContext,
        jobContext,
      ]
        .filter(Boolean)
        .join(" ");
    }

    return [
      `Rewrite this resume bullet for ${targetContext}.`,
      "Keep the meaning intact while making it more concise, compelling, and specific.",
      "Preserve numbers, dates, and factual details.",
      modeContext,
      jobContext,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function applyRewrite(
    document: ResumeDocument,
    path: string,
    nextText: string,
  ): ResumeDocument {
    if (path === "summary") {
      return { ...document, summary: nextText };
    }

    const experienceBulletMatch = path.match(
      /^experience\[(\d+)\]\.bullets\[(\d+)\]$/,
    );
    if (experienceBulletMatch) {
      const expIndex = Number(experienceBulletMatch[1]);
      const bulletIndex = Number(experienceBulletMatch[2]);
      const nextExperience = document.experience.map((entry, index) => {
        if (index !== expIndex) {
          return entry;
        }

        const nextBullets = [...entry.bullets];
        if (bulletIndex >= nextBullets.length) {
          nextBullets.push(nextText);
        } else {
          nextBullets[bulletIndex] = nextText;
        }

        return {
          ...entry,
          bullets: nextBullets,
        };
      });

      return {
        ...document,
        experience: nextExperience,
      };
    }

    const experienceFieldMatch = path.match(
      /^experience\[(\d+)\]\.(role|company|start_date|end_date)$/,
    );
    if (experienceFieldMatch) {
      const expIndex = Number(experienceFieldMatch[1]);
      const field = experienceFieldMatch[2] as
        | "role"
        | "company"
        | "start_date"
        | "end_date";
      const nextExperience = document.experience.map((entry, index) => {
        if (index !== expIndex) return entry;
        return {
          ...entry,
          [field]: nextText,
        };
      });

      return {
        ...document,
        experience: nextExperience,
      };
    }

    const contactFieldMatch = path.match(
      /^contact\.(full_name|email|phone)$/,
    );
    if (contactFieldMatch) {
      const field = contactFieldMatch[1] as "full_name" | "email" | "phone";
      return {
        ...document,
        [field]: nextText,
      };
    }

    const contactLinkMatch = path.match(/^contact\.links\[(\d+)\]$/);
    if (contactLinkMatch) {
      const linkIndex = Number(contactLinkMatch[1]);
      return {
        ...document,
        links: document.links.map((link, index) =>
          index === linkIndex ? nextText : link,
        ),
      };
    }

    const educationFieldMatch = path.match(
      /^education\[(\d+)\]\.(institution|degree|field_of_study|start_date|end_date|gpa|description)$/,
    );
    if (educationFieldMatch) {
      const entryIndex = Number(educationFieldMatch[1]);
      const field = educationFieldMatch[2] as
        | "institution"
        | "degree"
        | "field_of_study"
        | "start_date"
        | "end_date"
        | "gpa"
        | "description";

      return {
        ...document,
        education: document.education?.map((entry, index) => {
          if (index !== entryIndex) {
            return entry;
          }

          return {
            ...entry,
            [field]: nextText,
          };
        }),
      };
    }

    const projectBulletMatch = path.match(
      /^projects\[(\d+)\]\.bullets\[(\d+)\]$/,
    );
    if (projectBulletMatch) {
      const projectIndex = Number(projectBulletMatch[1]);
      const bulletIndex = Number(projectBulletMatch[2]);

      return {
        ...document,
        projects: document.projects?.map((entry, index) => {
          if (index !== projectIndex) {
            return entry;
          }

          const nextBullets = [...entry.bullets];
          if (bulletIndex >= nextBullets.length) {
            nextBullets.push(nextText);
          } else {
            nextBullets[bulletIndex] = nextText;
          }

          return {
            ...entry,
            bullets: nextBullets,
          };
        }),
      };
    }

    const projectFieldMatch = path.match(
      /^projects\[(\d+)\]\.(name|role|description|start_date|end_date)$/,
    );
    if (projectFieldMatch) {
      const projectIndex = Number(projectFieldMatch[1]);
      const field = projectFieldMatch[2] as
        | "name"
        | "role"
        | "description"
        | "start_date"
        | "end_date";

      return {
        ...document,
        projects: document.projects?.map((entry, index) => {
          if (index !== projectIndex) {
            return entry;
          }

          return {
            ...entry,
            [field]: nextText,
          };
        }),
      };
    }

    const certificationFieldMatch = path.match(
      /^certifications\[(\d+)\]\.(name|issuer|date_obtained|expiration_date)$/,
    );
    if (certificationFieldMatch) {
      const certIndex = Number(certificationFieldMatch[1]);
      const field = certificationFieldMatch[2] as
        | "name"
        | "issuer"
        | "date_obtained"
        | "expiration_date";

      return {
        ...document,
        certifications: document.certifications?.map((entry, index) => {
          if (index !== certIndex) {
            return entry;
          }

          return {
            ...entry,
            [field]: nextText,
          };
        }),
      };
    }

    return document;
  }

  function handleReorderBullet(
    section: BulletSection,
    entryIndex: number,
    fromIndex: number,
    toIndex: number,
  ) {
    if (!draftResume || fromIndex === toIndex) {
      return;
    }

    if (section === "experience") {
      const entry = draftResume.experience[entryIndex];
      if (!entry) return;
      const nextBullets = arrayMove(entry.bullets, fromIndex, toIndex);
      setDraftResume({
        ...draftResume,
        experience: draftResume.experience.map((item, index) =>
          index === entryIndex ? { ...item, bullets: nextBullets } : item,
        ),
      });
    } else {
      const entry = draftResume.projects?.[entryIndex];
      if (!entry || !draftResume.projects) return;
      const nextBullets = arrayMove(entry.bullets, fromIndex, toIndex);
      setDraftResume({
        ...draftResume,
        projects: draftResume.projects.map((item, index) =>
          index === entryIndex ? { ...item, bullets: nextBullets } : item,
        ),
      });
    }

    setRewriteHistory((current) =>
      remapBulletHistory(current, section, entryIndex, fromIndex, toIndex),
    );
    setActiveRewritePath((current) =>
      current
        ? remapBulletPath(current, section, entryIndex, fromIndex, toIndex)
        : current,
    );
  }

  function handleDeleteBullet(
    section: BulletSection,
    entryIndex: number,
    bulletIndex: number,
  ) {
    if (!draftResume) {
      return;
    }

    if (section === "experience") {
      const entry = draftResume.experience[entryIndex];
      if (!entry) return;
      const nextBullets = entry.bullets.filter((_, idx) => idx !== bulletIndex);
      setDraftResume({
        ...draftResume,
        experience: draftResume.experience.map((item, index) =>
          index === entryIndex ? { ...item, bullets: nextBullets } : item,
        ),
      });
    } else {
      const entry = draftResume.projects?.[entryIndex];
      if (!entry || !draftResume.projects) return;
      const nextBullets = entry.bullets.filter((_, idx) => idx !== bulletIndex);
      setDraftResume({
        ...draftResume,
        projects: draftResume.projects.map((item, index) =>
          index === entryIndex ? { ...item, bullets: nextBullets } : item,
        ),
      });
    }

    setRewriteHistory((current) =>
      remapBulletHistoryAfterDelete(current, section, entryIndex, bulletIndex),
    );
    setActiveRewritePath((current) =>
      current
        ? remapBulletPathAfterDelete(current, section, entryIndex, bulletIndex)
        : current,
    );
  }

  function getCurrentValue(
    document: ResumeDocument,
    path: string,
  ): string | null {
    if (path === "summary") {
      return document.summary;
    }
    const experienceBulletMatch = path.match(
      /^experience\[(\d+)\]\.bullets\[(\d+)\]$/,
    );
    if (experienceBulletMatch) {
      const expIndex = Number(experienceBulletMatch[1]);
      const bulletIndex = Number(experienceBulletMatch[2]);
      const entry = document.experience[expIndex];
      if (!entry) return null;
      return entry.bullets[bulletIndex] ?? null;
    }
    const experienceFieldMatch = path.match(
      /^experience\[(\d+)\]\.(role|company|start_date|end_date)$/,
    );
    if (experienceFieldMatch) {
      const expIndex = Number(experienceFieldMatch[1]);
      const field = experienceFieldMatch[2] as
        | "role"
        | "company"
        | "start_date"
        | "end_date";
      const entry = document.experience[expIndex];
      if (!entry) return null;
      return entry[field] ?? null;
    }
    const contactFieldMatch = path.match(
      /^contact\.(full_name|email|phone)$/,
    );
    if (contactFieldMatch) {
      const field = contactFieldMatch[1] as "full_name" | "email" | "phone";
      return document[field];
    }
    const contactLinkMatch = path.match(/^contact\.links\[(\d+)\]$/);
    if (contactLinkMatch) {
      const linkIndex = Number(contactLinkMatch[1]);
      return document.links[linkIndex] ?? null;
    }
    const educationFieldMatch = path.match(
      /^education\[(\d+)\]\.(institution|degree|field_of_study|start_date|end_date|gpa|description)$/,
    );
    if (educationFieldMatch) {
      const entryIndex = Number(educationFieldMatch[1]);
      const field = educationFieldMatch[2] as
        | "institution"
        | "degree"
        | "field_of_study"
        | "start_date"
        | "end_date"
        | "gpa"
        | "description";
      const entry = document.education?.[entryIndex];
      if (!entry) return null;
      return entry[field] ?? null;
    }
    const projectBulletMatch = path.match(
      /^projects\[(\d+)\]\.bullets\[(\d+)\]$/,
    );
    if (projectBulletMatch) {
      const projectIndex = Number(projectBulletMatch[1]);
      const bulletIndex = Number(projectBulletMatch[2]);
      const entry = document.projects?.[projectIndex];
      if (!entry) return null;
      return entry.bullets[bulletIndex] ?? null;
    }
    const projectFieldMatch = path.match(
      /^projects\[(\d+)\]\.(name|role|description|start_date|end_date)$/,
    );
    if (projectFieldMatch) {
      const projectIndex = Number(projectFieldMatch[1]);
      const field = projectFieldMatch[2] as
        | "name"
        | "role"
        | "description"
        | "start_date"
        | "end_date";
      const entry = document.projects?.[projectIndex];
      if (!entry) return null;
      return entry[field] ?? null;
    }
    const certificationFieldMatch = path.match(
      /^certifications\[(\d+)\]\.(name|issuer|date_obtained|expiration_date)$/,
    );
    if (certificationFieldMatch) {
      const certIndex = Number(certificationFieldMatch[1]);
      const field = certificationFieldMatch[2] as
        | "name"
        | "issuer"
        | "date_obtained"
        | "expiration_date";
      const entry = document.certifications?.[certIndex];
      if (!entry) return null;
      return entry[field] ?? null;
    }
    return null;
  }

  function handleInlineEdit(path: string, value: string) {
    if (!draftResume) return;
    const nextValue = value;
    const currentValue = getCurrentValue(draftResume, path);
    if (currentValue === nextValue) return;
    if (
      path === "contact.full_name" &&
      nextValue.trim() &&
      (isGeneratedDefaultFileBaseName(generatedFileBaseName) ||
        generatedFileBaseName === draftResume.full_name)
    ) {
      setGeneratedFileBaseName(stripDocxExtension(nextValue.trim()));
    }
    setDraftResume(applyRewrite(draftResume, path, nextValue));
  }

  async function handleRewriteTarget(target: {
    path: string;
    text: string;
    label: string;
  }) {
    if (!draftResume) {
      return;
    }

    setActiveRewritePath(target.path);
    try {
      const response = await rewritePreview({
        text: target.text,
        instruction: buildRewriteInstruction(
          target.label === "summary"
            ? "summary"
            : target.label === "project description"
              ? "project description"
              : "bullet point",
        ),
        mode: tailoringMode,
      });

      const currentValue = getCurrentValue(draftResume, target.path);
      const rewrittenText = response.rewritten_text.trim();
      if (currentValue && rewrittenText && rewrittenText !== currentValue) {
        setRewriteHistory((current) => ({
          ...current,
          [target.path]: [...(current[target.path] ?? []), currentValue],
        }));
      }

      const nextDocument = applyRewrite(
        draftResume,
        target.path,
        rewrittenText,
      );
      setDraftResume(nextDocument);
    } catch (error) {
      addNotification({
        type: "error",
        message: "Rewrite Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to rewrite this part of the resume.",
      });
    } finally {
      setActiveRewritePath(null);
    }
  }

  async function handleApproveAndContinue() {
    if (!draftResume || !generatedResumeId) {
      onNext();
      return;
    }

    setIsApproving(true);
    try {
      const downloadName = stripDocxExtension(generatedFileBaseName.trim());
      const documentToCommit = {
        ...draftResume,
        metadata: {
          ...(draftResume.metadata ?? {}),
          ...(downloadName ? { download_name: downloadName } : {}),
        },
      };
      const commitJob = await commitResume(generatedResumeId, documentToCommit);
      const finalJob = await waitForJob(commitJob.job_id);
      if (finalJob.status === "failed") {
        throw new Error(finalJob.error || "Unable to save review changes.");
      }
      setDraftResume(documentToCommit);
      onNext();
    } catch (error) {
      addNotification({
        type: "error",
        message: "Save Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to save your review changes before export.",
      });
    } finally {
      setIsApproving(false);
    }
  }

  function canUndoPath(path: string) {
    return (rewriteHistory[path]?.length ?? 0) > 0;
  }

  function handleUndo(path: string) {
    if (!draftResume) {
      return;
    }

    const history = rewriteHistory[path] ?? [];
    const previousValue = history[history.length - 1];
    if (!previousValue) {
      return;
    }

    setDraftResume(applyRewrite(draftResume, path, previousValue));
    setRewriteHistory((current) => ({
      ...current,
      [path]: (current[path] ?? []).slice(0, -1),
    }));
  }

  function handleRemoveSkill(categoryIndex: number, skillIndex: number) {
    if (!draftResume) {
      return;
    }

    const category = draftResume.skills[categoryIndex];
    if (!category) return;

    const removedSkill = category.items[skillIndex];
    if (removedSkill && category.items.length > 1) {
      setRemovedSkillsHistory((current) => [
        ...current,
        { categoryName: category.category, skill: removedSkill },
      ]);
    }

    const nextSkills = [...draftResume.skills];
    const nextItems = category.items.filter((_, idx) => idx !== skillIndex);

    if (nextItems.length === 0) {
      nextSkills.splice(categoryIndex, 1);
      setRemovedSkillsHistory((current) =>
        current.filter((entry) => entry.categoryName !== category.category),
      );
    } else {
      nextSkills[categoryIndex] = {
        ...category,
        items: nextItems,
      };
    }

    setDraftResume({
      ...draftResume,
      skills: nextSkills,
    });
  }

  function handleUndoSkillRemoval() {
    if (!draftResume) {
      return;
    }
    const previous = removedSkillsHistory[removedSkillsHistory.length - 1];
    if (!previous) {
      return;
    }
    const categoryIndex = draftResume.skills.findIndex(
      (category) => category.category === previous.categoryName,
    );
    if (categoryIndex < 0) {
      return;
    }
    const nextSkills = [...draftResume.skills];
    nextSkills[categoryIndex] = {
      ...nextSkills[categoryIndex],
      items: [...nextSkills[categoryIndex].items, previous.skill],
    };

    setDraftResume({
      ...draftResume,
      skills: nextSkills,
    });
    setRemovedSkillsHistory((current) => current.slice(0, -1));
  }

  function handleAddSkill(categoryName: string, skill: string) {
    if (!draftResume) {
      return;
    }

    const nextSkills = [...draftResume.skills];
    const catIndex = nextSkills.findIndex(
      (c) => c.category.toLowerCase() === categoryName.toLowerCase(),
    );

    if (catIndex >= 0) {
      if (
        nextSkills[catIndex].items.some(
          (existing) => existing.toLowerCase() === skill.toLowerCase(),
        )
      ) {
        addNotification({
          type: "info",
          message: "Skill already present",
          description: `"${skill}" is already in the ${categoryName} category.`,
        });
        return;
      }
      nextSkills[catIndex] = {
        ...nextSkills[catIndex],
        items: [...nextSkills[catIndex].items, skill],
      };
    } else {
      nextSkills.push({ category: categoryName, items: [skill] });
    }

    setDraftResume({
      ...draftResume,
      skills: nextSkills,
    });
  }

  const originalDocument = masterResume;
  const workingDocument = draftResume;
  const sourceFileName =
    originalDocument?.metadata?.source &&
    getBaseFileName(originalDocument.metadata.source)
      ? truncateFileName(
          getBaseFileName(originalDocument.metadata.source),
          36,
        )
      : "Uploaded document";

  const generatedTitle = (
    <span className="resume-name-field">
      <input
        aria-label="Resume file name"
        className="resume-name-field__input"
        maxLength={48}
        onBlur={(event) => {
          const rawValue = event.currentTarget.value.trim();
          const nextValue = rawValue.replace(/\.docx$/i, "").trim();
          if (!nextValue) {
            setGeneratedFileBaseName("Tailored Resume");
            return;
          }
          if (nextValue !== event.currentTarget.value) {
            setGeneratedFileBaseName(nextValue);
          }
        }}
        onChange={(event) => setGeneratedFileBaseName(event.currentTarget.value)}
        placeholder="Tailored Resume"
        spellCheck={false}
        value={generatedFileBaseName}
      />
      <span className="resume-name-field__suffix">.docx</span>
    </span>
  );
  const aiImprovements = workingDocument?.ai_improvements ?? [];
  const improvementDetailCount = aiImprovements.reduce(
    (count, improvement) => count + getImprovementDetails(improvement).length,
    0,
  );
  const improvementCategoryCount = new Set(
    aiImprovements.map((improvement) =>
      normalizeImprovementCategory(improvement.category),
    ),
  ).size;

  return (
    <div className="page-stack">
      {createPortal(
        <div className="page-toolbar__actions">
          <div style={{ width: "10px" }} />
          <button
            className="button button--primary"
            disabled={isApproving}
            onClick={() => void handleApproveAndContinue()}
            type="button"
          >
            {isApproving ? "Saving..." : "Approve & Continue"}
          </button>
        </div>,
        document.getElementById("header-actions-portal")!,
      )}
      {isImprovementsModalOpen
        ? createPortal(
            <div
              className="ai-improvements-backdrop"
              onClick={() => setIsImprovementsModalOpen(false)}
              role="presentation"
            >
              <section
                aria-labelledby="ai-improvements-title"
                aria-modal="true"
                className="ai-improvements-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <header className="ai-improvements-modal__header">
                  <div className="ai-improvements-modal__title-group">
                    <div className="ai-improvements-modal__icon">
                      <FontAwesomeIcon icon={faWandMagicSparkles} />
                    </div>
                    <div>
                      <h2
                        className="ai-improvements-modal__title"
                        id="ai-improvements-title"
                      >
                        AI Improvements
                      </h2>
                      <p className="ai-improvements-modal__subtitle">
                        ResumeSync grouped the visible resume changes by section
                        so you can quickly verify what changed.
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label="Close improvements"
                    className="ai-improvements-modal__close"
                    onClick={() => setIsImprovementsModalOpen(false)}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </header>

                <div className="ai-improvements-modal__summary">
                  <span>
                    <FontAwesomeIcon icon={faCheck} />
                    {improvementDetailCount} visible changes
                  </span>
                  <span>
                    <FontAwesomeIcon icon={faFileLines} />
                    {improvementCategoryCount} categories
                  </span>
                  <span>
                    <FontAwesomeIcon icon={faWandMagicSparkles} />
                    AI-generated categories
                  </span>
                </div>

                <div className="ai-improvements-modal__body">
                  {aiImprovements.length > 0 ? (
                    aiImprovements.map((improvement, index) => {
                      const category = normalizeImprovementCategory(
                        improvement.category,
                      );
                      const details = getImprovementDetails(improvement);
                      const evidence = improvement.evidence?.trim() ?? "";
                      const shouldShowEvidence =
                        evidence.length > 0 && !details.includes(evidence);
                      const improvementKey = `${category}-${improvement.title}-${index}`;
                      const isOpen =
                        openImprovementKeys[improvementKey] ?? index === 0;
                      return (
                        <article
                          className={`ai-improvement-card ai-improvement-card--${category}`}
                          key={improvementKey}
                        >
                          <button
                            aria-expanded={isOpen}
                            className="ai-improvement-card__trigger"
                            onClick={() =>
                              setOpenImprovementKeys((current) => ({
                                ...current,
                                [improvementKey]: !isOpen,
                              }))
                            }
                            type="button"
                          >
                            <span className="ai-improvement-card__category">
                              {aiImprovementCategoryLabels[category]}
                            </span>
                            <span className="ai-improvement-card__content">
                              <span className="ai-improvement-card__title">
                                {improvement.title}
                              </span>
                              <span className="ai-improvement-card__description">
                                {improvement.description}
                              </span>
                            </span>
                            <span className="ai-improvement-card__chevron">
                              <FontAwesomeIcon icon={faChevronDown} />
                            </span>
                          </button>
                          {isOpen ? (
                            <div className="ai-improvement-card__panel">
                              {details.length > 0 ? (
                                <ul className="ai-improvement-card__details">
                                  {details.map((detail, detailIndex) => (
                                    <li key={`${improvementKey}-detail-${detailIndex}`}>
                                      {detail}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                              {shouldShowEvidence ? (
                                <div className="ai-improvement-card__evidence">
                                  <FontAwesomeIcon icon={faCheck} />
                                  {evidence}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <div className="ai-improvements-empty">
                      <FontAwesomeIcon icon={faWandMagicSparkles} />
                      <h3>No AI improvements recorded</h3>
                      <p>
                        Generate a new tailored resume to see the specific
                        AI-generated changes summarized here.
                      </p>
                    </div>
                  )}
                </div>

                <footer className="ai-improvements-modal__footer">
                  <p>
                    These improvements summarize AI-generated changes only.
                    Manual edits are not included.
                  </p>
                  <div className="ai-improvements-modal__actions">
                    <button
                      className="button button--primary"
                      onClick={() => setIsImprovementsModalOpen(false)}
                      type="button"
                    >
                      Continue Reviewing
                    </button>
                  </div>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}

      <div className={`review-grid ${singleResume ? "single-resume" : ""}`}>
        {originalDocument && (
          <SectionCard
            className="review-panel review-panel--source"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              overflow: "hidden",
              padding: 0,
            }}
          >
            <div className="source-banner">
              <div>
                <FontAwesomeIcon
                  icon={faFileLines}
                  style={{ marginRight: "8px" }}
                />
                Original Source
              </div>
              <div className="source-badge">Uploaded document</div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResumeSheet
                document={originalDocument}
                title={sourceFileName}
                subtitle="Uploaded document data"
              />
            </div>
          </SectionCard>
        )}

        <SectionCard
          className="review-panel review-panel--generated"
          style={{
            border: "1px solid var(--color-success-soft, #dcfce7)",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            overflow: "hidden",
            padding: 0,
          }}
        >
          <div className="optimized-banner">
            <div>
              <FontAwesomeIcon
                icon={faWandMagicSparkles}
                style={{ marginRight: "8px" }}
              />
              AI Optimized Output
            </div>
            <div className="optimized-banner__actions">
              <div className="ats-badge">
                <span className="status-dot"></span> ATS OPTIMIZED
              </div>
              <button
                className="view-improvements-button"
                disabled={aiImprovements.length === 0}
                onClick={() => setIsImprovementsModalOpen(true)}
                type="button"
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                View Improvements
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResumeSheet
              document={workingDocument}
              isLoading={isGenerating}
              showEmptyPlaceholders
              title={generatedTitle}
              subtitle="AI enhanced for target role"
              activeRewritePath={activeRewritePath}
              canUndoPath={canUndoPath}
              onUndo={handleUndo}
              onAddSkill={handleAddSkill}
              canUndoSkillRemoval={removedSkillsHistory.length > 0}
              undoSkillRemovalCategoryIndex={undoSkillRemovalCategoryIndex}
              onUndoSkillRemoval={handleUndoSkillRemoval}
              onRemoveSkill={(categoryIndex, skillIndex) => {
                handleRemoveSkill(categoryIndex, skillIndex);
              }}
              onReorderBullet={handleReorderBullet}
              onDeleteBullet={handleDeleteBullet}
              onRewrite={(target) => void handleRewriteTarget(target)}
              onInlineEdit={handleInlineEdit}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default ReviewStep;

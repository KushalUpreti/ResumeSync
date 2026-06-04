import type { ResumeDocument } from "../types/resume";

const DEFAULT_RESUME_FILE_BASE_NAME = "Tailored Resume";
const INTERNAL_SOURCE_FILE_NAMES = new Set([
  "notes_ingestion",
  "notes_ingestion.txt",
]);

function getBaseFileName(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.split(/[\\/]/).pop()?.trim() ?? "";
}

export function stripDocxExtension(value: string) {
  return value.replace(/\.docx$/i, "").trim();
}

export function isInternalResumeSourceFileName(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const fileName = getBaseFileName(value).toLowerCase();
  const baseName = stripDocxExtension(fileName).toLowerCase();
  return (
    INTERNAL_SOURCE_FILE_NAMES.has(fileName) ||
    INTERNAL_SOURCE_FILE_NAMES.has(baseName)
  );
}

export function deriveResumeFileBaseName(document: ResumeDocument | null | undefined) {
  const metadataName = stripDocxExtension(
    document?.metadata?.download_name || document?.metadata?.file_name || "",
  );
  if (metadataName) {
    return metadataName;
  }

  const candidateName = stripDocxExtension(document?.full_name?.trim() || "");
  if (candidateName && candidateName !== "Imported Candidate") {
    return candidateName;
  }

  const sourceFileName = getBaseFileName(document?.metadata?.source);
  const sourceName = stripDocxExtension(sourceFileName);
  if (isInternalResumeSourceFileName(sourceFileName)) {
    return DEFAULT_RESUME_FILE_BASE_NAME;
  }

  return sourceName || DEFAULT_RESUME_FILE_BASE_NAME;
}

export function isGeneratedDefaultFileBaseName(value: string) {
  const cleaned = stripDocxExtension(value.trim());
  return (
    !cleaned ||
    cleaned === DEFAULT_RESUME_FILE_BASE_NAME ||
    cleaned === "resume" ||
    cleaned === "resume_modern" ||
    cleaned === "resume_executive" ||
    cleaned === "resume_professional"
  );
}

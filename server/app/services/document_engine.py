from __future__ import annotations

import io
from pathlib import Path

from docxtpl import DocxTemplate

from app.models.resume import ResumeDocument
from app.services.interfaces import DocumentRenderer


class DocxtplDocumentRenderer(DocumentRenderer):
    def __init__(self, template_dir: str | Path | None = None) -> None:
        # Resolve templates relative to this module so exports work regardless
        # of the process working directory.
        self.template_dir = (
            Path(template_dir)
            if template_dir is not None
            else Path(__file__).resolve().parents[1] / "static" / "templates"
        )

    def render(self, document: ResumeDocument, *, template_id: str) -> bytes:
        safe_template_id = Path(template_id).name
        template_path = self.template_dir / f"{safe_template_id}.docx"

        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")

        context = {
            "full_name": document.full_name,
            "email": document.email,
            "phone": document.phone,
            "links": document.links,
            "links_csv": " | ".join(document.links),
            "summary": document.summary,
            "experience": [
                {
                    "company": exp.company,
                    "role": exp.role,
                    "start_date": exp.start_date or "",
                    "end_date": exp.end_date or "",
                    "bullets": exp.bullets,
                }
                for exp in document.experience
            ],
            "skills": [
                {
                    "category": cat.category,
                    "skills": cat.items,
                    "skills_csv": ", ".join(cat.items),
                }
                for cat in document.skills
            ],
            "education": [
                {
                    "institution": edu.institution,
                    "degree": edu.degree,
                    "field_of_study": edu.field_of_study or "",
                    "start_date": edu.start_date or "",
                    "end_date": edu.end_date or "",
                    "gpa": edu.gpa or "",
                    "description": edu.description or "",
                }
                for edu in document.education
            ],
            "has_education": len(document.education) > 0,
            "projects": [
                {
                    "name": proj.name,
                    "description": proj.description or "",
                    "role": proj.role or "",
                    "technologies": proj.technologies,
                    "url": proj.url or "",
                    "start_date": proj.start_date or "",
                    "end_date": proj.end_date or "",
                    "bullets": proj.bullets,
                }
                for proj in document.projects
            ],
            "has_projects": len(document.projects) > 0,
            "certifications": [
                {
                    "name": cert.name,
                    "issuer": cert.issuer or "",
                    "date_obtained": cert.date_obtained or "",
                    "expiration_date": cert.expiration_date or "",
                    "date_text": " | ".join(
                        part
                        for part in [
                            cert.date_obtained or "",
                            f"Expires: {cert.expiration_date}" if cert.expiration_date else "",
                        ]
                        if part
                    ),
                    "url": cert.url or "",
                }
                for cert in document.certifications
            ],
            "has_certifications": len(document.certifications) > 0,
        }

        try:
            doc = DocxTemplate(str(template_path))
            doc.render(context)

            target = io.BytesIO()
            doc.save(target)
            return target.getvalue()
        except Exception as exc:
            raise RuntimeError(f"Unable to generate the selected resume template: {exc}") from exc

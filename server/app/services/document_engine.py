from __future__ import annotations

import io
from docxtpl import DocxTemplate
from app.models.resume import ResumeDocument
from app.services.interfaces import DocumentRenderer

class DocxtplDocumentRenderer(DocumentRenderer):
    def __init__(self, template_dir: str = "app/static/templates") -> None:
        self.template_dir = template_dir

    def render(self, document: ResumeDocument, *, template_id: str) -> bytes:
        # For now, we'll assume the template exists locally in the container/server
        # In a more advanced setup, we could fetch templates from S3
        template_path = f"{self.template_dir}/{template_id}.docx"
        
        try:
            doc = DocxTemplate(template_path)
        except Exception:
            # Fallback if template doesn't exist - create a very basic doc
            from docx import Document
            fallback_doc = Document()
            fallback_doc.add_heading(document.full_name, 0)
            fallback_doc.add_paragraph(f"{document.email} | {document.phone} | {' | '.join(document.links)}")
            fallback_doc.add_paragraph(document.summary)
            
            fallback_doc.add_heading("Experience", level=1)
            for exp in document.experience:
                fallback_doc.add_heading(f"{exp.role} at {exp.company}", level=2)
                date_parts = [part for part in [exp.start_date, exp.end_date] if part]
                if date_parts:
                    fallback_doc.add_paragraph(" | ".join(date_parts))
                for bullet in exp.bullets:
                    fallback_doc.add_paragraph(bullet, style='List Bullet')
            
            fallback_doc.add_heading("Skills", level=1)
            fallback_doc.add_paragraph(", ".join(document.skills))
            
            target = io.BytesIO()
            fallback_doc.save(target)
            return target.getvalue()

        # Context for docxtpl
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
                    "bullets": exp.bullets
                }
                for exp in document.experience
            ],
            "skills": document.skills,
            "skills_csv": ", ".join(document.skills)
        }

        doc.render(context)
        
        target = io.BytesIO()
        doc.save(target)
        return target.getvalue()

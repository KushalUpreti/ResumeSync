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
            fallback_doc.add_heading(f"Resume: {document.resume_id}", 0)
            fallback_doc.add_paragraph(document.summary)
            
            experience_heading = fallback_doc.add_heading("Experience", level=1)
            for exp in document.experience:
                fallback_doc.add_heading(f"{exp.role} at {exp.company}", level=2)
                for bullet in exp.bullets:
                    fallback_doc.add_paragraph(bullet, style='List Bullet')
            
            fallback_doc.add_heading("Skills", level=1)
            fallback_doc.add_paragraph(", ".join(document.skills))
            
            target = io.BytesIO()
            fallback_doc.save(target)
            return target.getvalue()

        # Context for docxtpl
        context = {
            "summary": document.summary,
            "experience": [
                {
                    "company": exp.company,
                    "role": exp.role,
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

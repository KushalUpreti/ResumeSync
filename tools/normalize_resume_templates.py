from __future__ import annotations

import shutil
import tempfile
import zipfile
from pathlib import Path

from docx import Document


TEMPLATE_DIR = Path("server/app/static/templates")
TEMPLATES = ["modern", "professional", "executive"]


def replace_required(xml: str, old: str, new: str, template: str) -> str:
    if old not in xml:
        raise ValueError(f"{template}: expected XML fragment not found: {old[:120]}")
    return xml.replace(old, new)


def normalize_spacing(xml: str) -> str:
    replacements = {
        '<w:spacing w:before="160" w:after="50" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="160" w:after="40" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="140" w:after="60" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="80" w:after="20" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="80" w:after="0" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="60" w:after="0" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="40" w:after="0" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="40" w:after="20" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="40" w:after="30" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="30" w:after="30" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="28" w:after="28" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
        '<w:spacing w:before="0" w:after="20" w:line="240" w:lineRule="auto"/>': '<w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/>',
    }

    for old, new in replacements.items():
        xml = xml.replace(old, new)
    return xml


def normalize_optional_location(xml: str, template: str) -> str:
    xml = xml.replace(
        "{{ item.company }}   \u00b7   {{ item.location | default('') }}",
        "{{ item.company }}{{ ('   \u00b7   ' + item.location) if item.location else '' }}",
    )
    xml = xml.replace(
        "{{ item.institution }}   \u00b7   {{ item.location | default('') }}",
        "{{ item.institution }}{{ ('   \u00b7   ' + item.location) if item.location else '' }}",
    )
    xml = xml.replace(
        "{{ item.company }},  </w:t>",
        "{{ item.company }}{{ ', ' if item.location else '' }}</w:t>",
    )
    xml = xml.replace(
        "{{ item.institution }},  {{ item.location | default('') }}",
        "{{ item.institution }}{{ (', ' + item.location) if item.location else '' }}",
    )

    if template == "modern":
        xml = xml.replace(
            "\u25be  {{ item.location | default('') }}",
            "{{ ('\u25be  ' + item.location) if item.location else '' }}",
        )

    return xml


def patch_docx(path: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(path, "r") as source:
            source.extractall(tmp_path)

        document_path = tmp_path / "word" / "document.xml"
        xml = document_path.read_text(encoding="utf-8")
        xml = normalize_spacing(xml)
        xml = normalize_optional_location(xml, path.stem)
        document_path.write_text(xml, encoding="utf-8")

        staged = path.with_suffix(".patched.docx")
        with zipfile.ZipFile(staged, "w", zipfile.ZIP_DEFLATED) as target:
            for file_path in tmp_path.rglob("*"):
                if file_path.is_file():
                    target.write(file_path, file_path.relative_to(tmp_path).as_posix())

        shutil.move(staged, path)

    normalize_location_runs(path)


def normalize_location_runs(path: Path) -> None:
    doc = Document(path)
    changed = False

    for paragraph in doc.paragraphs:
        text = paragraph.text

        if "{{ item.company }}" in text and "{{ item.location | default('') }}" in text:
            changed = normalize_run_sequence(
                paragraph,
                "{{ item.company }}",
                "{{ '   \u00b7   ' if item.location else '' }}",
                "{{ item.location }}",
            ) or changed

        if "{{ item.institution }}" in text and "{{ item.location | default('') }}" in text:
            changed = normalize_run_sequence(
                paragraph,
                "{{ item.institution }}",
                "{{ '   \u00b7   ' if item.location else '' }}",
                "{{ item.location }}",
            ) or changed

        if "{{ ('   \u00b7   ' + item.location) if item.location else '' }}" in text:
            for run in paragraph.runs:
                if run.text == "{{ ('   \u00b7   ' + item.location) if item.location else '' }}":
                    run.text = "{{ '   \u00b7   ' if item.location else '' }}"
                    changed = True

    if changed:
        doc.save(path)


def normalize_run_sequence(paragraph: object, anchor: str, separator: str, location: str) -> bool:
    runs = paragraph.runs

    for index, run in enumerate(runs):
        if run.text != anchor:
            continue

        location_index = next(
            (
                candidate
                for candidate in range(index + 1, len(runs))
                if runs[candidate].text == "{{ item.location | default('') }}"
            ),
            None,
        )
        if location_index is None:
            return False

        for candidate in range(index + 1, location_index):
            if runs[candidate].text.strip() in {"\u00b7", ","}:
                runs[candidate].text = separator
                break
            if runs[candidate].text in {",  ", "   \u00b7   "}:
                runs[candidate].text = separator
                break
        else:
            runs[index].text = anchor + separator

        runs[location_index].text = location
        return True

    return False


def main() -> None:
    for template in TEMPLATES:
        patch_docx(TEMPLATE_DIR / f"{template}.docx")
        print(f"normalized {template}.docx")


if __name__ == "__main__":
    main()

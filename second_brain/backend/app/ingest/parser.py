"""PyMuPDF parser: text extraction, slide rendering (150 dpi), and vision need detection."""
from dataclasses import dataclass
from typing import List
import fitz  # PyMuPDF


@dataclass
class ParsedSlide:
    n: int  # 1-based slide index
    text: str
    png_bytes: bytes
    needs_vision: bool = False


def parse_pdf(pdf_bytes: bytes, max_pages: int = 40) -> List[ParsedSlide]:
    """Parse a PDF document into slides.

    - Validates PDF format and encryption
    - Enforces maximum page cap (40 pages)
    - Extracts raw text per page
    - Renders each page to PNG (150 dpi) in memory
    - Flags slide for vision if text < 40 characters OR image coverage > 60%
    """
    if not pdf_bytes:
        raise ValueError("Empty PDF file provided")

    if not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError("File does not start with valid PDF magic bytes")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Corrupt or invalid PDF: {str(e)}") from e

    try:
        if doc.is_encrypted:
            # Try to authenticate with empty password; if fails, reject
            if not doc.authenticate(""):
                raise ValueError("Password-protected or encrypted PDFs are not supported")

        page_count = doc.page_count
        if page_count == 0:
            raise ValueError("PDF contains no pages")
        if page_count > max_pages:
            raise ValueError(f"PDF exceeds maximum page limit ({page_count} > {max_pages})")

        slides: List[ParsedSlide] = []

        for i, page in enumerate(doc):
            slide_num = i + 1
            text = page.get_text("text").strip()

            # Calculate image coverage area
            page_rect = page.rect
            page_area = page_rect.width * page_rect.height
            total_img_area = 0.0

            try:
                for img in page.get_images():
                    xref = img[0]
                    for img_rect in page.get_image_rects(xref):
                        total_img_area += img_rect.width * img_rect.height
            except Exception:
                pass

            img_coverage = (total_img_area / page_area) if page_area > 0 else 0.0

            # Trigger vision rule: text < 40 chars OR image area > 60%
            needs_vision = (len(text) < 40) or (img_coverage > 0.6)

            # Render page to PNG at 150 dpi
            pix = page.get_pixmap(dpi=150)
            png_bytes = pix.tobytes("png")

            slides.append(
                ParsedSlide(
                    n=slide_num,
                    text=text,
                    png_bytes=png_bytes,
                    needs_vision=needs_vision,
                )
            )

        return slides

    finally:
        doc.close()

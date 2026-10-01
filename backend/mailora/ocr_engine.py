"""
Mailora - OCR Engine
=====================
Extracts text from PDF and image files using Tesseract OCR.
Falls back gracefully on a per-page basis.
"""
import io
import time
from dataclasses import dataclass, field
from typing import Optional, List

from mailora.logger import get_logger

log = get_logger("mailora.ocr")


@dataclass
class OcrPage:
    page_number: int
    raw_text: str
    confidence: float  # 0-100


@dataclass
class OcrResult:
    engine: str
    pages: List[OcrPage] = field(default_factory=list)
    raw_text: str = ""
    structured_json: Optional[dict] = None
    confidence_score: float = 0.0
    pages_processed: int = 0
    processing_time_ms: int = 0
    error_message: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error_message is None and self.pages_processed > 0


def _run_tesseract(image_bytes: bytes, lang: str = "eng") -> OcrPage:
    """
    Run Tesseract OCR on raw image bytes.
    Returns an OcrPage with text and mean confidence.
    """
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        # Get data including confidence per word
        data = pytesseract.image_to_data(
            img, lang=lang, output_type=pytesseract.Output.DICT
        )
        # Filter out empty/noise entries
        texts = []
        confidences = []
        for i, text in enumerate(data["text"]):
            conf = float(data["conf"][i])
            if conf > 0 and text.strip():
                texts.append(text)
                confidences.append(conf)

        raw_text = " ".join(texts)
        mean_conf = sum(confidences) / len(confidences) if confidences else 0.0
        return OcrPage(page_number=1, raw_text=raw_text, confidence=round(mean_conf, 2))

    except ImportError:
        raise RuntimeError(
            "pytesseract is not installed. Run: pip install pytesseract"
        )


def _pdf_to_images(pdf_bytes: bytes, dpi: int = 300) -> List[bytes]:
    """
    Convert each PDF page to a PNG image (bytes).
    Requires pdf2image + poppler.
    """
    try:
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(pdf_bytes, dpi=dpi, fmt="png")
        result = []
        for img in images:
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            result.append(buf.getvalue())
        return result
    except ImportError:
        raise RuntimeError(
            "pdf2image is not installed. Run: pip install pdf2image\n"
            "Also install poppler: sudo apt-get install poppler-utils"
        )


def _build_structured_json(pages: List[OcrPage]) -> dict:
    """Build a structured JSON representation of OCR output."""
    return {
        "pages": [
            {
                "page": p.page_number,
                "text": p.raw_text,
                "confidence": p.confidence,
                "word_count": len(p.raw_text.split()),
            }
            for p in pages
        ],
        "total_pages": len(pages),
        "total_words": sum(len(p.raw_text.split()) for p in pages),
        "mean_confidence": round(
            sum(p.confidence for p in pages) / len(pages) if pages else 0, 2
        ),
    }


class OcrEngine:
    """
    OCR engine that processes PDF and image attachments.
    """

    def __init__(self, engine: str = "tesseract", language: str = "eng", dpi: int = 300):
        self.engine = engine
        self.language = language
        self.dpi = dpi

    def process(self, data: bytes, content_type: str, filename: str) -> OcrResult:
        """
        Main entry: detect type, run OCR, return OcrResult.
        """
        t_start = time.time()
        result = OcrResult(engine=self.engine)

        try:
            if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
                result = self._process_pdf(data)
            elif content_type.startswith("image/"):
                result = self._process_image(data)
            else:
                result.error_message = f"Unsupported content type: {content_type}"
                return result

        except Exception as e:
            log.error(f"OCR failed for {filename}: {e}")
            result.error_message = str(e)

        result.processing_time_ms = int((time.time() - t_start) * 1000)
        result.engine = self.engine
        return result

    def _process_pdf(self, pdf_bytes: bytes) -> OcrResult:
        """Convert PDF → images → OCR each page."""
        result = OcrResult(engine=self.engine)
        log.debug(f"PDF size: {len(pdf_bytes):,} bytes — converting to images (dpi={self.dpi})")

        try:
            image_list = _pdf_to_images(pdf_bytes, dpi=self.dpi)
        except RuntimeError as e:
            result.error_message = str(e)
            return result

        log.debug(f"PDF converted: {len(image_list)} page(s)")

        for page_num, img_bytes in enumerate(image_list, start=1):
            try:
                page = _run_tesseract(img_bytes, lang=self.language)
                page.page_number = page_num
                result.pages.append(page)
                log.debug(f"  Page {page_num}: {len(page.raw_text)} chars, conf={page.confidence}")
            except Exception as e:
                log.warning(f"  Page {page_num} OCR failed: {e}")
                result.pages.append(OcrPage(page_number=page_num, raw_text="", confidence=0.0))

        result.pages_processed = len(result.pages)
        result.raw_text = "\n\n".join(p.raw_text for p in result.pages).strip()
        result.structured_json = _build_structured_json(result.pages)
        result.confidence_score = round(
            sum(p.confidence for p in result.pages) / result.pages_processed
            if result.pages_processed > 0 else 0.0, 2
        )
        return result

    def _process_image(self, image_bytes: bytes) -> OcrResult:
        """Run OCR directly on an image."""
        result = OcrResult(engine=self.engine)
        try:
            page = _run_tesseract(image_bytes, lang=self.language)
            result.pages = [page]
            result.pages_processed = 1
            result.raw_text = page.raw_text
            result.structured_json = _build_structured_json(result.pages)
            result.confidence_score = page.confidence
            log.debug(f"Image OCR: {len(page.raw_text)} chars, conf={page.confidence}")
        except Exception as e:
            result.error_message = str(e)
        return result

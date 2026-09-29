"""
NWIS - Phase 2 Document Intelligence & Vector Pipeline Tests

Covers:
- valid PDF
- invalid PDF
- empty PDF
- multiple pages
- OCR fallback
- Gemini unavailable
- extraction
- malformed extraction
- unknown fields
- document processing failure
- successful development pipeline
- OCR failure
- extraction failure
- embedding provider unavailable
- vector DB failure
- retry
- duplicate document (idempotency)
- metadata preservation
"""

import io
import pytest
import pymupdf
from unittest.mock import patch, AsyncMock

from app.schemas.document import (
    DocumentProcessingStatus,
    DrillingEventType,
    DocumentExtractionResult
)
from app.services.documents.validator import validate_pdf_document
from app.services.documents.pdf_processor import PDFProcessor, PDFProcessingError
from app.services.ocr.base import OCRResult, OCRProviderUnavailableError
from app.services.ocr.gemini_provider import GeminiVisionOCRProvider
from app.services.ocr.dev_provider import DevelopmentOCRProvider
from app.services.ocr.service import OCRService
from app.services.nlp.drilling_extractor import NLPExtractor
from app.services.documents.chunker import DocumentChunker
from app.services.embeddings.base import EmbeddingProviderUnavailableError
from app.services.embeddings.service import EmbeddingService
from app.services.documents.vector_storage import VectorStorageService, VectorStorageError, vector_storage_service
from app.services.document_pipeline import DocumentPipeline
from app.services.documents.repository import document_repository


# ==============================================================================
# 1. VALID PDF TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_valid_pdf_validation_and_processing(valid_drilling_pdf):
    # Test validation
    is_valid, err = validate_pdf_document("ddr_report.pdf", valid_drilling_pdf, "application/pdf")
    assert is_valid is True
    assert err is None

    # Test pipeline processing
    pipeline = DocumentPipeline()
    result = await pipeline.process_document_bytes(
        content=valid_drilling_pdf,
        filename="ddr_report.pdf"
    )
    assert result.processing_status == DocumentProcessingStatus.COMPLETED.value
    assert result.page_count == 1
    assert result.error_message is None
    assert len(result.pages) == 1
    assert result.pages[0].page_number == 1
    assert result.pages[0].text_source == "digital_pdf"
    assert result.chunk_count > 0
    assert len(result.chunks) > 0


# ==============================================================================
# 2. INVALID PDF TEST
# ==============================================================================
def test_invalid_pdf_validation():
    # Wrong extension
    is_valid, err = validate_pdf_document("report.txt", b"Some random text", "text/plain")
    assert is_valid is False
    assert "Invalid file extension" in err

    # PDF extension but fake non-PDF content (missing %PDF- magic bytes)
    is_valid, err = validate_pdf_document("fake.pdf", b"This is plain text disguised as pdf", "application/pdf")
    assert is_valid is False
    assert "Missing standard %PDF header" in err

    # Invalid MIME type
    is_valid, err = validate_pdf_document("image.pdf", b"%PDF-1.4 dummy", "image/png")
    assert is_valid is False
    assert "Invalid MIME type" in err


# ==============================================================================
# 3. EMPTY PDF TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_empty_pdf_validation_and_pipeline():
    # Zero bytes
    is_valid, err = validate_pdf_document("empty.pdf", b"", "application/pdf")
    assert is_valid is False
    assert "empty (0 bytes)" in err

    # Empty content in pipeline
    pipeline = DocumentPipeline()
    result = await pipeline.process_document_bytes(
        content=b"",
        filename="empty.pdf"
    )
    assert result.processing_status == DocumentProcessingStatus.FAILED.value
    assert "empty (0 bytes)" in result.error_message


# ==============================================================================
# 4. MULTIPLE PAGES TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_multiple_pages_relationships(multipage_pdf):
    pipeline = DocumentPipeline()
    result = await pipeline.process_document_bytes(
        content=multipage_pdf,
        filename="multipage_well_report.pdf"
    )

    assert result.processing_status == DocumentProcessingStatus.COMPLETED.value
    assert result.page_count == 3
    assert len(result.pages) == 3

    # Verify 1-indexed page numbers and document-to-page relationships
    for idx, page in enumerate(result.pages):
        expected_page_num = idx + 1
        assert page.page_number == expected_page_num
        assert page.document_id == result.document_id
        assert len(page.text) > 0

    assert "BOR-08" in result.pages[0].text
    assert "Tipam" in result.pages[1].text


# ==============================================================================
# 5. OCR FALLBACK TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_ocr_fallback_on_scanned_page():
    """Simulates a PDF page with an image and no digital text."""
    doc = pymupdf.open()
    doc.new_page()
    scanned_pdf_bytes = doc.tobytes()
    doc.close()

    dev_provider = DevelopmentOCRProvider()
    dev_provider.register_test_page_text(1, "Well: NHK-SCAN-01\nROP: 16.5 m/hr\nKick detected at 2900 m")

    ocr_svc = OCRService(dev_provider=dev_provider)
    pipeline = DocumentPipeline(ocr_svc=ocr_svc)

    result = await pipeline.process_document_bytes(
        content=scanned_pdf_bytes,
        filename="scanned_report.pdf"
    )

    assert result.processing_status == DocumentProcessingStatus.COMPLETED.value
    assert result.ocr_provider == "development"
    assert result.pages[0].text_source == "ocr"
    assert result.pages[0].ocr_provider == "development"
    assert result.ocr_provider != "gemini"


# ==============================================================================
# 6. GEMINI UNAVAILABLE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_gemini_unavailable_fallback():
    """
    Verifies that when GEMINI_API_KEY is missing or Gemini throws an error,
    the pipeline falls back smoothly to development OCR and records ocr_provider = 'development'.
    """
    doc = pymupdf.open()
    doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()

    mock_gemini = GeminiVisionOCRProvider()
    with patch.object(mock_gemini, "is_available", return_value=True):
        with patch.object(
            mock_gemini,
            "extract_text",
            side_effect=OCRProviderUnavailableError("Gemini API connection timeout")
        ):
            dev_ocr = DevelopmentOCRProvider()
            dev_ocr.register_test_page_text(1, "Well Name: FALLBACK-01\nField: Nahorkatiya")
            ocr_svc = OCRService(gemini_provider=mock_gemini, dev_provider=dev_ocr)

            ocr_result = await ocr_svc.extract_text_from_image(b"fake_image_bytes", page_number=1)
            assert ocr_result.ocr_provider == "development"
            assert ocr_result.is_fallback is True
            assert ocr_result.ocr_provider != "gemini"

            pipeline = DocumentPipeline(ocr_svc=ocr_svc)
            result = await pipeline.process_document_bytes(pdf_bytes, "fallback_test.pdf")
            assert result.ocr_provider == "development"
            assert result.header.well_name == "FALLBACK-01"


# ==============================================================================
# 7. EXTRACTION TEST (Headers, Events, Parameters)
# ==============================================================================
def test_drilling_nlp_extraction(sample_drilling_text):
    extractor = NLPExtractor()

    # Header extraction
    header = extractor.extract_header_from_text(sample_drilling_text, document_id="doc-test-1", page_number=1)
    assert header.well_name == "NHK-421"
    assert header.well_id == "OIL-NHK-421"
    assert header.field == "Nahorkatiya"
    assert header.block == "AA-ONHP-2018/1"
    assert "Assam" in header.location
    assert "Barail" in header.formation
    assert header.depth == 3450.0
    assert header.measured_depth == 3450.0
    assert header.true_vertical_depth == 3120.0
    assert header.drilling_date == "2026-03-29"
    assert header.document_type == "Daily Drilling Report"
    assert header.document_id == "doc-test-1"
    assert header.page_number == 1
    assert header.confidence is not None

    # Events extraction
    events = extractor.extract_events_from_text(sample_drilling_text, document_id="doc-test-1", page_number=1)
    event_types = [e.event_type for e in events]
    assert DrillingEventType.KICK.value in event_types
    assert DrillingEventType.LOST_CIRCULATION.value in event_types
    assert DrillingEventType.FORMATION_EVENT.value in event_types

    kick_event = next(e for e in events if e.event_type == DrillingEventType.KICK.value)
    assert kick_event.severity in ["critical", "high"]
    assert kick_event.depth == 3450.0
    assert kick_event.document_id == "doc-test-1"
    assert kick_event.page_number == 1
    assert kick_event.source_text is not None

    # Parameters extraction
    params = extractor.extract_parameters_from_text(sample_drilling_text, page_number=1)
    assert params is not None
    assert params.rop == 18.5
    assert params.wob == 15.2
    assert params.rpm == 110.0
    assert params.mud_weight == 11.4
    assert params.flow_rate == 620.0
    assert params.pump_pressure == 2850.0
    assert params.standpipe_pressure == 2900.0
    assert params.additional_parameters.get("torque") == 14.5
    assert params.page_number == 1
    assert params.source_text is not None
    assert params.confidence is not None


# ==============================================================================
# 8. MALFORMED EXTRACTION TEST
# ==============================================================================
def test_malformed_extraction_graceful_handling():
    extractor = NLPExtractor()
    noisy_text = "###@@@!!! 12345 Random gibberish without any standard drilling structure %%%&&&"

    header = extractor.extract_header_from_text(noisy_text, document_id="doc-noise", page_number=1)
    assert header is not None
    assert header.well_name is None
    assert header.field is None

    events = extractor.extract_events_from_text(noisy_text)
    assert events == []

    params = extractor.extract_parameters_from_text(noisy_text)
    assert params is None


# ==============================================================================
# 9. UNKNOWN FIELDS TEST (Zero Hallucination Constraint)
# ==============================================================================
def test_unknown_fields_remain_null():
    extractor = NLPExtractor()
    partial_text = (
        "DAILY DRILLING LOG\n"
        "Well Name: TEST-WELL-09\n"
        "Current Depth: 1500 m\n"
        "ROP: 22.5 m/hr\n"
    )

    header = extractor.extract_header_from_text(partial_text)
    assert header.well_name == "TEST-WELL-09"
    assert header.depth == 1500.0
    assert header.well_id is None
    assert header.field is None
    assert header.block is None
    assert header.location is None
    assert header.formation is None
    assert header.true_vertical_depth is None
    assert header.drilling_date is None

    params = extractor.extract_parameters_from_text(partial_text)
    assert params.rop == 22.5
    assert params.wob is None
    assert params.rpm is None
    assert params.mud_weight is None
    assert params.flow_rate is None
    assert params.pump_pressure is None
    assert params.standpipe_pressure is None


# ==============================================================================
# 10. DOCUMENT PROCESSING FAILURE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_corrupted_document_processing_failure():
    corrupted_bytes = b"%PDF-1.4 \x00\xff\xfe CORRUPTED STRUCTURAL DATA HERE NO TRAILER OR XREF"
    pipeline = DocumentPipeline()
    result = await pipeline.process_document_bytes(corrupted_bytes, "corrupt.pdf")

    assert result.processing_status == DocumentProcessingStatus.FAILED.value
    assert result.error_message is not None
    assert "Corrupted or malformed PDF" in result.error_message or "unable to parse" in result.error_message

    err_lower = result.error_message.lower()
    assert "password" not in err_lower
    assert "key=" not in err_lower
    assert "secret=" not in err_lower
    assert "token=" not in err_lower


# ==============================================================================
# 11. END-TO-END SUCCESSFUL DEVELOPMENT PIPELINE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_successful_end_to_end_pipeline(valid_drilling_pdf):
    pipeline = DocumentPipeline()
    result = await pipeline.process_document_bytes(
        content=valid_drilling_pdf,
        filename="complete_flow_report.pdf",
        well_id="OIL-NHK-421"
    )

    assert result.processing_status == DocumentProcessingStatus.COMPLETED.value
    assert result.page_count == 1
    assert result.chunk_count > 0
    assert len(result.chunks) > 0

    # Verify vector embeddings
    for chunk in result.chunks:
        assert chunk.embedding is not None
        assert len(chunk.embedding) == 384
        assert chunk.document_id == result.document_id

    # Verify stored in vector storage
    stored_chunks = await vector_storage_service.get_chunks_by_document(result.document_id)
    assert len(stored_chunks) == result.chunk_count


# ==============================================================================
# 12. OCR FAILURE STAGE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_ocr_failure_stage():
    """When OCR provider fails completely, pipeline handles failure gracefully."""
    doc = pymupdf.open()
    doc.new_page()
    scanned_bytes = doc.tobytes()
    doc.close()

    mock_ocr = OCRService()
    with patch.object(mock_ocr, "extract_text_from_image", side_effect=RuntimeError("Optical sensor hardware failure")):
        pipeline = DocumentPipeline(ocr_svc=mock_ocr)
        result = await pipeline.process_document_bytes(scanned_bytes, "ocr_fail.pdf", force_ocr=True)

        assert result.processing_status == DocumentProcessingStatus.FAILED.value
        assert result.error_message is not None
        assert "Optical sensor hardware failure" in result.error_message or "error occurred" in result.error_message.lower()


# ==============================================================================
# 13. EXTRACTION FAILURE STAGE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_extraction_failure_stage(valid_drilling_pdf):
    """When NLP extraction encounters an error, pipeline records failure without crashing."""
    mock_nlp = NLPExtractor()
    with patch.object(mock_nlp, "process_extracted_pages", side_effect=ValueError("NLP model parsing corrupted")):
        pipeline = DocumentPipeline(nlp=mock_nlp)
        result = await pipeline.process_document_bytes(valid_drilling_pdf, "nlp_fail.pdf")

        assert result.processing_status == DocumentProcessingStatus.FAILED.value
        assert result.error_message is not None
        assert "NLP model parsing corrupted" in result.error_message or "error occurred" in result.error_message.lower()


# ==============================================================================
# 14. EMBEDDING PROVIDER UNAVAILABLE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_embedding_provider_unavailable(valid_drilling_pdf):
    """
    When the real embedding provider is unavailable and dev fallback is disabled,
    pipeline reports provider unavailable.
    When dev fallback is enabled, dev embeddings are generated and clearly flagged.
    """
    emb_svc = EmbeddingService()
    # Ensure production is unconfigured
    with patch.object(emb_svc.prod_provider, "is_available", return_value=False):
        # 1. When fallback is disabled: must raise EmbeddingProviderUnavailableError
        with pytest.raises(EmbeddingProviderUnavailableError):
            await emb_svc.embed_text("Sample text", allow_dev_fallback=False)

        # 2. When fallback is enabled: uses dev provider with explicit tag
        vec, provider, is_prod = await emb_svc.embed_text("Sample text", allow_dev_fallback=True)
        assert provider == "development"
        assert is_prod is False
        assert len(vec) == 384


# ==============================================================================
# 15. VECTOR DB FAILURE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_vector_db_failure_handling(valid_drilling_pdf):
    """When vector database insertion fails, pipeline enters FAILED state."""
    mock_vector_svc = VectorStorageService()
    with patch.object(
        mock_vector_svc,
        "store_chunks",
        side_effect=VectorStorageError("pgvector connection refused at port 5432")
    ):
        pipeline = DocumentPipeline(vector_storage=mock_vector_svc)
        result = await pipeline.process_document_bytes(valid_drilling_pdf, "vector_fail.pdf")

        assert result.processing_status == DocumentProcessingStatus.FAILED.value
        assert result.error_message is not None
        assert "pgvector connection refused" in result.error_message or "error occurred" in result.error_message.lower()


# ==============================================================================
# 16. RETRY MECHANISM TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_pipeline_retry_mechanism(valid_drilling_pdf):
    """
    Simulates a transient failure on the first run, followed by a successful retry.
    """
    pipeline = DocumentPipeline()

    # First run fails during embedding
    with patch.object(pipeline.embedding_service, "embed_chunks", side_effect=RuntimeError("Transient timeout")):
        fail_res = await pipeline.process_document_bytes(valid_drilling_pdf, "retry_doc.pdf")
        assert fail_res.processing_status == DocumentProcessingStatus.FAILED.value
        doc_id = fail_res.document_id

    # Retry should reload from storage, reprocess, and complete
    retry_res = await pipeline.retry_processing(doc_id)
    assert retry_res.processing_status == DocumentProcessingStatus.COMPLETED.value
    assert retry_res.document_id == doc_id
    assert retry_res.chunk_count > 0


# ==============================================================================
# 17. DUPLICATE DOCUMENT & IDEMPOTENCY TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_idempotency_duplicate_document(valid_drilling_pdf):
    """
    Submitting the exact same PDF bytes twice returns the existing result
    and does not re-process or duplicate vector storage rows.
    """
    pipeline = DocumentPipeline()

    # First upload
    res1 = await pipeline.process_document_bytes(valid_drilling_pdf, "idempotent_test.pdf")
    assert res1.processing_status == DocumentProcessingStatus.COMPLETED.value
    assert res1.is_duplicate is False
    doc1_id = res1.document_id

    stored_count_1 = len(await vector_storage_service.get_chunks_by_document(doc1_id))

    # Second upload with same content
    res2 = await pipeline.process_document_bytes(valid_drilling_pdf, "idempotent_test.pdf")
    assert res2.is_duplicate is True
    assert res2.document_id == doc1_id

    # Verify vector storage was not duplicated
    stored_count_2 = len(await vector_storage_service.get_chunks_by_document(doc1_id))
    assert stored_count_2 == stored_count_1


# ==============================================================================
# 18. METADATA PRESERVATION TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_chunks_metadata_preservation(valid_drilling_pdf):
    """
    Verifies that all chunks preserve:
      document_id, well_id, page_number, section, formation,
      depth_start, depth_end, document_type, source
    """
    pipeline = DocumentPipeline()
    result = await pipeline.process_document_bytes(
        content=valid_drilling_pdf,
        filename="meta_preservation.pdf",
        well_id="OIL-NHK-421"
    )

    assert result.chunk_count > 0
    for chunk in result.chunks:
        assert chunk.document_id == result.document_id
        assert chunk.well_id == "OIL-NHK-421"
        assert chunk.page_number >= 1
        assert chunk.section is not None
        assert chunk.source in ["digital_pdf", "ocr:development", "ocr:gemini"]
        assert chunk.metadata["document_id"] == result.document_id
        assert chunk.metadata["well_id"] == "OIL-NHK-421"
        assert "section" in chunk.metadata

    # Check that Barail formation was captured
    formations = [c.formation for c in result.chunks if c.formation]
    assert any("Barail" in f for f in formations)

    # Check that depth was captured
    depths = [c.depth_start for c in result.chunks if c.depth_start]
    assert any(d == 3450.0 for d in depths)


# ==============================================================================
# 19. SUCCESSFUL DEVELOPMENT PIPELINE API TEST (End-to-End via TestClient)
# ==============================================================================
def test_successful_development_pipeline_api(client, valid_drilling_pdf):
    # 1. Upload Document
    upload_file = ("report_api.pdf", valid_drilling_pdf, "application/pdf")
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": upload_file},
        data={"well_id": "OIL-NHK-421", "document_type": "Daily Drilling Report"}
    )
    assert response.status_code == 201
    upload_data = response.json()
    doc_id = upload_data["document_id"]
    assert upload_data["processing_status"] in ["completed", "uploaded", "processing"]
    assert doc_id is not None

    # 2. Check Document Status
    status_res = client.get(f"/api/v1/documents/{doc_id}/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["document_id"] == doc_id
    assert status_data["processing_status"] == DocumentProcessingStatus.COMPLETED.value
    assert status_data["page_count"] == 1
    assert status_data["chunk_count"] > 0
    assert status_data["error_message"] is None

    # 3. Check Document Detailed Extraction
    extract_res = client.get(f"/api/v1/documents/{doc_id}/extraction")
    assert extract_res.status_code == 200
    extract_data = extract_res.json()
    assert extract_data["document_id"] == doc_id
    assert extract_data["header"]["well_name"] == "NHK-421"
    assert extract_data["header"]["field"] == "Nahorkatiya"
    assert len(extract_data["events"]) >= 1
    assert extract_data["parameters"]["rop"] == 18.5
    assert extract_data["parameters"]["mud_weight"] == 11.4

    # 4. Check Chunks Endpoint
    chunks_res = client.get(f"/api/v1/documents/{doc_id}/chunks")
    assert chunks_res.status_code == 200
    chunks_data = chunks_res.json()
    assert len(chunks_data) > 0
    assert chunks_data[0]["document_id"] == doc_id
    assert chunks_data[0]["well_id"] == "OIL-NHK-421"
    assert chunks_data[0]["embedding"] is not None
    assert len(chunks_data[0]["embedding"]) == 384

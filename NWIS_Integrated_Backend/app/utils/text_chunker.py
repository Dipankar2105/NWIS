"""
NWIS - Text Chunking Utilities (Harmonized Architecture)
"""

from typing import List, Dict, Any, Optional
import re


def chunk_text(
    text: str, 
    chunk_size: int = 1000, 
    overlap: int = 200
) -> List[str]:
    """
    Split text into overlapping chunks, trying to split at sentence boundaries.
    
    Args:
        text: Input text to chunk
        chunk_size: Target size of each chunk in characters
        overlap: Overlap between chunks in characters
        
    Returns:
        List of text chunks
    """
    if not text or len(text) <= chunk_size:
        return [text] if text else []
    
    # Try to split at sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
            current_chunk = overlap_text + " " + sentence
        else:
            current_chunk += " " + sentence if current_chunk else sentence
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks


def chunk_with_metadata(
    text: str,
    well_id: str,
    document_type: str,
    formation: Optional[str] = None,
    chunk_size: int = 1000,
    overlap: int = 200
) -> List[Dict[str, Any]]:
    """
    Chunk text and attach metadata to each chunk.
    """
    chunks = chunk_text(text, chunk_size, overlap)
    result = []
    for i, chunk in enumerate(chunks):
        metadata = {
            "well_id": well_id,
            "document_type": document_type,
        }
        if formation:
            metadata["formation"] = formation
        
        result.append({
            "chunk_text": chunk,
            "chunk_index": i,
            "metadata": metadata
        })
    
    return result

import asyncio
import httpx
from typing import List, Optional
from app.config import settings
from loguru import logger


class EmbeddingService:
    """Embedding service using HuggingFace Inference API."""
    
    def __init__(self):
        """Initialize with HF API key."""
        self.api_key = settings.HF_API_KEY
        self.model = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION
        self.base_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model}"
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
    
    async def create_embedding(
        self, 
        text: str, 
        max_retries: int = 3
    ) -> List[float]:
        """
        Create embedding for a single text.
        
        Args:
            text: Input text
            max_retries: Maximum retry attempts
            
        Returns:
            384-dimension vector
        """
        # Truncate text if too long (model has max token limit)
        max_length = 512  # Approximate token limit for bge-small
        if len(text) > max_length * 4:  # Rough char to token ratio
            text = text[:max_length * 4]
        
        payload = {
            "inputs": text,
            "options": {"wait_for_model": True}
        }
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.base_url,
                        headers=self.headers,
                        json=payload
                    )
                
                if response.status_code == 200:
                    embedding = response.json()
                    if isinstance(embedding, list) and len(embedding) == self.dimension:
                        logger.debug(f"Embedding created successfully (dim={len(embedding)})")
                        return embedding
                    else:
                        logger.warning(f"Unexpected embedding format: {type(embedding)}")
                elif response.status_code == 503:
                    # Model loading
                    logger.info(f"Model loading, waiting... (attempt {attempt + 1})")
                    await asyncio.sleep(10)
                else:
                    logger.warning(f"HF API error {response.status_code}: {response.text}")
                    
            except httpx.TimeoutException:
                logger.warning(f"Embedding request timeout (attempt {attempt + 1})")
            except Exception as e:
                logger.warning(f"Embedding attempt {attempt + 1} failed: {str(e)}")
            
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
        
        # Return zero vector as fallback
        logger.error("Embedding failed, returning zero vector")
        return [0.0] * self.dimension
    
    async def create_embeddings_batch(
        self, 
        texts: List[str], 
        batch_size: int = 10,
        delay_between_batches: float = 1.0
    ) -> List[List[float]]:
        """
        Create embeddings for multiple texts in batches.
        
        Args:
            texts: List of input texts
            batch_size: Number of texts per batch
            delay_between_batches: Delay between batches in seconds
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            logger.info(f"Processing embedding batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size} ({len(batch)} texts)")
            
            batch_embeddings = []
            for text in batch:
                embedding = await self.create_embedding(text)
                batch_embeddings.append(embedding)
            
            embeddings.extend(batch_embeddings)
            
            # Delay between batches to respect rate limits
            if i + batch_size < len(texts):
                await asyncio.sleep(delay_between_batches)
        
        return embeddings
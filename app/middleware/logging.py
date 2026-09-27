import sys
from loguru import logger
from app.config import settings


def setup_logging():
    """Configure loguru logger for the application."""
    # Remove default handler
    logger.remove()
    
    # Add console handler with custom format
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    
    logger.add(
        sys.stdout,
        format=log_format,
        level="DEBUG" if settings.DEBUG else "INFO",
        colorize=True,
    )
    
    # Add file handler for production
    if settings.APP_ENV == "production":
        logger.add(
            "logs/nwis_{time:YYYY-MM-DD}.log",
            format=log_format,
            level="INFO",
            rotation="1 day",
            retention="30 days",
            compression="zip",
        )
    
    return logger


# Initialize logger
setup_logging()

# Export logger instance
__all__ = ["logger"]
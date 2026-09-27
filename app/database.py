import logging
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """
    Creates and returns a Supabase client using the anon key.
    This client respects RLS policies and is used for frontend-facing queries.
    """
    try:
        url: str = settings.SUPABASE_URL
        key: str = settings.SUPABASE_ANON_KEY
        
        if not url or not key or url == "CHANGE_ME" or key == "CHANGE_ME" or url == "YOUR_SUPABASE_URL":
            logger.warning("Supabase URL or Anon Key is not configured correctly. Database operations may fail.")
            if not url.startswith("http"):
                url = "http://placeholder.supabase.co"
        
        supabase: Client = create_client(url, key)
        return supabase
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client (anon): {e}")
        return None


def get_supabase_admin() -> Client:
    """
    Creates and returns a Supabase client using the service role key.
    This client bypasses RLS policies and is used for backend administrative operations.
    """
    try:
        url: str = settings.SUPABASE_URL
        key: str = settings.SUPABASE_SERVICE_ROLE_KEY
        
        if not url or not key or url == "CHANGE_ME" or key == "CHANGE_ME" or url == "YOUR_SUPABASE_URL":
            logger.warning("Supabase URL or Service Role Key is not configured correctly. Database operations may fail.")
            if not url.startswith("http"):
                url = "http://placeholder.supabase.co"
        
        supabase: Client = create_client(url, key)
        return supabase
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client (admin): {e}")
        return None


# Singleton instances
supabase_client: Client = get_supabase_client()
supabase_admin: Client = get_supabase_admin()


# FastAPI dependencies
def get_db() -> Client:
    """FastAPI dependency to inject the Supabase client (anon key, respects RLS)."""
    return supabase_client


def get_db_admin() -> Client:
    """FastAPI dependency to inject the Supabase admin client (service role, bypasses RLS)."""
    return supabase_admin

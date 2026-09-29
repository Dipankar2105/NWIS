"""
NWIS - Nearby Wells Intelligence System
Database and Supabase Client Module (Harmonized Architecture)
"""

import logging
from typing import Optional, Any
from app.config import settings

logger = logging.getLogger(__name__)

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = Any


class MockSupabaseClient:
    """
    Fallback client when Supabase is unconfigured or offline.
    Ensures imports, startup, routes, and tests work reliably without crashing.
    """
    def __init__(self, client_name: str = "MockSupabaseClient"):
        self.client_name = client_name

    def table(self, table_name: str):
        return MockQueryBuilder(table_name)

    def rpc(self, fn_name: str, params: Optional[dict] = None):
        return MockRPCBuilder(fn_name, params)

    @property
    def auth(self):
        return MockAuth()

    @property
    def storage(self):
        return MockStorage()


class MockQueryBuilder:
    def __init__(self, table_name: str):
        self.table_name = table_name

    def select(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
        return self

    def update(self, *args, **kwargs):
        return self

    def delete(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def gte(self, *args, **kwargs):
        return self

    def lte(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def single(self):
        return self

    def execute(self):
        return type("MockResponse", (), {"data": [], "count": 0})()


class MockRPCBuilder:
    def __init__(self, fn_name: str, params: Optional[dict] = None):
        self.fn_name = fn_name
        self.params = params

    def execute(self):
        return type("MockResponse", (), {"data": [], "count": 0})()


class MockAuth:
    def sign_in_with_password(self, credentials: dict):
        raise RuntimeError("Supabase credentials not configured.")

    def get_user(self, jwt: str):
        return type("MockAuthUserResponse", (), {
            "user": type("MockUser", (), {"id": "dev-user-id", "email": "dev@oilindia.in"})()
        })()


class MockStorage:
    def from_(self, bucket_name: str):
        return self

    def upload(self, path: str, file: bytes, file_options: Optional[dict] = None):
        return {"path": path}

    def get_public_url(self, path: str):
        return f"/mock-storage/{path}"


def get_supabase_client() -> Any:
    """
    Creates and returns a Supabase client using the anon key.
    Respects RLS policies and is used for frontend-facing operations.
    """
    if not settings.is_supabase_configured or create_client is None:
        logger.info("Supabase anon client unconfigured. Initialized MockSupabaseClient.")
        return MockSupabaseClient("supabase_client")
    try:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    except Exception as e:
        logger.warning(f"Failed to connect to Supabase: {e}. Falling back to MockSupabaseClient.")
        return MockSupabaseClient("supabase_client")


def get_supabase_admin() -> Any:
    """
    Creates and returns a Supabase client using the service role key.
    Bypasses RLS policies and is used for administrative/pipeline operations.
    """
    if not settings.is_supabase_configured or create_client is None:
        return MockSupabaseClient("supabase_admin")
    try:
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        return create_client(settings.SUPABASE_URL, service_key)
    except Exception as e:
        logger.warning(f"Failed to connect to Supabase admin: {e}. Falling back to MockSupabaseClient.")
        return MockSupabaseClient("supabase_admin")


# Singleton instances
supabase_client: Any = get_supabase_client()
supabase_admin: Any = get_supabase_admin()


# FastAPI dependencies (matching friend's interface)
def get_db() -> Any:
    """FastAPI dependency to inject the Supabase client (anon key)."""
    return supabase_client


def get_db_admin() -> Any:
    """FastAPI dependency to inject the Supabase admin client (service role)."""
    return supabase_admin


# Backward compatibility alias
get_admin_db = get_db_admin


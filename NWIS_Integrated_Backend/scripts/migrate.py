import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Read connection parameters from environment
db_url = os.getenv("DATABASE_URL")

if db_url:
    conn_params = db_url
else:
    conn_kwargs = {
        "host": os.getenv("SUPABASE_DB_HOST", "db.seyocourjkgjjzlropgz.supabase.co"),
        "port": int(os.getenv("SUPABASE_DB_PORT", "5432")),
        "dbname": os.getenv("SUPABASE_DB_NAME", "postgres"),
        "user": os.getenv("SUPABASE_DB_USER", "postgres"),
        "password": os.getenv("SUPABASE_DB_PASSWORD", ""),
    }

migrations_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations")
files = [
    "001_extensions.sql",
    "002_tables.sql",
    "003_functions.sql",
    "004_rls_policies.sql",
    "005_seed_data.sql",
]

try:
    if db_url:
        conn = psycopg2.connect(db_url)
    else:
        conn = psycopg2.connect(**conn_kwargs)
    conn.autocommit = True
    cursor = conn.cursor()
    print("Successfully connected to Supabase PostgreSQL.")
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)

for f in files:
    filepath = os.path.join(migrations_dir, f)
    print(f"Executing {f}...")
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
    with open(filepath, "r", encoding="utf-8") as file:
        sql = file.read()
        try:
            cursor.execute(sql)
            print(f"✓ {f} executed successfully.")
        except Exception as e:
            print(f"✗ Failed to execute {f}: {e}")
            sys.exit(1)

# Verification
queries = {
    "Extensions": "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'vector', 'pg_trgm');",
    "Tables": "SELECT tablename FROM pg_tables WHERE schemaname = 'public';",
    "Functions": "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';",
    "Wells Count": "SELECT count(*) FROM wells;",
    "Events Count": "SELECT count(*) FROM drilling_events;",
    "Docs Count": "SELECT count(*) FROM documents;",
}

for name, q in queries.items():
    try:
        cursor.execute(q)
        print(f"\n--- {name} ---")
        for row in cursor.fetchall():
            print(row)
    except Exception as e:
        print(f"Error querying {name}: {e}")

cursor.close()
conn.close()

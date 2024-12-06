"""supabase admin"""

import os
from supabase import create_client, Client

# Initialize Supabase client
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)


def setup_user_usage_table():
    """Create user_usage and user_profile tables"""


if __name__ == "__main__":
    setup_user_usage_table()

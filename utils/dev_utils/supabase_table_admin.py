import os
from supabase import create_client, Client

# Initialize Supabase client
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def setup_user_usage_table():
    """
    Set up the user_usage table with all required columns including images_processed_this_month.
    """
    # SQL to create the user_usage table if it doesn't exist
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS user_usage (
        id UUID PRIMARY KEY REFERENCES auth.users(id),
        requests_this_week INTEGER DEFAULT 0,
        requests_this_month INTEGER DEFAULT 0,
        images_processed_this_month INTEGER DEFAULT 0,
        requests_previous_3_months INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    """
    
    # SQL to add images_processed_this_month column if it doesn't exist
    add_column_sql = """
    DO $$ 
    BEGIN 
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_usage' 
            AND column_name = 'images_processed_this_month'
        ) THEN
            ALTER TABLE user_usage 
            ADD COLUMN images_processed_this_month INTEGER DEFAULT 0;
        END IF;
    END $$;
    """
    
    try:
        # Execute the SQL commands using Supabase's REST API
        supabase.table('user_usage').execute(create_table_sql)
        supabase.table('user_usage').execute(add_column_sql)
        print("Successfully set up user_usage table with images_processed_this_month column")
    except Exception as e:
        print(f"Error setting up user_usage table: {str(e)}")

if __name__ == "__main__":
    setup_user_usage_table()
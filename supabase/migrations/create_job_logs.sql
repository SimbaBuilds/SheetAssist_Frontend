create table job_logs (
  id uuid default uuid_generate_v4() primary key,
  job_name text not null,
  status text not null,
  message text,
  created_at timestamp with time zone default now()
);

-- Add this to the handle_monthly_reset function
create or replace function handle_monthly_reset()
returns void as $$
declare
  response jsonb;
begin
  -- Call the edge function
  response := net.http_post(
    'https://<your-project-ref>.functions.supabase.co/reset-monthly-usage',
    '{}',
    headers := jsonb_build_object(
      'Authorization', concat('Bearer ', current_setting('app.settings.cron_secret'))
    )
  );
  
  -- Log the execution
  insert into job_logs (job_name, status, message)
  values (
    'monthly-usage-reset',
    case when response->>'error' is null then 'success' else 'error' end,
    coalesce(response->>'message', response->>'error')
  );
end;
$$ language plpgsql security definer; 
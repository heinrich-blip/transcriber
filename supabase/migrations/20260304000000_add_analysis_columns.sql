-- Add full analysis columns to transcriptions table
alter table public.transcriptions
  add column if not exists summary text,
  add column if not exists intent text,
  add column if not exists key_points jsonb,
  add column if not exists sentiment text,
  add column if not exists processed_brief jsonb;

-- Allow anonymous deletes (for removing history entries)
create policy "Allow anonymous delete"
  on public.transcriptions
    for delete
      to anon
        using (true);

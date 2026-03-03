-- Create transcriptions history table
create table public.transcriptions (
  id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
      file_name text,
        transcription text not null,
          translation text,
            detected_language text not null default ''
            );

            -- Enable Row Level Security
            alter table public.transcriptions enable row level security;

            -- Allow anonymous inserts and reads (no auth currently used in this app)
            create policy "Allow anonymous insert"
              on public.transcriptions
                for insert
                  to anon
                    with check (true);

                    create policy "Allow anonymous select"
                      on public.transcriptions
                        for select
                          to anon
                            using (true);
                            
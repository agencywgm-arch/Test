-- ============================================================
-- InstaScrap — Script SQL Supabase
-- Copiez-collez ce script dans le SQL Editor de votre projet
-- ============================================================

-- Table des paramètres utilisateur (cookie IG, clés API)
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade unique,
  ig_session text,
  rapidapi_key text,
  pb_key text,
  created_at timestamp default now()
);

-- Table des résultats de scraping
create table scrape_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  created_at timestamp default now(),
  query text,
  accounts jsonb
);

-- Table des campagnes DM
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  created_at timestamp default now(),
  name text,
  message_template text,
  daily_limit int,
  targets jsonb,
  pb_container_id text,
  status text default 'pending'
);

-- Row Level Security — chaque utilisateur ne voit que ses données
alter table user_settings enable row level security;
alter table scrape_results enable row level security;
alter table campaigns enable row level security;

create policy "own settings"  on user_settings  for all using (auth.uid() = user_id);
create policy "own scrapes"   on scrape_results for all using (auth.uid() = user_id);
create policy "own campaigns" on campaigns       for all using (auth.uid() = user_id);

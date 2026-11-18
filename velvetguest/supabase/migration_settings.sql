create table if not exists restaurant_settings (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade unique,
  resend_api_key      text,
  resend_from         text,
  openai_api_key      text,
  stripe_publishable_key text,
  stripe_secret_key   text,
  updated_at    timestamptz default now()
);

alter table restaurant_settings enable row level security;

create policy "Owner manages settings"
  on restaurant_settings for all
  using (
    exists (select 1 from restaurants r where r.id = restaurant_settings.restaurant_id and r.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from restaurants r where r.id = restaurant_settings.restaurant_id and r.owner_id = auth.uid())
  );

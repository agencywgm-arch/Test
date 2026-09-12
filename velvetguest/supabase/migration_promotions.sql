-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION — Promotions & Événements
-- Coller dans Supabase → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists promotions (
  id               uuid primary key default uuid_generate_v4(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  name             text not null,
  description      text not null default '',
  discount_percent int not null default 0,
  emoji            text not null default '🎁',
  color            text not null default '#FF9F0A',
  type             text not null default 'event', -- happy_hour | seasonal | event
  start_date       date default null,
  end_date         date default null,
  active           boolean not null default true,
  send_count       int not null default 0,
  created_at       timestamptz not null default now()
);

alter table promotions enable row level security;

create policy "Owner manages promotions"
  on promotions for all
  using (
    exists (select 1 from restaurants r where r.id = promotions.restaurant_id and r.owner_id = auth.uid())
  );

create policy "Anyone can read active promotions"
  on promotions for select using (active = true);

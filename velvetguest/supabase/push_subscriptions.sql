-- Wegemo — Web Push subscriptions for "order ready" notifications
-- Run this in: Supabase Dashboard > SQL Editor > New query

create table if not exists push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique(order_id, endpoint)
);

alter table push_subscriptions enable row level security;

-- The customer's own browser registers its subscription right after
-- placing the order (anonymous, like the order itself).
create policy "Anyone can insert their own push subscription"
  on push_subscriptions for insert with check (true);

-- No public select/update/delete policy: the Edge Function reads this
-- table using the service-role key, which bypasses RLS entirely.

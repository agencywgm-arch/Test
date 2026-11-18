-- Wegemo — Track whether the receipt email actually succeeded, per order
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to run during service: only adds a column, no data changed.

alter table orders add column if not exists receipt_email_sent boolean not null default false;

-- Diagnostic: paid orders from the last 7 days that never got their receipt
-- email out, or never got a Vendus fiscal invoice (if Vendus is enabled).
-- Run this any time to audit.
--
-- select id, table_id, total, payment_method, paid, customer_email,
--        vendus_invoice_id, receipt_email_sent, created_at
-- from orders
-- where paid = true and created_at > now() - interval '7 days'
-- order by created_at desc;

-- Wegemo — Reset all order/transaction history (keep menu + tables/QR codes)
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- This wipes ALL restaurants' order history so accounts look brand new.

begin;

-- Order line items (depends on orders)
delete from order_items;

-- Customer reviews tied to orders
delete from reviews;

-- Orders themselves
delete from orders;

-- CRM customer stats / history (if this table exists in your project)
delete from customers;

commit;

-- NOT touched (kept intact):
--   restaurants, menu_items, tables (QR codes), profiles

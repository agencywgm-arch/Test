-- Wegemo — Livraison assurée par le restaurant (sans Uber Eats).
-- Proposée uniquement via le bouton « Commander » intégré au site du
-- restaurant (embed.js), jamais sur les QR codes en salle.
-- Désactivée par défaut : le restaurateur l'active dans Réglages → Livraison.

alter table restaurants add column if not exists delivery_enabled boolean not null default false;

alter table orders add column if not exists delivery_address text;
alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists out_for_delivery_at timestamptz;

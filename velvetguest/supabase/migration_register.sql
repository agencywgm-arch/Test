-- Wegemo — Ouverture / clôture de caisse.
-- Quand la caisse est clôturée, les QR codes et le bouton de commande du site
-- n'acceptent plus de nouvelles commandes. Ouverte par défaut : rien ne change
-- tant que le restaurateur ne clôture pas.

alter table restaurants add column if not exists register_open boolean not null default true;
alter table restaurants add column if not exists register_changed_at timestamptz;

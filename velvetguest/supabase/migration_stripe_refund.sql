-- Wegemo — Support des remboursements Stripe depuis l'admin restaurateur.
-- Ajoute le suivi du PaymentIntent Stripe sur chaque commande + l'état de
-- remboursement, pour que le bouton "Rembourser" du dashboard sache quelle
-- commande peut être remboursée et n'affiche jamais deux fois le même statut.

alter table orders add column if not exists stripe_payment_intent_id text;
alter table orders add column if not exists refunded boolean not null default false;
alter table orders add column if not exists refund_amount numeric;
alter table orders add column if not exists refunded_at timestamptz;

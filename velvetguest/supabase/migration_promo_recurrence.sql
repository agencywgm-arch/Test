-- Wegemo — Récurrence des codes promo (tous les jours / jours de la semaine /
-- dates du mois, avec un créneau horaire optionnel).
-- recurrence_type : 'none' (défaut, valable en continu) | 'daily' | 'weekly' | 'monthly'
-- recurrence_days : weekly = 0 (dimanche) à 6 (samedi) ; monthly = 1 à 31

alter table promo_codes add column if not exists recurrence_type text not null default 'none';
alter table promo_codes add column if not exists recurrence_days integer[] not null default '{}';
alter table promo_codes add column if not exists recurrence_start_time text;
alter table promo_codes add column if not exists recurrence_end_time text;

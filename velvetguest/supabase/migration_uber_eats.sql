-- Wegemo — Optional "Livraison" (delivery) option on the customer order-type
-- screen, alongside "Sur place" / "À emporter". Delivery isn't fulfilled by
-- our own order flow — it hands off entirely to Uber Eats — so this column
-- just holds the restaurant's Uber Eats store link. The option only appears
-- on the customer page once this is set; leave it null to hide it.

alter table restaurants add column if not exists uber_eats_url text;

update restaurants
set uber_eats_url = 'https://www.ubereats.com/store-browse-uuid/7cb15a2d-e456-4c7e-8343-ce0c4d080c48?diningMode=DELIVERY'
where name ilike '%gratinade%';

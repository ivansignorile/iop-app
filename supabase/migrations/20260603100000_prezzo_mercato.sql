-- Feature 1: prezzo di mercato per confronto con prezzo ditta
alter table public.preventivo_interventi
  add column prezzo_mercato numeric(12, 2),
  add column fonte_mercato text;

comment on column public.preventivo_interventi.prezzo_mercato is
  'Prezzo unitario stimato da mercato/prezzario regionale per confronto con prezzo ditta';
comment on column public.preventivo_interventi.fonte_mercato is
  'Fonte/nota della stima di mercato (prezzario, web, listino globale)';

-- Istante di avvio dell'elaborazione in background (importa-preventivi).
-- Serve a riprendere un documento rimasto 'in_elaborazione' se il worker è stato
-- interrotto (limite wall-clock delle edge function): dopo 10 minuti è considerato bloccato.
alter table public.documenti_libreria add column elaborazione_at timestamptz;

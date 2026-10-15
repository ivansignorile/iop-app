-- Limite dimensione del bucket privato 'preventivi': 20 MiB per oggetto.
-- Usi esistenti: foto dell'editor preventivo e della guida degrado (image/*),
-- vecchi preventivi della libreria personale (PDF fino a 20 MB, immagini fino a 5 MB).
-- allowed_mime_types NON impostato: gli upload di foto passano un File senza
-- contentType esplicito e, se il browser non riconosce il tipo (es. HEIC su
-- Windows), storage-js lo invia come application/octet-stream; una whitelist
-- image/* + application/pdf romperebbe questi upload esistenti.
update storage.buckets
set file_size_limit = 20 * 1024 * 1024
where id = 'preventivi';

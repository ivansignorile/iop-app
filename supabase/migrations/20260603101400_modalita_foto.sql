-- Terza modalità di composizione: preventivo da foto
alter type public.preventivo_modalita add value if not exists 'foto';

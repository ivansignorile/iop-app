-- Seed libreria globale (org_id null): cicli, prezzi, materiali, livelli degrado.
-- Dati estratti dai documenti EDIL PROXIMA (lavori su corda).

-- ============================== CICLI ==============================
insert into public.cicli_lavorazione (org_id, codice, titolo, categoria, unita_default, prezzo_default, tags, descrizione_fasi) values
(null, 'ALL', 'Allestimento cantiere – apprestamenti sicurezza', 'sicurezza', 'corpo', null, array['corda','sicurezza','pos'],
$t$• Valutazione dei rischi e stesura del P.O.S.; cronoprogramma dei lavori.
• Approntamento cantiere ai sensi del D.Lgs 81/2008 e s.m.i.: installazione ancoraggi e linee vita (ancoraggio principale sul corpo in c.a., secondario su secondo corpo di fabbrica in copertura).
• Squadra di muratori su corda con idonei attestati e DPI per sistema di corde statiche/semistatiche.
• Delimitazione aree con orsogrill ed eventuali tunnel pedonali; mantovana aerea (tubi in alluminio e sacco doppio strato PVC) anticaduta materiali; teli protettivi.
• Pulizia e smontaggio area di cantiere.$t$),
(null, 'FAC-RIP', 'Ripristino porzioni facciata', 'facciate', 'mq', 20,
 array['corda','intonaco','tinteggio'],
$t$• Controllo di stabilità tramite calate verticali con picchettatura e rimozione delle porzioni pericolanti.
• Spazzolatura dei ferri d'armatura e passivazione (tipo Kerakoll Kerabuild Eco Steel P o Mapefer Mapei).
• Accurata pulizia delle superfici da polveri e residui d'intonaco.
• Ricostruzione delle parti demolite con malta tixotropica premiscelata fibrorinforzata (tipo Kerakoll Geolite per parti in CLS o Geocalce intonaco).
• Due mani di rasante (tipo Rasobuild Eco Top) con rete Kerakoll V50; fondo aggrappante.
• Tinteggiatura in scala di colore simile all'originale, due mani di quarzite Kerakoll.
• Smaltimento dei materiali di risulta presso discariche autorizzate.$t$),
(null, 'PENS', 'Ripristino pensilina (frontalino + sottocielo)', 'pensiline', 'corpo', null,
 array['corda','calce'],
$t$• Controllo di stabilità con calate verticali e picchettatura; rimozione porzioni pericolanti.
• Spazzolatura e passivazione dei ferri d'armatura.
• Pulizia delle superfici.
• Ricostruzione e rasatura con geomalta naturale strutturale traspirante a base di calce naturale (tipo Kerakoll).
• Fondo aggrappante e tinteggiatura due mani di quarzite Kerakoll.
• Smaltimento materiali di risulta.$t$),
(null, 'IMP', 'Impermeabilizzazione (pensilina / lastrico / copertura)', 'impermeabilizzazione', 'mq', null,
 array['corda','guaina'],
$t$• Controllo e pulizia della superficie esistente; riempimento lesioni con sigillante butilico (tipo Maplefex Mapei).
• Posa a rullo di primer promotore di adesione.
• Sistema impermeabilizzante fibrorinforzato (tipo Kerakoll, EN 1504-2) resistente a UV e agenti atmosferici, doppia mano a rullo/pennello, finitura grigia (per lastrici: Bioscud con tessuto poliestere TNT).
• Smaltimento materiali di risulta.$t$),
(null, 'SCOSS', 'Posa scossalina preverniciata', 'lattoneria', 'ml', null,
 array['corda','scossalina'],
$t$• Pulizia della superficie di posa.
• Fornitura e posa di scossalina metallica preverniciata dimensionata, con gocciolatoio/rompi-goccia, tassellata in sommità al parapetto, sigillata e rivettata.
• Smaltimento materiali di risulta.$t$),
(null, 'CORN', 'Ripristino cornicione / prospetto torrino scala', 'facciate', 'mq', 60,
 array['corda','calce'],
$t$• Controllo di stabilità con calate verticali e picchettatura; rimozione porzioni pericolanti.
• Spazzolatura e passivazione dei ferri d'armatura.
• Pulizia delle superfici.
• Ricostruzione e rasatura con geomalta naturale a base di calce naturale (tipo Kerakoll).
• Fondo aggrappante e tinteggiatura due mani di quarzite Kerakoll.
• Smaltimento materiali di risulta.$t$),
(null, 'BALC-A', 'Messa in sicurezza e ripristino balconi – TIPO A (completo)', 'balconi', 'cad', 2800,
 array['corda','balcone'],
$t$Parapetti interni/esterni, corrimano, frontalini e sottobalcone.
• Controllo di stabilità con calate verticali e picchettatura; rimozione porzioni pericolanti.
• Spazzolatura e passivazione ferri (tipo Kerabuild Eco Steel P o Mapefer Mapei).
• Pulizia superfici.
• Ricostruzione e rasatura con geomalta naturale traspirante a base calce (tipo Kerakoll).
• Fondo aggrappante; tinteggiatura due mani di quarzite Kerakoll.
• Smaltimento materiali di risulta.$t$),
(null, 'BALC-B', 'Messa in sicurezza e ripristino balconi – TIPO B', 'balconi', 'cad', 2400,
 array['corda','balcone'],
$t$Parapetti interni/esterni, frontalini e sottobalcone (senza corrimano).
• Ciclo come TIPO A: controllo stabilità, passivazione ferri, pulizia, ricostruzione/rasatura con geomalta a base calce, fondo, tinteggio quarzite, smaltimento.$t$),
(null, 'BALC-C', 'Messa in sicurezza e ripristino balconi – TIPO C', 'balconi', 'cad', 2000,
 array['corda','balcone'],
$t$Versione base parapetti/frontalini/sottobalcone.
• Ciclo come TIPO A/B con minore estensione dell'intervento.$t$),
(null, 'MARC', 'Ripristino marcapiani', 'facciate', 'ml', 30,
 array['corda'],
$t$• Controllo di stabilità con picchettatura; rimozione porzioni pericolanti.
• Pulizia superfici.
• Ricostruzione e rasatura con malta tixotropica fibrorinforzata (tipo Kerakoll Geolite/Geocalce).
• Mano di uniformante (Kerakover Eco Acrilex Fondo) e tinteggiatura due mani Kerakover Eco Quarzite.
• Smaltimento materiali di risulta.$t$),
(null, 'FACC', 'Ripristino facciate esterne condominiali', 'facciate', 'mq', 20,
 array['corda','tinteggio'],
$t$• Controllo di stabilità con picchettatura; rimozione porzioni pericolanti.
• Pulizia superfici.
• Ricostruzione e rasatura parti ammalorate con malta tixotropica fibrorinforzata (Kerakoll Geolite/Geocalce).
• Uniformante e tinteggiatura due mani Kerakover Eco Quarzite.
• Smaltimento materiali di risulta.$t$),
(null, 'PILA', 'Ripristino pilastri / canne fumarie intonacate', 'facciate', 'mq', 45,
 array['corda'],
$t$• Controllo di stabilità con picchettatura; rimozione porzioni pericolanti.
• Spazzolatura e passivazione ferri.
• Pulizia superfici.
• Ricostruzione e rasatura con malta tixotropica fibrorinforzata (Kerakoll Geolite/Geocalce).
• Uniformante e tinteggiatura due mani Kerakover Eco Quarzite.
• Smaltimento materiali di risulta.$t$),
(null, 'PILOTIS', 'Ripristino cielo piano pilotis e pilastri', 'facciate', 'mq', 30,
 array['corda'],
$t$• Controllo di stabilità con picchettatura; rimozione porzioni pericolanti.
• Pulizia superfici.
• Ricostruzione e rasatura con malta tixotropica fibrorinforzata.
• Uniformante e tinteggiatura due mani quarzite Kerakoll.
• Smaltimento materiali di risulta.$t$),
(null, 'TORR', 'Ripristino torrino', 'facciate', 'mq', 60,
 array['corda'],
$t$• Controllo di stabilità con picchettatura; rimozione porzioni pericolanti.
• Pulizia superfici.
• Ricostruzione e rasatura con malta tixotropica fibrorinforzata.
• Uniformante e tinteggiatura due mani quarzite Kerakoll.
• Smaltimento materiali di risulta.$t$),
(null, 'PAV-C1', 'Pavimentazione balconi – completa (pietra di Trani)', 'pavimentazione', 'mq', 155,
 array['pavimento','balcone'],
$t$Rifacimento di massetto, impermeabilizzazione, pavimentazione, battiscopa e terminali a pavimento in pietra di Trani sp. 2/3 cm, gocciolatoio a filo esterno. Misurazioni e lavorazioni con accesso ai singoli balconi.$t$),
(null, 'PAV-C2', 'Pavimentazione balconi – incollaggio su esistente', 'pavimentazione', 'mq', 100,
 array['pavimento','balcone'],
$t$• Pulizia della superficie.
• Strato impermeabilizzante (tipo Nanoflex Kerakoll).
• Posa di piastrelle e copertine certificate antigelo per esterni; ribattitura fughe con sigillante.$t$),
(null, 'PAV-C3', 'Pavimentazione balconi – trattamento protettivo trasparente', 'pavimentazione', 'mq', 40,
 array['pavimento','balcone'],
$t$• Pulizia con detergente disincrostante (rimozione agenti salini/ossidanti).
• Sigillatura fughe con stucco cementizio bicomponente (se necessario).
• Impregnante trasparente idrorepellente non pellicolare (tipo Naici o equivalente) su tutta la pavimentazione.$t$),
(null, 'FERRO', 'Verniciatura manufatti in ferro / ringhiere', 'ferro', 'mq', 40,
 array['ferro','ringhiere'],
$t$• Pulizia e carteggiatura manuale.
• Due mani di smalto per esterni anticorrosivo con antiruggine (tipo Ferropiù Micaceo Boero o similare) in scala di colore come l'originale.$t$),
(null, 'MSIC', 'Messa in sicurezza minima', 'sicurezza', 'corpo', null,
 array['corda','urgenza'],
$t$• Disgaggio manuale delle porzioni pericolanti e trattamento ferri.
• Posa reti anticalcinacci bianche.
• Smaltimento materiali di risulta.$t$);

-- ============================== PREZZI UNITARI ==============================
insert into public.prezzi_unitari (org_id, voce, unita, prezzo, categoria, note) values
(null, 'Frontalino balconi', 'ml', 90, 'balconi', 'rif. La Pira 17'),
(null, 'Parapetti balconi', 'mq', 50, 'balconi', null),
(null, 'Sottocieli balconi', 'mq', 71, 'balconi', null),
(null, 'Pavimentazione completa (pietra di Trani)', 'mq', 155, 'pavimentazione', null),
(null, 'Pavimentazione incollaggio su esistente', 'mq', 100, 'pavimentazione', null),
(null, 'Pavimentazione trattamento protettivo trasparente', 'mq', 40, 'pavimentazione', null),
(null, 'Verniciatura ringhiere', 'mq', 40, 'ferro', null),
(null, 'Pensiline / parapetto lastrico esterno', 'mq', 105, 'facciate', null),
(null, 'Marcapiani', 'ml', 30, 'facciate', null),
(null, 'Facciate esterne', 'mq', 20, 'facciate', null),
(null, 'Pilastri / canne fumarie intonacate', 'mq', 45, 'facciate', null),
(null, 'Cielo piano pilotis e pilastri', 'mq', 30, 'facciate', null),
(null, 'Torrino', 'mq', 60, 'facciate', null),
(null, 'Giornata lavorativa su corda', 'giorno', 1000, 'manodopera', 'parametro orientativo, indipendente dal tipo di lavoro');

-- ============================== MATERIALI ==============================
insert into public.materiali_prodotti (org_id, lavorazione_keyword, prodotto, marca, alternativa, note) values
(null, 'passivazione ferri armatura', 'Kerabuild Eco Steel P', 'Kerakoll', 'Mapefer (Mapei) / Geolite', 'inibitore corrosione ferri'),
(null, 'ricostruzione calcestruzzo', 'Geolite', 'Kerakoll', 'Mapegrout (Mapei)', 'malta tixotropica premiscelata fibrorinforzata, parti in CLS'),
(null, 'ricostruzione intonaco calce', 'Geocalce', 'Kerakoll', null, 'geomalta naturale a base calce, traspirante'),
(null, 'rasatura', 'Rasobuild Eco Top', 'Kerakoll', null, 'con rete Rinforzo V50 Kerakoll'),
(null, 'fondo uniformante pre-tinteggio', 'Kerakover Eco Acrilex Fondo', 'Kerakoll', 'Kerakover Eco (fondo riempitivo facciate)', null),
(null, 'tinteggiatura facciate', 'Kerakover Eco Quarzite', 'Kerakoll', 'Kerakover Compact', 'due mani, scala colore originale'),
(null, 'impermeabilizzazione', 'Sistema fibrorinforzato EN 1504-2', 'Kerakoll', 'Bioscud + Bioscud TNT (lastrici)', 'doppia mano, finitura grigia'),
(null, 'sigillatura lesioni butilico', 'Maplefex', 'Mapei', 'Bioscud BT Fix (Kerakoll)', null),
(null, 'verniciatura ferro', 'Ferropiu Micaceo', 'Boero', 'vernice al minio', 'smalto anticorrosivo con antiruggine'),
(null, 'protettivo trasparente pavimenti', 'Impregnante idrorepellente', 'Naici', null, 'liquido trasparente non pellicolare'),
(null, 'rompigoccia frontalini', 'Profilo angolare PVC R131', null, null, 'rete in fibra di vetro, termosaldato'),
(null, 'impermeabilizzazione trasparente ceramica', 'Resina poliuretanica monocomponente', null, null, '>=2 mani, ~1 kg/mq, spessore secco >=800 micron'),
(null, 'tinteggiatura interni', 'Pittura ai silicati (DIN 18363)', null, 'idropittura silossanica (es. Supercolor Oikos)', 'altamente traspirante');

-- ============================== DEGRADO ==============================
insert into public.degrado_samples (org_id, livello, intervento, descrizione) values
(null, 1, 'Pittura', 'Facciata in buono stato, balconi integri: sola tinteggiatura.'),
(null, 5, 'Messa in sicurezza e ripristino', 'Macchie/aloni, principio di distacco intonaco al sottobalcone, fessurazioni.'),
(null, 6, 'Messa in sicurezza e ripristino', 'Frontalino/intradosso con distacchi estesi, ferri a vista, lesioni verticali.'),
(null, 7, 'Messa in sicurezza e ripristino', 'Cornicione/aggetto con espulsione di copriferro e lesione passante.'),
(null, 9, 'Messa in sicurezza e ricostruzione', 'Degrado severo: intonaco mancante su ampie superfici, reti anticaduta, area transennata.');

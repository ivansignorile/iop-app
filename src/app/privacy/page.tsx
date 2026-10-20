import type { ReactNode } from "react";

import { AGGIORNATO_AL, TITOLARE } from "@/lib/legale";

export const metadata = { title: "Privacy Policy | iop" };

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-hairline pt-6">
      <h2 className="title-sm text-ink">{titolo}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-[var(--spacing-section)]">
      <p className="eyebrow mb-4 text-stone">Informativa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679</p>
      <h1 className="display-lg text-ink">Privacy Policy</h1>
      <p className="mt-4 text-sm text-stone">Ultimo aggiornamento: {AGGIORNATO_AL}</p>

      <div className="mt-10 flex max-w-[65ch] flex-col gap-8 leading-relaxed text-graphite">
        <Sezione titolo="1. Titolare del trattamento">
          <p>
            {TITOLARE.ragioneSociale}, con sede legale in {TITOLARE.sede}, P. IVA {TITOLARE.partitaIva}, REA{" "}
            {TITOLARE.rea}. Per qualsiasi richiesta sui tuoi dati puoi scrivere a{" "}
            <a href={`mailto:${TITOLARE.email}`} className="text-link">
              {TITOLARE.email}
            </a>
            .
          </p>
        </Sezione>

        <Sezione titolo="2. Quali dati trattiamo">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Richiesta di preventivo</strong> (modulo &ldquo;Elaborato dal
              tecnico&rdquo;): nome e cognome o ragione sociale, email, telefono, comune del cantiere, titolo del
              progetto, note e i file che carichi (computi metrici, foto, planimetrie, logo o carta intestata). Non
              inserire nei file dati di altre persone se non sei autorizzato a farlo.
            </li>
            <li>
              <strong className="text-ink">Account</strong> (modalità Self): email e password (conservata solo in
              forma cifrata), dati dell&apos;azienda, anagrafiche dei clienti e dei cantieri, preventivi, foto e
              documenti che inserisci.
            </li>
            <li>
              <strong className="text-ink">Dati tecnici</strong>: per proteggere il modulo da invii automatici
              registriamo un&apos;impronta non reversibile dell&apos;indirizzo IP e l&apos;orario della richiesta.
            </li>
          </ul>
        </Sezione>

        <Sezione titolo="3. Perché li trattiamo e su quale base">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Preparare e inviarti il preventivo richiesto e ricontattarti in merito: esecuzione di misure
              precontrattuali su tua richiesta (art. 6.1.b GDPR).
            </li>
            <li>Fornirti il servizio e gestire il tuo account: esecuzione del contratto (art. 6.1.b GDPR).</li>
            <li>
              Prevenire abusi e garantire la sicurezza del servizio: legittimo interesse del titolare (art. 6.1.f
              GDPR).
            </li>
            <li>Adempiere a obblighi di legge, ad esempio fiscali: art. 6.1.c GDPR.</li>
          </ul>
          <p>
            Il conferimento dei dati contrassegnati come obbligatori è necessario: senza di essi non possiamo
            preparare il preventivo. Non usiamo i tuoi dati per pubblicità e non li vendiamo.
          </p>
        </Sezione>

        <Sezione titolo="4. Elaborazione automatica dei documenti">
          <p>
            Per generare le voci del preventivo, foto e documenti possono essere analizzati da un servizio di
            intelligenza artificiale, che propone descrizioni e prezzi sulla base dei prezzari regionali. Il risultato
            è una bozza: nella modalità &ldquo;Elaborato dal tecnico&rdquo; viene verificata da un nostro tecnico,
            nella modalità Self la controlli e modifichi tu. Non vengono prese decisioni che producano effetti
            giuridici nei tuoi confronti basate unicamente su un trattamento automatizzato.
          </p>
        </Sezione>

        <Sezione titolo="5. A chi li comunichiamo">
          <p>
            I dati sono trattati dal personale autorizzato del titolare e da fornitori che operano come responsabili
            del trattamento, ciascuno solo per quanto necessario al proprio servizio:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Supabase: database e archiviazione dei file (server nell&apos;Unione Europea, Francoforte);</li>
            <li>Vercel: hosting del sito;</li>
            <li>Resend: invio delle email di servizio;</li>
            <li>Green API: notifiche WhatsApp interne al nostro team sulle nuove richieste;</li>
            <li>Anthropic: elaborazione automatica di foto e documenti descritta al punto 4.</li>
          </ul>
          <p>
            Alcuni di questi fornitori possono trattare dati fuori dallo Spazio Economico Europeo. In questi casi il
            trasferimento avviene sulla base di una decisione di adeguatezza della Commissione europea (come il Data
            Privacy Framework UE-USA) o delle clausole contrattuali standard approvate dalla Commissione.
          </p>
        </Sezione>

        <Sezione titolo="6. Per quanto tempo li conserviamo">
          <p>
            Conserviamo i dati della richiesta e i file allegati per il tempo necessario a gestirla e
            all&apos;eventuale rapporto che ne segue. I dati dell&apos;account restano finché l&apos;account è attivo;
            dopo la sua chiusura li cancelliamo, salvo quanto dobbiamo conservare per obblighi di legge. Puoi chiedere
            in qualsiasi momento la cancellazione anticipata scrivendo all&apos;indirizzo indicato al punto 1.
          </p>
        </Sezione>

        <Sezione titolo="7. I tuoi diritti">
          <p>
            Puoi chiedere l&apos;accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento,
            la portabilità e puoi opporti al trattamento basato sul legittimo interesse (artt. 15-22 GDPR), scrivendo
            a{" "}
            <a href={`mailto:${TITOLARE.email}`} className="text-link">
              {TITOLARE.email}
            </a>
            . Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali
            (www.garanteprivacy.it).
          </p>
        </Sezione>

        <Sezione titolo="8. Cookie">
          <p>
            Il sito usa solo cookie tecnici necessari per l&apos;accesso all&apos;area riservata. Non usiamo cookie
            di profilazione né strumenti di statistica di terze parti.
          </p>
        </Sezione>
      </div>
    </main>
  );
}

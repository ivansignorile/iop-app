import Link from "next/link";
import type { ReactNode } from "react";

import { AGGIORNATO_AL, TITOLARE } from "@/lib/legale";

export const metadata = { title: "Termini di Servizio | iop" };

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-hairline pt-6">
      <h2 className="title-sm text-ink">{titolo}</h2>
      {children}
    </section>
  );
}

export default function TerminiPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-[var(--spacing-section)]">
      <p className="eyebrow mb-4 text-stone">Condizioni d&apos;uso</p>
      <h1 className="display-lg text-ink">Termini di Servizio</h1>
      <p className="mt-4 text-sm text-stone">Ultimo aggiornamento: {AGGIORNATO_AL}</p>

      <div className="mt-10 flex max-w-[65ch] flex-col gap-8 leading-relaxed text-graphite">
        <Sezione titolo="1. Chi fornisce il servizio">
          <p>
            IOP è fornito da {TITOLARE.ragioneSociale}, con sede legale in {TITOLARE.sede}, P. IVA{" "}
            {TITOLARE.partitaIva}, REA {TITOLARE.rea}, contattabile a{" "}
            <a href={`mailto:${TITOLARE.email}`} className="text-link">
              {TITOLARE.email}
            </a>
            . Usando il sito accetti questi termini.
          </p>
        </Sezione>

        <Sezione titolo="2. Il servizio">
          <p>IOP aiuta a preparare preventivi edili sulla base dei prezzari regionali ufficiali, in due modalità:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Self istantaneo</strong>: con un account componi il preventivo in
              autonomia, anche a partire da foto o da un capitolato, e lo scarichi.
            </li>
            <li>
              <strong className="text-ink">Elaborato dal tecnico</strong>: invii la richiesta con il modulo e un nostro
              tecnico prepara il preventivo e te lo invia all&apos;email indicata, di norma entro 24 ore dalla
              ricezione di una richiesta completa.
            </li>
          </ul>
        </Sezione>

        <Sezione titolo="3. Natura delle stime">
          <p>
            I preventivi generati con IOP sono stime basate sui prezzari regionali e sulle informazioni che fornisci.
            Non sostituiscono il sopralluogo, il computo metrico redatto da un professionista abilitato né le
            valutazioni progettuali e di sicurezza richieste dalla legge. Prima di eseguire o affidare i lavori
            verifica quantità, voci e prezzi.
          </p>
          <p>
            Le voci proposte automaticamente (anche con l&apos;aiuto di sistemi di intelligenza artificiale) possono
            contenere imprecisioni: nella modalità Self la revisione del documento finale è a tuo carico.
          </p>
        </Sezione>

        <Sezione titolo="4. Account e uso corretto">
          <ul className="list-disc space-y-2 pl-5">
            <li>Fornisci dati veritieri e custodisci le credenziali del tuo account.</li>
            <li>
              Carica solo file di cui hai la disponibilità e che non violano diritti di terzi; non caricare dati
              personali di altre persone senza averne titolo.
            </li>
            <li>
              Non usare il servizio per invii automatici, per tentare di accedere a dati di altri utenti o in modo da
              comprometterne il funzionamento. In questi casi possiamo sospendere l&apos;accesso.
            </li>
          </ul>
        </Sezione>

        <Sezione titolo="5. Contenuti e documenti">
          <p>
            I documenti e i dati che carichi restano tuoi: li usiamo solo per fornirti il servizio, come descritto
            nella{" "}
            <Link href="/privacy" className="text-link">
              Privacy Policy
            </Link>
            . Il software, il marchio IOP e i contenuti del sito appartengono ai rispettivi titolari. I prezzari
            regionali sono pubblicati dalle Regioni e restano soggetti alle loro condizioni.
          </p>
        </Sezione>

        <Sezione titolo="6. Corrispettivi">
          <p>
            Eventuali costi del servizio ti vengono comunicati chiaramente prima della conferma. Nessun importo è
            dovuto per l&apos;invio di una richiesta se non diversamente indicato.
          </p>
        </Sezione>

        <Sezione titolo="7. Disponibilità e responsabilità">
          <p>
            Facciamo il possibile per mantenere il servizio disponibile e corretto, ma non possiamo garantirne il
            funzionamento ininterrotto. Nei limiti consentiti dalla legge non rispondiamo di danni indiretti
            derivanti dall&apos;uso delle stime senza le verifiche indicate al punto 3. Restano salvi i diritti
            riconosciuti ai consumatori dalla legge.
          </p>
        </Sezione>

        <Sezione titolo="8. Modifiche">
          <p>
            Possiamo aggiornare questi termini; la data dell&apos;ultimo aggiornamento è indicata in alto. Le modifiche
            rilevanti vengono segnalate agli utenti registrati.
          </p>
        </Sezione>

        <Sezione titolo="9. Legge applicabile e foro">
          <p>
            Si applica la legge italiana. Per le controversie con i consumatori è competente il foro del luogo di
            residenza o domicilio del consumatore; negli altri casi è competente il foro di Bari.
          </p>
        </Sezione>
      </div>
    </main>
  );
}

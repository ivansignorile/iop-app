export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cicli_lavorazione: {
        Row: {
          categoria: string | null
          codice: string | null
          created_at: string
          descrizione_fasi: string
          id: string
          org_id: string | null
          prezzo_default: number | null
          tags: string[] | null
          titolo: string
          unita_default: Database["public"]["Enums"]["unita_misura"]
        }
        Insert: {
          categoria?: string | null
          codice?: string | null
          created_at?: string
          descrizione_fasi: string
          id?: string
          org_id?: string | null
          prezzo_default?: number | null
          tags?: string[] | null
          titolo: string
          unita_default?: Database["public"]["Enums"]["unita_misura"]
        }
        Update: {
          categoria?: string | null
          codice?: string | null
          created_at?: string
          descrizione_fasi?: string
          id?: string
          org_id?: string | null
          prezzo_default?: number | null
          tags?: string[] | null
          titolo?: string
          unita_default?: Database["public"]["Enums"]["unita_misura"]
        }
        Relationships: [
          {
            foreignKeyName: "cicli_lavorazione_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clienti: {
        Row: {
          amministratore: string | null
          cap: string | null
          codice_fiscale: string | null
          comune: string | null
          created_at: string
          email: string | null
          id: string
          indirizzo: string | null
          nome: string
          note: string | null
          org_id: string
          partita_iva: string | null
          provincia: string | null
          telefono: string | null
          tipo: Database["public"]["Enums"]["cliente_tipo"]
          updated_at: string
        }
        Insert: {
          amministratore?: string | null
          cap?: string | null
          codice_fiscale?: string | null
          comune?: string | null
          created_at?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          note?: string | null
          org_id: string
          partita_iva?: string | null
          provincia?: string | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["cliente_tipo"]
          updated_at?: string
        }
        Update: {
          amministratore?: string | null
          cap?: string | null
          codice_fiscale?: string | null
          comune?: string | null
          created_at?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          note?: string | null
          org_id?: string
          partita_iva?: string | null
          provincia?: string | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["cliente_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clienti_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      degrado_samples: {
        Row: {
          ciclo_id: string | null
          created_at: string
          descrizione: string | null
          id: string
          image_path: string | null
          intervento: string
          livello: number
          org_id: string | null
        }
        Insert: {
          ciclo_id?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          image_path?: string | null
          intervento: string
          livello: number
          org_id?: string | null
        }
        Update: {
          ciclo_id?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          image_path?: string | null
          intervento?: string
          livello?: number
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "degrado_samples_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "cicli_lavorazione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degrado_samples_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documenti_libreria: {
        Row: {
          created_at: string
          created_by: string | null
          elaborazione_at: string | null
          errore: string | null
          id: string
          nome_file: string
          org_id: string
          stato: Database["public"]["Enums"]["documento_stato"]
          storage_path: string
          voci_estratte: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          elaborazione_at?: string | null
          errore?: string | null
          id?: string
          nome_file: string
          org_id: string
          stato?: Database["public"]["Enums"]["documento_stato"]
          storage_path: string
          voci_estratte?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          elaborazione_at?: string | null
          errore?: string | null
          id?: string
          nome_file?: string
          org_id?: string
          stato?: Database["public"]["Enums"]["documento_stato"]
          storage_path?: string
          voci_estratte?: number
        }
        Relationships: [
          {
            foreignKeyName: "documenti_libreria_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      edifici: {
        Row: {
          balconi: number | null
          cap: string | null
          cliente_id: string | null
          comune: string | null
          created_at: string
          facciate: number | null
          id: string
          indirizzo: string | null
          lat: number | null
          lng: number | null
          note: string | null
          org_id: string
          piani: number | null
          porzione: string | null
          provincia: string | null
          superficie_stimata_mq: number | null
          tipo_copertura: string | null
          updated_at: string
        }
        Insert: {
          balconi?: number | null
          cap?: string | null
          cliente_id?: string | null
          comune?: string | null
          created_at?: string
          facciate?: number | null
          id?: string
          indirizzo?: string | null
          lat?: number | null
          lng?: number | null
          note?: string | null
          org_id: string
          piani?: number | null
          porzione?: string | null
          provincia?: string | null
          superficie_stimata_mq?: number | null
          tipo_copertura?: string | null
          updated_at?: string
        }
        Update: {
          balconi?: number | null
          cap?: string | null
          cliente_id?: string | null
          comune?: string | null
          created_at?: string
          facciate?: number | null
          id?: string
          indirizzo?: string | null
          lat?: number | null
          lng?: number | null
          note?: string | null
          org_id?: string
          piani?: number | null
          porzione?: string | null
          provincia?: string | null
          superficie_stimata_mq?: number | null
          tipo_copertura?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edifici_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edifici_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      foto_annotazioni: {
        Row: {
          created_at: string
          id: string
          legenda: Json
          org_id: string
          preventivo_id: string
          punti: Json
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          legenda?: Json
          org_id: string
          preventivo_id: string
          punti?: Json
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          legenda?: Json
          org_id?: string
          preventivo_id?: string
          punti?: Json
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_annotazioni_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foto_annotazioni_preventivo_id_fkey"
            columns: ["preventivo_id"]
            isOneToOne: false
            referencedRelation: "preventivi"
            referencedColumns: ["id"]
          },
        ]
      }
      libreria_elaborazioni_log: {
        Row: {
          created_at: string
          documento_id: string | null
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          documento_id?: string | null
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          documento_id?: string | null
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "libreria_elaborazioni_log_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti_libreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libreria_elaborazioni_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      materiali_prodotti: {
        Row: {
          alternativa: string | null
          created_at: string
          id: string
          lavorazione_keyword: string
          marca: string | null
          note: string | null
          org_id: string | null
          prodotto: string
          scheda_tecnica_url: string | null
        }
        Insert: {
          alternativa?: string | null
          created_at?: string
          id?: string
          lavorazione_keyword: string
          marca?: string | null
          note?: string | null
          org_id?: string | null
          prodotto: string
          scheda_tecnica_url?: string | null
        }
        Update: {
          alternativa?: string | null
          created_at?: string
          id?: string
          lavorazione_keyword?: string
          marca?: string | null
          note?: string | null
          org_id?: string | null
          prodotto?: string
          scheda_tecnica_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiali_prodotti_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          cap: string | null
          comune: string | null
          costo_giornaliero: number | null
          created_at: string
          default_iva: number
          email: string | null
          id: string
          indirizzo: string | null
          logo_url: string | null
          name: string
          partita_iva: string | null
          provincia: string | null
          ragione_sociale: string | null
          regione: string
          slug: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cap?: string | null
          comune?: string | null
          costo_giornaliero?: number | null
          created_at?: string
          default_iva?: number
          email?: string | null
          id?: string
          indirizzo?: string | null
          logo_url?: string | null
          name: string
          partita_iva?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          regione?: string
          slug?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cap?: string | null
          comune?: string | null
          costo_giornaliero?: number | null
          created_at?: string
          default_iva?: number
          email?: string | null
          id?: string
          indirizzo?: string | null
          logo_url?: string | null
          name?: string
          partita_iva?: string | null
          provincia?: string | null
          ragione_sociale?: string | null
          regione?: string
          slug?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      preventivi: {
        Row: {
          capitolato_testo: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data: string
          edificio_id: string | null
          fonte_prezzi: Database["public"]["Enums"]["fonte_prezzi"]
          id: string
          iva: number
          modalita: Database["public"]["Enums"]["preventivo_modalita"]
          note: string | null
          numero_protocollo: string | null
          oggetto: string | null
          org_id: string
          stato: Database["public"]["Enums"]["preventivo_stato"]
          totale_imponibile: number
          updated_at: string
        }
        Insert: {
          capitolato_testo?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          edificio_id?: string | null
          fonte_prezzi?: Database["public"]["Enums"]["fonte_prezzi"]
          id?: string
          iva?: number
          modalita?: Database["public"]["Enums"]["preventivo_modalita"]
          note?: string | null
          numero_protocollo?: string | null
          oggetto?: string | null
          org_id: string
          stato?: Database["public"]["Enums"]["preventivo_stato"]
          totale_imponibile?: number
          updated_at?: string
        }
        Update: {
          capitolato_testo?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          edificio_id?: string | null
          fonte_prezzi?: Database["public"]["Enums"]["fonte_prezzi"]
          id?: string
          iva?: number
          modalita?: Database["public"]["Enums"]["preventivo_modalita"]
          note?: string | null
          numero_protocollo?: string | null
          oggetto?: string | null
          org_id?: string
          stato?: Database["public"]["Enums"]["preventivo_stato"]
          totale_imponibile?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventivi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivi_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edifici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivi_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      preventivo_allegati: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          livello_degrado: number | null
          org_id: string
          preventivo_id: string
          storage_path: string
          tipo: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          livello_degrado?: number | null
          org_id: string
          preventivo_id: string
          storage_path: string
          tipo?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          livello_degrado?: number | null
          org_id?: string
          preventivo_id?: string
          storage_path?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preventivo_allegati_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivo_allegati_preventivo_id_fkey"
            columns: ["preventivo_id"]
            isOneToOne: false
            referencedRelation: "preventivi"
            referencedColumns: ["id"]
          },
        ]
      }
      preventivo_interventi: {
        Row: {
          abbinamento_avviso: string | null
          ciclo_id: string | null
          codice_prezzario: string | null
          created_at: string
          descrizione: string | null
          descrizione_prezzario: string | null
          descrizione_propria: string | null
          fonte_mercato: string | null
          fonte_scelta: Database["public"]["Enums"]["fonte_scelta"] | null
          gruppo: string | null
          id: string
          importo: number | null
          ordine: number
          org_id: string
          preventivo_id: string
          prezzario_voce_id: string | null
          prezzo_mercato: number | null
          prezzo_prezzario: number | null
          prezzo_proprio: number | null
          prezzo_unitario: number
          quantita: number
          sconto: number
          titolo: string
          unita: Database["public"]["Enums"]["unita_misura"]
          voce_propria_id: string | null
        }
        Insert: {
          abbinamento_avviso?: string | null
          ciclo_id?: string | null
          codice_prezzario?: string | null
          created_at?: string
          descrizione?: string | null
          descrizione_prezzario?: string | null
          descrizione_propria?: string | null
          fonte_mercato?: string | null
          fonte_scelta?: Database["public"]["Enums"]["fonte_scelta"] | null
          gruppo?: string | null
          id?: string
          importo?: number | null
          ordine?: number
          org_id: string
          preventivo_id: string
          prezzario_voce_id?: string | null
          prezzo_mercato?: number | null
          prezzo_prezzario?: number | null
          prezzo_proprio?: number | null
          prezzo_unitario?: number
          quantita?: number
          sconto?: number
          titolo: string
          unita?: Database["public"]["Enums"]["unita_misura"]
          voce_propria_id?: string | null
        }
        Update: {
          abbinamento_avviso?: string | null
          ciclo_id?: string | null
          codice_prezzario?: string | null
          created_at?: string
          descrizione?: string | null
          descrizione_prezzario?: string | null
          descrizione_propria?: string | null
          fonte_mercato?: string | null
          fonte_scelta?: Database["public"]["Enums"]["fonte_scelta"] | null
          gruppo?: string | null
          id?: string
          importo?: number | null
          ordine?: number
          org_id?: string
          preventivo_id?: string
          prezzario_voce_id?: string | null
          prezzo_mercato?: number | null
          prezzo_prezzario?: number | null
          prezzo_proprio?: number | null
          prezzo_unitario?: number
          quantita?: number
          sconto?: number
          titolo?: string
          unita?: Database["public"]["Enums"]["unita_misura"]
          voce_propria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preventivo_interventi_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivo_interventi_preventivo_id_fkey"
            columns: ["preventivo_id"]
            isOneToOne: false
            referencedRelation: "preventivi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivo_interventi_prezzario_voce_id_fkey"
            columns: ["prezzario_voce_id"]
            isOneToOne: false
            referencedRelation: "prezzario_voci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivo_interventi_voce_propria_id_fkey"
            columns: ["voce_propria_id"]
            isOneToOne: false
            referencedRelation: "voci_proprie"
            referencedColumns: ["id"]
          },
        ]
      }
      prezzari: {
        Row: {
          anno: number
          attivo: boolean
          created_at: string
          id: string
          regione: string
          titolo: string
        }
        Insert: {
          anno: number
          attivo?: boolean
          created_at?: string
          id?: string
          regione: string
          titolo: string
        }
        Update: {
          anno?: number
          attivo?: boolean
          created_at?: string
          id?: string
          regione?: string
          titolo?: string
        }
        Relationships: []
      }
      prezzario_voci: {
        Row: {
          capitolo: string | null
          codice: string
          descrizione: string
          id: string
          prezzario_id: string
          prezzo: number
          search: unknown
          unita: Database["public"]["Enums"]["unita_misura"]
          unita_testo: string
        }
        Insert: {
          capitolo?: string | null
          codice: string
          descrizione: string
          id?: string
          prezzario_id: string
          prezzo: number
          search?: unknown
          unita: Database["public"]["Enums"]["unita_misura"]
          unita_testo: string
        }
        Update: {
          capitolo?: string | null
          codice?: string
          descrizione?: string
          id?: string
          prezzario_id?: string
          prezzo?: number
          search?: unknown
          unita?: Database["public"]["Enums"]["unita_misura"]
          unita_testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "prezzario_voci_prezzario_id_fkey"
            columns: ["prezzario_id"]
            isOneToOne: false
            referencedRelation: "prezzari"
            referencedColumns: ["id"]
          },
        ]
      }
      prezzi_unitari: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          note: string | null
          org_id: string | null
          prezzo: number
          unita: Database["public"]["Enums"]["unita_misura"]
          voce: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          note?: string | null
          org_id?: string | null
          prezzo: number
          unita: Database["public"]["Enums"]["unita_misura"]
          voce: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          note?: string | null
          org_id?: string | null
          prezzo?: number
          unita?: Database["public"]["Enums"]["unita_misura"]
          voce?: string
        }
        Relationships: [
          {
            foreignKeyName: "prezzi_unitari_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_org_id: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_org_id?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_org_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_org_id_fkey"
            columns: ["current_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      richieste_rate_log: {
        Row: {
          azione: string
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          azione: string
          created_at?: string
          id?: number
          ip_hash: string
        }
        Update: {
          azione?: string
          created_at?: string
          id?: number
          ip_hash?: string
        }
        Relationships: []
      }
      richieste_servizio: {
        Row: {
          cartella: string | null
          comune: string | null
          created_at: string
          descrizione: string
          email: string
          files: Json
          id: string
          nome: string
          note_interne: string | null
          notifica_email_ok: boolean | null
          notifica_whatsapp_ok: boolean | null
          stato: Database["public"]["Enums"]["richiesta_stato"]
          telefono: string | null
          tipo: Database["public"]["Enums"]["richiesta_tipo"]
        }
        Insert: {
          cartella?: string | null
          comune?: string | null
          created_at?: string
          descrizione: string
          email: string
          files?: Json
          id?: string
          nome: string
          note_interne?: string | null
          notifica_email_ok?: boolean | null
          notifica_whatsapp_ok?: boolean | null
          stato?: Database["public"]["Enums"]["richiesta_stato"]
          telefono?: string | null
          tipo: Database["public"]["Enums"]["richiesta_tipo"]
        }
        Update: {
          cartella?: string | null
          comune?: string | null
          created_at?: string
          descrizione?: string
          email?: string
          files?: Json
          id?: string
          nome?: string
          note_interne?: string | null
          notifica_email_ok?: boolean | null
          notifica_whatsapp_ok?: boolean | null
          stato?: Database["public"]["Enums"]["richiesta_stato"]
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["richiesta_tipo"]
        }
        Relationships: []
      }
      voci_proprie: {
        Row: {
          categoria: string | null
          created_at: string
          descrizione: string
          documento_id: string | null
          id: string
          org_id: string
          prezzo: number
          search: unknown
          titolo: string
          unita: Database["public"]["Enums"]["unita_misura"]
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descrizione: string
          documento_id?: string | null
          id?: string
          org_id: string
          prezzo: number
          search?: unknown
          titolo: string
          unita?: Database["public"]["Enums"]["unita_misura"]
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descrizione?: string
          documento_id?: string | null
          id?: string
          org_id?: string
          prezzo?: number
          search?: unknown
          titolo?: string
          unita?: Database["public"]["Enums"]["unita_misura"]
        }
        Relationships: [
          {
            foreignKeyName: "voci_proprie_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti_libreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voci_proprie_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      avvia_elaborazione_documento: {
        Args: { p_doc: string }
        Returns: {
          created_at: string
          created_by: string | null
          elaborazione_at: string | null
          errore: string | null
          id: string
          nome_file: string
          org_id: string
          stato: Database["public"]["Enums"]["documento_stato"]
          storage_path: string
          voci_estratte: number
        }
        SetofOptions: {
          from: "*"
          to: "documenti_libreria"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cerca_prezzario: {
        Args: { p_limit?: number; p_regione: string; q: string }
        Returns: {
          codice: string
          descrizione: string
          id: string
          prezzario: string
          prezzo: number
          rank: number
          unita: Database["public"]["Enums"]["unita_misura"]
          unita_testo: string
        }[]
      }
      cerca_voci_proprie: {
        Args: { p_limit?: number; p_org: string; q: string }
        Returns: {
          descrizione: string
          id: string
          prezzo: number
          rank: number
          titolo: string
          unita: Database["public"]["Enums"]["unita_misura"]
        }[]
      }
      create_organization: { Args: { org_name: string }; Returns: string }
      invite_member: {
        Args: {
          member_email: string
          member_role?: Database["public"]["Enums"]["membership_role"]
          target_org: string
        }
        Returns: string
      }
      is_org_admin: { Args: { target_org: string }; Returns: boolean }
      list_org_members: {
        Args: { target_org: string }
        Returns: {
          email: string
          full_name: string
          joined_at: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }[]
      }
      user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      cliente_tipo: "condominio" | "privato" | "azienda"
      documento_stato: "caricato" | "in_elaborazione" | "elaborato" | "errore"
      fonte_prezzi: "prezzario" | "propri" | "entrambi"
      fonte_scelta: "prezzario" | "propria" | "manuale"
      membership_role: "owner" | "admin" | "member"
      preventivo_modalita: "capitolato" | "manuale" | "foto"
      preventivo_stato: "bozza" | "inviato" | "accettato" | "rifiutato"
      richiesta_stato: "nuova" | "in_lavorazione" | "evasa" | "scartata"
      richiesta_tipo: "foto_descrizione" | "foto_capitolato"
      unita_misura: "corpo" | "mq" | "ml" | "mc" | "giorno" | "cad" | "kg"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cliente_tipo: ["condominio", "privato", "azienda"],
      documento_stato: ["caricato", "in_elaborazione", "elaborato", "errore"],
      fonte_prezzi: ["prezzario", "propri", "entrambi"],
      fonte_scelta: ["prezzario", "propria", "manuale"],
      membership_role: ["owner", "admin", "member"],
      preventivo_modalita: ["capitolato", "manuale", "foto"],
      preventivo_stato: ["bozza", "inviato", "accettato", "rifiutato"],
      richiesta_stato: ["nuova", "in_lavorazione", "evasa", "scartata"],
      richiesta_tipo: ["foto_descrizione", "foto_capitolato"],
      unita_misura: ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"],
    },
  },
} as const

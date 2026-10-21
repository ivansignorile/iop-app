import { Bricolage_Grotesque, Caveat, Hanken_Grotesk } from "next/font/google";

// Font di tutta l'app (stile della landing): grottesco display, testo, scritta a mano.
const display = Bricolage_Grotesque({
  variable: "--font-home-display-family",
  subsets: ["latin"],
  display: "swap",
});

const body = Hanken_Grotesk({
  variable: "--font-home-body-family",
  subsets: ["latin"],
  display: "swap",
});

const hand = Caveat({
  variable: "--font-home-hand-family",
  subsets: ["latin"],
  display: "swap",
});

export const appFonts = `${display.variable} ${body.variable} ${hand.variable}`;

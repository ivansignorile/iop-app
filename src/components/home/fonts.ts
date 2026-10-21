import { Bricolage_Grotesque, Caveat, Hanken_Grotesk } from "next/font/google";

// Sostituti liberi dei font del riferimento (grottesco display + Graphik + scritta a mano).
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

export const homeFonts = `${display.variable} ${body.variable} ${hand.variable}`;

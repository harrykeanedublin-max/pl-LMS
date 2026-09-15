import type { Metadata } from "next";
import { Archivo_Black, Libre_Franklin } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const archivoBlack = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const libreFranklin = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Not LMS 2, Electric Boogaloo",
  description: "Premier League weekly team pick'em pool",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${libreFranklin.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-body">
        <Nav />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

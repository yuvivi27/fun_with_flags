import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./auth-context";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});
const exo2 = Exo_2({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Fun With Flags",
  description:
    "Welcome to the ultimate flag mastery challenge. Master 195+ world flags across multiple difficulty levels, beat the clock, and earn your Perfection Bonus!",
  icons: {
    icon: "/flags_logo.png",
    shortcut: "/flags_logo.png",
    apple: "/flags_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${exo2.variable}`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

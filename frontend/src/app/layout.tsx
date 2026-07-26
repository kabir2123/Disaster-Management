import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

// Interface + body. A deliberate face engineered for machine interfaces —
// not Inter, not a system stack. (The previous build declared Nunito Sans
// but never loaded it, so it silently rendered in system-ui.)
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

// Utility face — IDs, timestamps, ages, coordinates, N/5. Fixed-width so
// dense tabular data lines up.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResQ — incident console",
  description: "District incident coordination for disaster response.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-full bg-canvas text-fg">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

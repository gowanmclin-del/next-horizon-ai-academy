import type { Metadata } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

// Phase 15 fix: metadataBase was previously hardcoded to a placeholder
// domain, contradicting the requirement that every production URL be
// configurable rather than hardcoded (the same reasoning already applied
// to lib/email/site-url.ts and the Stripe redirect URLs since Phase 5/6).
// Falls back to the same placeholder only when NEXT_PUBLIC_SITE_URL isn't
// set, so metadata generation never throws in an unconfigured environment.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://NextHorizonAIAcademy.com";

export const metadata: Metadata = {
  title: "Next Horizon AI Academy | Practical AI Education",
  description:
    "Learn practical artificial intelligence skills with Next Horizon AI Academy. Beginner-friendly AI education, professional certification, and real-world learning for professionals, entrepreneurs, and business owners.",
  openGraph: {
    title: "Next Horizon AI Academy | Practical AI Education",
    description:
      "Learn practical artificial intelligence skills with Next Horizon AI Academy. Beginner-friendly AI education, professional certification, and real-world learning for professionals, entrepreneurs, and business owners.",
    siteName: "Next Horizon AI Academy",
    type: "website",
    locale: "en_US",
  },
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-horizon-navy focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import { contacts, legal } from "@/content/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// SUSE Mono ships Latin only; Cyrillic glyphs fall through to Geist — the same
// substitution the Figma file renders (measured widths within 2–3%).
const suseMono = localFont({
  variable: "--font-suse",
  src: "../fonts/SUSEMono-latin.woff2",
  weight: "100 800",
  display: "swap",
  adjustFontFallback: false,
});

const suseMonoExt = localFont({
  variable: "--font-suse-ext",
  src: "../fonts/SUSEMono-latin-ext.woff2",
  weight: "100 800",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

// Cyrillic for mono text: Geist scaled 2.5% so mono lines wrap exactly like the Figma file.
const monoCyrillic = localFont({
  variable: "--font-mono-cyr",
  src: "../fonts/Geist-cyrillic.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "size-adjust", value: "102.5%" },
    { prop: "unicode-range", value: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116" },
  ],
});

const SITE_URL = "https://kewate.ru";
const title = "Kewate — сайты, сервисы и дизайн, которые приносят заявки";
const description =
  "Kewate — студия цифровых продуктов: разработка, дизайн и маркетинг в одной команде. Сайты, интернет-магазины, приложения, сервисы, дизайн и реклама.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "Kewate",
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kewate — студия цифровых продуктов" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kewate",
  description: "Студия цифровых продуктов",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  email: contacts.email,
  telephone: contacts.phone,
  legalName: legal.owner,
  taxID: legal.inn.replace(/\D/g, ""),
  contactPoint: {
    "@type": "ContactPoint",
    telephone: contacts.phone,
    email: contacts.email,
    contactType: "sales",
    availableLanguage: "Russian",
  },
};

// Runs before paint: marks JS, reduced motion and returning visitors (skip preloader).
const bootScript = `(function(){var d=document.documentElement;d.classList.add('js');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('reduced');if(sessionStorage.getItem('kw-visited'))d.classList.add('visited')}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${geist.variable} ${suseMono.variable} ${suseMonoExt.variable} ${monoCyrillic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

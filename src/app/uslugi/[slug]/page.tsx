import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { servicePageBySlug, servicePages, serviceCopy } from "@/content/services";
import { ServicePageView } from "@/components/service/ServicePageView";

const SITE_URL = "https://kewate.ru";

export const dynamicParams = false;

export function generateStaticParams() {
  return servicePages.map((p) => ({ slug: p.slug }));
}

const h1Text = (slug: string) => servicePageBySlug(slug)!.h1.map(([t]) => t).join("");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = servicePageBySlug(slug);
  if (!page) return {};
  // description is assembled from copy that is on the page itself
  const description = `${h1Text(slug)}. ${page.specs.map((s) => `${s.label}: ${s.value}`).join(", ")}. ${serviceCopy.typesLead}`;
  const url = `/uslugi/${slug}`;
  return {
    title: page.metaTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: `${SITE_URL}${url}`,
      siteName: "Kewate",
      title: page.metaTitle,
      description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kewate — студия цифровых продуктов" }],
    },
    twitter: { card: "summary_large_image", title: page.metaTitle, description, images: ["/og.png"] },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = servicePageBySlug(slug);
  if (!page) notFound();

  const url = `${SITE_URL}/uslugi/${slug}`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: h1Text(slug),
      url,
      provider: { "@type": "Organization", name: "Kewate", url: SITE_URL },
      areaServed: "RU",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      // placeholder answers («[Ответ: заполнить]») are not published to search engines
      mainEntity: page.faq
        .filter((f) => !/\[Ответ: заполнить\]/.test(f.a))
        .map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: h1Text(slug), item: url },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {/* build time seeds the static HTML; the client switches to the real clock right after hydration */}
      <ServicePageView page={page} initialNow={Date.now()} />
    </>
  );
}

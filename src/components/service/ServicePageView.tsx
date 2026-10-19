"use client";

import { serviceCopy, type ServicePage } from "@/content/service-shared";
import { Providers } from "@/components/motion/Providers";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import { Audit } from "@/components/sections/Audit";
import { Contact } from "@/components/sections/Contact";
import { LeadProvider, useLead } from "./LeadContext";
import { DemoBanner } from "./DemoBanner";
import { ServiceTypes } from "./ServiceTypes";
import { Estimate } from "./Estimate";
import { ServiceProcess } from "./ServiceProcess";
import { Faq } from "./Faq";
import { StickySlotBar } from "./StickySlotBar";
import { LeadModal } from "./LeadModal";

const serviceNav = [
  { id: "projects", label: "Проекты", href: "#projects" },
  { id: "prices", label: "Цены", href: "#types" },
  { id: "about", label: "О студии", href: "#about" },
  { id: "contacts", label: "Контакты", href: "#contacts" },
] as const;

/**
 * Service page template (205:309…213:309): hero → о студии → виды + свободные слоты → проекты →
 * бесплатный разбор → что входит + часто заказывают вместе → процесс + план → FAQ → связь и футер.
 * Everything that differs between the eight pages lives in content/services.ts.
 */
export function ServicePageView({ page, initialNow }: { page: ServicePage; initialNow: number }) {
  return (
    <Providers>
      <LeadProvider initialNow={initialNow}>
        <Page page={page} />
      </LeadProvider>
    </Providers>
  );
}

function Page({ page }: { page: ServicePage }) {
  const { openLead } = useLead();
  return (
    <>
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      {page.demoBanner && <DemoBanner />}
      <Header items={serviceNav} home="/" onCta={() => openLead()} />
      <main id="main">
        <Hero
          service={{
            h1: page.h1,
            specs: page.specs,
            onPrimary: () => openLead(),
            onSecondary: () => openLead({ topic: "Рассчитать стоимость" }),
          }}
        />
        <About tight />
        <ServiceTypes page={page} />
        <Projects topic={page.filter} />
        <Audit content={page.audit} />
        <Estimate page={page} />
        <ServiceProcess page={page} />
        <Faq items={page.faq} />
        <Contact title={serviceCopy.contactTitle} footerTitle={serviceCopy.footerTitle} />
      </main>
      <StickySlotBar />
      <LeadModal />
    </>
  );
}

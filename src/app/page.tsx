import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/motion/Providers";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import { Services } from "@/components/sections/Services";
import { Audit } from "@/components/sections/Audit";
import { Process } from "@/components/sections/Process";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <Providers>
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Projects />
        <Services />
        <Audit />
        <Process />
        <Contact />
      </main>
    </Providers>
  );
}

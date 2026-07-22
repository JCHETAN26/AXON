import { ArchitectureAudit } from "@/components/landing/architecture-audit";
import { ArchitectureEvolution } from "@/components/landing/architecture-evolution";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { LiveMonitoring } from "@/components/landing/live-monitoring";
import { LocalMcpWorkflow } from "@/components/landing/local-mcp-workflow";
import { PricingSection } from "@/components/landing/pricing-section";
import { PromptToProduction } from "@/components/landing/prompt-to-production";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TrafficSimulation } from "@/components/landing/traffic-simulation";

export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:border focus:border-accent focus:bg-surface focus:px-4 focus:py-2 focus:type-label-caps"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <HeroSection />
        <PromptToProduction />
        <ArchitectureAudit />
        <LocalMcpWorkflow />
        <TrafficSimulation />
        <ArchitectureEvolution />
        <LiveMonitoring />
        <PricingSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer/Footer";
import { MarketplaceHero } from "./marketplace/MarketplaceHero";
import { MarketplaceBenefits } from "./marketplace/MarketplaceBenefits";
import { MarketplaceCTA } from "./marketplace/MarketplaceCTA";
import { Helmet } from "react-helmet-async";

export default function Marketplace() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Marketplace — Crunch Carbon</title>
        <meta name="description" content="The Crunch Carbon Marketplace — buy, sell, and trade verified carbon credits transparently and efficiently. Coming soon." />
        <link rel="canonical" href="https://crunchcarbon.com/marketplace" />
        <meta property="og:title" content="Marketplace — Crunch Carbon" />
        <meta property="og:description" content="The Crunch Carbon Marketplace — buy, sell, and trade verified carbon credits transparently and efficiently. Coming soon." />
        <meta property="og:url" content="https://crunchcarbon.com/marketplace" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      <main className="flex-1">
        <MarketplaceHero />
        <MarketplaceBenefits />
        <MarketplaceCTA />
      </main>
      <Footer />
    </div>
  );
}

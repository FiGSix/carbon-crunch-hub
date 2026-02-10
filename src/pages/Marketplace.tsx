import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer/Footer";
import { MarketplaceHero } from "./marketplace/MarketplaceHero";
import { MarketplaceBenefits } from "./marketplace/MarketplaceBenefits";
import { MarketplaceCTA } from "./marketplace/MarketplaceCTA";

export default function Marketplace() {
  useEffect(() => {
    document.title = "Marketplace — Crunch Carbon";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "The Crunch Carbon Marketplace — buy, sell, and trade verified carbon credits transparently and efficiently. Coming soon."
      );
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
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

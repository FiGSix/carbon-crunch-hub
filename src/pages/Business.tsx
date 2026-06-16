import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { BusinessHeroSection } from "./business/BusinessHeroSection";
import { BusinessTrustBadges } from "./business/BusinessTrustBadges";
import { BusinessSegments } from "./business/BusinessSegments";
import { BusinessValueCards } from "./business/BusinessValueCards";
import { BusinessCalculator } from "./business/BusinessCalculator";
import { BusinessHowItWorks } from "./business/BusinessHowItWorks";
import { BusinessFAQ } from "./business/BusinessFAQ";
import { BusinessCTA } from "./business/BusinessCTA";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const Business = () => {
  const navigate = useNavigate();
  const [showCalculator, setShowCalculator] = useState(false);

  const handleCalculateClick = () => {
    // Scroll to calculator section
    const calculatorSection = document.getElementById('business-calculator');
    if (calculatorSection) {
      calculatorSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleConsultationClick = () => {
    navigate('/contact');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Commercial Solar Carbon Credits | Crunch Carbon</title>
        <meta name="description" content="Monetise your commercial solar with verified carbon credits. Earn R10,000-R100,000+ annually with ESG reporting and zero operational burden." />
        <link rel="canonical" href="https://crunchcarbon.com/business" />
        <meta property="og:title" content="Commercial Solar Carbon Credits | Crunch Carbon" />
        <meta property="og:description" content="Monetise your commercial solar with verified carbon credits. Earn R10,000-R100,000+ annually with ESG reporting and zero operational burden." />
        <meta property="og:url" content="https://crunchcarbon.com/business" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Commercial Solar Carbon Credits",
          "provider": { "@type": "Organization", "name": "Crunch Carbon" },
          "description": "Monetize commercial and industrial solar systems with verified carbon credits. Earn R10,000-R100,000+ annually with ESG reporting.",
          "areaServed": { "@type": "Country", "name": "South Africa" },
          "serviceType": "Commercial Carbon Credit Generation",
          "audience": { "@type": "BusinessAudience", "audienceType": "Commercial and Industrial Solar Owners" },
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "ZAR", "description": "Free registration for commercial solar systems 50kWp to 1MW+" }
        })}</script>
      </Helmet>
      <Header />
      
      <main className="flex-1">
        <BusinessHeroSection 
          onCalculateClick={handleCalculateClick}
          onConsultationClick={handleConsultationClick}
        />
        <BusinessTrustBadges />
        <BusinessSegments />
        <BusinessValueCards />
        <div id="business-calculator">
          <BusinessCalculator />
        </div>
        <BusinessHowItWorks />
        <BusinessFAQ />
        <BusinessCTA onConsultationClick={handleConsultationClick} />
      </main>
      
      <Footer />
    </div>
  );
};

export default Business;

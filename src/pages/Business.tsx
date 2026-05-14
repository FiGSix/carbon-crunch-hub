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

  useEffect(() => {
    // Set page title
    document.title = "For Business - Commercial Solar Carbon Credits | Crunch Carbon";
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Monetise your commercial or industrial solar system with verified carbon credits. Earn R10,000-R100,000+ annually. ESG reporting, multi-site aggregation, zero operational burden.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Monetise your commercial or industrial solar system with verified carbon credits. Earn R10,000-R100,000+ annually. ESG reporting, multi-site aggregation, zero operational burden.';
      document.head.appendChild(meta);
    }

    // Set meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'commercial solar, industrial solar, carbon credits, ESG reporting, sustainability, business solar, solar ROI, carbon offset certificates');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'commercial solar, industrial solar, carbon credits, ESG reporting, sustainability, business solar, solar ROI, carbon offset certificates';
      document.head.appendChild(meta);
    }

    // Set Open Graph tags for social sharing
    const updateOrCreateOGTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
      }
    };

    updateOrCreateOGTag('og:title', 'For Business - Commercial Solar Carbon Credits');
    updateOrCreateOGTag('og:description', 'Monetise your commercial or industrial solar system. Earn R10,000-R100,000+ annually with verified carbon credits.');
    updateOrCreateOGTag('og:type', 'website');

    // Cleanup function to restore default title when component unmounts
    return () => {
      document.title = 'Crunch Carbon Hub';
    };
  }, []);

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

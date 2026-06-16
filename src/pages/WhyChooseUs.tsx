import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer/Footer";
import { WhyChooseUsHero } from "@/pages/why-choose-us/WhyChooseUsHero";
import { VerificationSection } from "@/pages/why-choose-us/VerificationSection";
import { WhyVerraMatters } from "@/pages/why-choose-us/WhyVerraMatters";
import { ChoosePartnerTips } from "@/pages/why-choose-us/ChoosePartnerTips";
import { WhyChooseUsFAQ } from "@/pages/why-choose-us/WhyChooseUsFAQ";
import { WhyChooseUsCTA } from "@/pages/why-choose-us/WhyChooseUsCTA";
import { Helmet } from "react-helmet-async";

const WhyChooseUs = () => {
  return (
    <>
      <Helmet>
        <title>Why Choose Crunch Carbon | Verra Certified</title>
        <meta name="description" content="Discover why Crunch Carbon is the trusted choice for solar carbon credits with Verra VCS certification and transparent processes." />
        <link rel="canonical" href="https://crunchcarbon.com/why-choose-us" />
        <meta property="og:title" content="Why Choose Crunch Carbon | Verra Certified" />
        <meta property="og:description" content="Discover why Crunch Carbon is the trusted choice for solar carbon credits with Verra VCS certification and transparent processes." />
        <meta property="og:url" content="https://crunchcarbon.com/why-choose-us" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      <main>
        <WhyChooseUsHero />
        <VerificationSection />
        <WhyVerraMatters />
        <ChoosePartnerTips />
        <WhyChooseUsFAQ />
        <WhyChooseUsCTA />
      </main>
      <Footer />
    </>
  );
};

export default WhyChooseUs;

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer/Footer";
import { WhyChooseUsHero } from "@/pages/why-choose-us/WhyChooseUsHero";
import { VerificationSection } from "@/pages/why-choose-us/VerificationSection";
import { WhyVerraMatters } from "@/pages/why-choose-us/WhyVerraMatters";
import { ChoosePartnerTips } from "@/pages/why-choose-us/ChoosePartnerTips";
import { WhyChooseUsFAQ } from "@/pages/why-choose-us/WhyChooseUsFAQ";
import { WhyChooseUsCTA } from "@/pages/why-choose-us/WhyChooseUsCTA";

const WhyChooseUs = () => {
  return (
    <>
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

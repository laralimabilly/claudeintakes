import { HeroSection } from "@/components/cofounder/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { TrustSignalSection } from "@/components/TrustSignalSection";
import { FAQSection } from "@/components/FAQSection";
import { FinalCTASection } from "@/components/cofounder/FinalCTASection";
import { Footer } from "@/components/Footer";

const CofounderMatching = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <TrustSignalSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default CofounderMatching;
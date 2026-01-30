import { useState } from "react";
import { PhoneInput } from "../PhoneInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const FinalCTASection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePhoneSubmit = async (phoneNumber: string, countryCode: string) => {
    if (phoneNumber.length < 10) {
      toast({
        title: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('start-call', {
        body: { phoneNumber: `${countryCode}${phoneNumber}` }
      });

      if (error) {
        console.error('Error initiating call:', error);
        toast({
          title: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Call initiated! 📞 You'll receive a call within 30 seconds",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-charcoal relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal to-[hsl(0_0%_8%)]" />
      
      {/* Background hand-drawn elements */}
      <svg className="absolute top-16 left-16 w-20 h-20 text-silver/[0.04] hidden lg:block" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
      </svg>
      <svg className="absolute bottom-20 right-20 w-24 h-24 text-silver/[0.04] hidden lg:block" viewBox="0 0 100 100">
        <path d="M 20,50 Q 50,20 80,50 T 140,50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Hand-drawn frame around CTA */}
        <div className="relative py-12 sm:py-16 px-6 sm:px-12">
          <svg className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] pointer-events-none" viewBox="0 0 500 350" preserveAspectRatio="none">
            <path 
              d="M 15,20 Q 10,8 35,12 L 465,15 Q 490,8 487,30 L 483,320 Q 488,342 462,338 L 32,340 Q 10,345 15,320 L 20,35 Q 12,18 15,20" 
              fill="none" 
              stroke="rgba(255,255,255,0.06)" 
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="relative space-y-8 sm:space-y-10">
            <div>
              <span className="text-silver/40 text-xs tracking-widest uppercase block mb-4">Take the First Step</span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-medium text-white px-2 tracking-tight mb-4">
                Ready to Find Your Co-Founder?
              </h2>
              {/* Hand-drawn underline */}
              <svg className="mx-auto w-40 h-4 text-ochre/50" viewBox="0 0 180 20">
                <path d="M 5,10 Q 45,16 90,8 T 175,12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            
            <p className="font-handwritten text-2xl text-silver/60 max-w-2xl mx-auto px-2 leading-relaxed">
              Join 100+ founders already building their future - one conversation at a time.
            </p>
            
            <div className="pt-4 sm:pt-6 max-w-xl mx-auto">
              <PhoneInput onSubmit={handlePhoneSubmit} isLoading={isLoading} variant="dark" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
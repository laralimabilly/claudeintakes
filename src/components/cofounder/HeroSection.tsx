import { useState } from "react";
import { Link } from "react-router-dom";
import { PhoneInput } from "../PhoneInput";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const HeroSection = () => {
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
        const errorBody = typeof error === 'object' && error.message ? error.message : '';
        const isAlreadyRegistered = errorBody.includes('already registered') || 
          (data && data.alreadyRegistered);
        
        toast({
          title: isAlreadyRegistered 
            ? "You're already in our system! We'll be in touch soon 🎉" 
            : "Something went wrong. Please try again.",
          variant: isAlreadyRegistered ? "default" : "destructive",
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
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20 sm:py-28 bg-charcoal overflow-hidden">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal to-[hsl(0_0%_8%)]" />
      
      {/* Background hand-drawn elements - hidden on mobile for cleaner look */}
      <svg className="absolute top-20 left-10 w-32 h-32 text-silver/5 hidden md:block" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4" />
      </svg>
      <svg className="absolute bottom-32 right-16 w-24 h-24 text-silver/5 hidden md:block" viewBox="0 0 100 100">
        <path d="M 10,50 Q 30,20 50,50 T 90,50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <svg className="absolute top-40 right-1/4 w-16 h-16 text-silver/[0.07] hidden lg:block" viewBox="0 0 100 100">
        <path d="M 20,20 L 80,20 L 80,80 L 20,80 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 6" transform="rotate(12 50 50)" />
      </svg>
      
      {/* Back to home link */}
      <Link 
        to="/" 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 text-silver hover:text-white transition-colors min-h-[44px] min-w-[44px] px-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Home</span>
      </Link>
      
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8 sm:space-y-10">
        {/* Hand-drawn tag/pill */}
        <div className="relative inline-block">
          <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none" viewBox="0 0 200 50" preserveAspectRatio="none">
            <path 
              d="M 10,25 Q 8,10 25,12 L 175,10 Q 192,8 190,25 Q 192,42 175,40 L 25,42 Q 8,44 10,25" 
              fill="none" 
              stroke="rgba(255,255,255,0.15)" 
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="relative text-xs sm:text-sm font-medium text-silver tracking-wide uppercase px-4 py-2 inline-block">
            AI-Powered Co-Founder Matching
          </span>
        </div>
        
        {/* Main headline with hand-drawn underline */}
        <div className="relative">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-medium text-white leading-tight text-balance px-2 tracking-tight">
            Tell your story, and let potential co-founders come to you.
          </h1>
          {/* Hand-drawn underline accent */}
          <svg className="mx-auto mt-6 w-48 h-4 text-ochre/60" viewBox="0 0 200 20">
            <path 
              d="M 5,10 Q 40,15 100,8 T 195,12" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* Subheadline */}
        <p className="text-base sm:text-xl md:text-2xl text-silver max-w-3xl mx-auto text-balance px-2 leading-relaxed">
          What if you could enlist an AI to get matched with others who complement your skills, share your values and are ready to build?
        </p>
        
        {/* Phone input */}
        <div className="relative pt-6 sm:pt-10 max-w-xl mx-auto px-2">
          <div className="relative">
            <PhoneInput onSubmit={handlePhoneSubmit} isLoading={isLoading} variant="dark" />
            <p className="text-silver/60 mt-5 font-handwritten text-xl sm:text-2xl">
              You'll get a call within 30 seconds
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
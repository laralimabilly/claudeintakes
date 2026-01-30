import { useState } from "react";
import { PhoneInput } from "./PhoneInput";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
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
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-maroon/5 via-background to-gold/5" />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20px 20px, hsl(var(--maroon) / 0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-maroon">AI-Powered Co-Founder Matching</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-maroon leading-tight text-balance">
          Tell your story, and let potential co-founders come to you.
        </h1>
        
        <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance">
          What if you could enlist an AI to get matched with others who complement your skills, share your values and are ready to build?
        </p>
        
        <div className="pt-8">
          <PhoneInput onSubmit={handlePhoneSubmit} isLoading={isLoading} />
          <p className="text-sm text-muted-foreground mt-4">
            You'll get a call within 30 seconds
          </p>
        </div>
      </div>
    </section>
  );
};

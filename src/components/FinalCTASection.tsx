import { useState } from "react";
import { PhoneInput } from "./PhoneInput";
import { useToast } from "@/hooks/use-toast";

export const FinalCTASection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePhoneSubmit = async (phoneNumber: string, countryCode: string) => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Thanks! Expect a call in 30 seconds",
      description: `We'll call you at ${countryCode} ${phoneNumber}`,
    });
    
    setIsLoading(false);
  };

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-maroon/5 to-gold/5">
      <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-up">
        <h2 className="text-4xl sm:text-5xl font-bold text-maroon">
          Ready to Find Your Co-Founder?
        </h2>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join founders already building their future - one conversation at a time.
        </p>
        
        <div className="pt-4">
          <PhoneInput onSubmit={handlePhoneSubmit} isLoading={isLoading} />
        </div>
      </div>
    </section>
  );
};

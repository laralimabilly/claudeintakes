import { Phone, MessageCircle, Handshake } from "lucide-react";

const steps = [
  {
    icon: Phone,
    title: "Enter Your Number",
    description: "We'll call you within 30 seconds - no app download needed.",
  },
  {
    icon: MessageCircle,
    title: "Tell Your Story",
    description: "You'll chat with our AI to learn what you're building, what you bring and what you need. All in less than 15 minutes.",
  },
  {
    icon: Handshake,
    title: "Get Matched",
    description: "We'll introduce you to compatible co-founders via WhatsApp. Double opt-in ensures both sides are genuinely interested.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-cream relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Background sketch elements */}
      <svg className="absolute top-16 right-12 w-20 h-20 text-charcoal/[0.04] hidden lg:block" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" />
      </svg>
      <svg className="absolute bottom-20 left-16 w-16 h-16 text-charcoal/[0.04] hidden lg:block" viewBox="0 0 100 100">
        <path d="M 20,50 Q 50,20 80,50 T 140,50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header with hand-drawn underline */}
        <div className="text-center mb-16 sm:mb-24">
          <span className="text-charcoal/40 text-xs tracking-widest uppercase block mb-4">The Process</span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-medium text-charcoal mb-4 tracking-tight">
            Three Steps to Find<br className="sm:hidden" />{" "}Your Co-Founder
          </h2>
          <svg className="mx-auto w-32 h-4 text-charcoal/20" viewBox="0 0 150 20">
            <path d="M 5,10 Q 35,16 75,8 T 145,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        
        {/* Steps with organic layout */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative"
            >
              {/* Hand-drawn frame - simplified on mobile */}
              <svg className="absolute -inset-2 sm:-inset-3 w-[calc(100%+16px)] sm:w-[calc(100%+24px)] h-[calc(100%+16px)] sm:h-[calc(100%+24px)] pointer-events-none" viewBox="0 0 300 280" preserveAspectRatio="none">
                <path 
                  d={index === 0 
                    ? "M 12,15 Q 8,8 25,10 L 275,12 Q 292,8 290,25 L 288,255 Q 290,272 273,268 L 22,270 Q 8,273 12,255 L 15,25 Q 10,15 12,15"
                    : index === 1
                    ? "M 15,12 C 10,5 28,8 45,10 L 258,8 C 288,5 292,18 288,35 L 285,248 C 288,268 272,273 255,270 L 38,272 C 12,275 8,260 12,245 L 18,28 C 15,12 15,12 15,12"
                    : "M 10,18 L 288,12 Q 295,12 292,28 L 287,252 Q 290,270 272,267 L 25,272 Q 8,275 12,258 L 15,30 Q 8,15 10,18"
                  }
                  fill="none" 
                  stroke="rgba(43,43,43,0.06)" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              
              <div className="relative bg-white/60 backdrop-blur-sm p-8 sm:p-10 h-full">
                {/* Step number - hand-drawn circle */}
                <div className="relative w-14 h-14 mb-6">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(43,43,43,0.15)" strokeWidth="1.5" strokeDasharray="4 3" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-charcoal" strokeWidth={1.5} />
                  </div>
                </div>
                
                <h3 className="text-lg sm:text-xl font-medium text-charcoal mb-3">
                  {step.title}
                </h3>
                
                <p className="text-sm sm:text-base text-charcoal/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
              
              {/* Connecting arrow to next step */}
              {index < 2 && (
                <svg className="hidden lg:block absolute -right-3 top-1/2 w-6 h-12 text-charcoal/15" viewBox="0 0 30 60">
                  <path d="M 5,30 Q 15,30 20,30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
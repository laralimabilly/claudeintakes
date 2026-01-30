import ycLogo from "@/assets/logos/yc-logo.svg";
import ondeckLogo from "@/assets/logos/ondeck-logo.svg";
import antlerLogo from "@/assets/logos/antler-logo.svg";
import techstarsLogo from "@/assets/logos/techstars-logo.svg";
import efLogo from "@/assets/logos/ef-logo-new.png";

const accelerators = [
  { name: "Y Combinator", url: "https://www.ycombinator.com/", logo: ycLogo },
  { name: "On Deck", url: "https://www.beondeck.com/", logo: ondeckLogo },
  { name: "Antler", url: "https://www.antler.co/", logo: antlerLogo },
  { name: "Techstars", url: "https://www.techstars.com/", logo: techstarsLogo },
  { name: "Entrepreneur First", url: "https://www.joinef.com/", logo: efLogo },
];

export const TrustSignalSection = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-charcoal relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal to-[hsl(0_0%_12%)]" />
      
      {/* Hand-drawn decorative elements */}
      <svg className="absolute top-12 left-1/4 w-24 h-24 text-silver/[0.04] hidden lg:block" viewBox="0 0 100 100">
        <path d="M 10,50 Q 50,10 90,50 Q 50,90 10,50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <svg className="absolute bottom-16 right-1/4 w-16 h-16 text-silver/[0.05] hidden lg:block" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4" />
      </svg>
      
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Hand-drawn frame around entire section */}
        <div className="relative">
          <svg className="absolute -inset-8 w-[calc(100%+64px)] h-[calc(100%+64px)] pointer-events-none hidden sm:block" viewBox="0 0 600 300" preserveAspectRatio="none">
            <path 
              d="M 20,20 Q 15,10 40,15 L 560,18 Q 585,12 582,35 L 578,265 Q 582,288 558,282 L 38,285 Q 12,290 18,265 L 22,40 Q 18,20 20,20" 
              fill="none" 
              stroke="rgba(255,255,255,0.04)" 
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="relative text-center mb-10 sm:mb-14">
            <span className="text-silver/40 text-xs tracking-widest uppercase block mb-4">Standing on Giants</span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light text-white mb-2 px-2 tracking-tight">
              We Use the Same Matching Principles Used By
            </h2>
            {/* Hand-drawn underline */}
            <svg className="mx-auto w-40 h-4 text-silver/20 mt-4" viewBox="0 0 180 20">
              <path d="M 5,10 Q 45,16 90,8 T 175,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 lg:gap-16 mb-10 sm:mb-12">
            {accelerators.map((accelerator, index) => {
              const sizeClass = accelerator.name === "Y Combinator" 
                ? "h-10 sm:h-12 md:h-14" 
                : (accelerator.name === "Techstars") 
                  ? "h-8 sm:h-10 md:h-11" 
                  : "h-6 sm:h-8 md:h-9";
              
              const isEF = accelerator.name === "Entrepreneur First";
              
              return (
                <div 
                  key={index}
                  className="group"
                >
                  <img 
                    src={accelerator.logo}
                    alt={`${accelerator.name} logo`}
                    className={`${sizeClass} w-auto opacity-50 group-hover:opacity-80 transition-all duration-300 object-contain ${isEF ? '' : 'brightness-0 invert'}`}
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
          
          {/* Link to science page */}
          <div className="text-center">
            <a 
              href="/science" 
              className="inline-flex items-center gap-2 text-silver hover:text-white transition-colors group font-handwritten text-xl"
            >
              <span>Learn about the science of co-founder matching</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
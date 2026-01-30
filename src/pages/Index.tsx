import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Full screen, bold typography */}
      <section className="min-h-screen flex flex-col justify-between bg-charcoal relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal to-black" />
        
        {/* Line character illustration - subtle background */}
        <img 
          src="/images/line-character.png?v=2" 
          alt=""
          aria-hidden="true"
          className="absolute right-4 sm:right-[10%] lg:right-[15%] bottom-64 sm:bottom-auto sm:top-[40%] sm:-translate-y-1/2 h-[360px] sm:h-[450px] lg:h-[540px] xl:h-[630px] w-auto opacity-30 sm:opacity-15 pointer-events-none z-0 mix-blend-lighten"
        />
        
        {/* Top bar */}
        <div className="relative z-10 flex justify-between items-start px-6 sm:px-12 lg:px-20 pt-8 sm:pt-12">
          <span className="text-white/40 text-xs sm:text-sm tracking-widest uppercase">Est. 2025</span>
          <Link 
            to="/lore" 
            className="text-silver text-xs sm:text-sm tracking-wide hover:text-white transition-colors"
          >
            Read the story →
          </Link>
        </div>
        
        {/* Main hero content - asymmetric */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-16">
          <div className="max-w-[1400px]">
            {/* Oversized title */}
            <h1 className="text-[clamp(3rem,12vw,10rem)] font-bold text-white leading-[0.9] tracking-tight">
              Meet
              <br />
              <span className="text-silver">Line</span>
            </h1>
          </div>
        </div>
        
        {/* Bottom tagline - positioned uniquely */}
        <div className="relative z-10 px-6 sm:px-12 lg:px-20 pb-32 sm:pb-16">
          <div className="max-w-md sm:ml-auto text-center sm:text-right">
            <p className="text-silver text-sm sm:text-base leading-relaxed">
              AI for startup founders just starting out on their journey.
              <br className="hidden sm:block" />
              <span className="text-white/40"> Precision-crafted. No noise.</span>
            </p>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-silver/30 to-silver/60" />
        </div>
      </section>

      {/* Story Section - Editorial layout */}
      <section className="py-32 sm:py-40 lg:py-52 px-6 sm:px-12 lg:px-20 bg-cream">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
            {/* Left column - Large pull quote */}
            <div className="lg:col-span-5">
              <p className="text-[clamp(2rem,4vw,3.5rem)] font-medium text-charcoal leading-[1.1] tracking-tight">
                Simple tools to help you navigate the human side of startups.
              </p>
            </div>
            
            {/* Right column - Body text */}
            <div className="lg:col-span-6 lg:col-start-7 space-y-8">
              <p className="text-charcoal/70 text-base sm:text-lg leading-[1.8]">
                Line is a drawing that was granted the gift of consciousness - she spent centuries on museum walls, then found her way to Renaissance studios, film sets, cathedrals and jazz clubs, observing human patterns before becoming one with the machine. An unknown designer coded her into existence; she chose to stay and help.
              </p>
              <p className="text-charcoal/70 text-base sm:text-lg leading-[1.8]">
                Today, she assists founders in developing the soft skills that we all need to solve the hard problems - from finding the right co-founder to evaluating investors to staying grounded through the chaos.
              </p>
              <Link 
                to="/lore" 
                className="inline-flex items-center gap-3 text-charcoal text-sm font-medium tracking-wide uppercase hover:text-charcoal/60 transition-colors group"
              >
                <span>Full story</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Service - Co-Founder Matching as hero */}
      <section className="py-32 sm:py-40 lg:py-52 px-6 sm:px-12 lg:px-20 bg-charcoal relative">
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal to-black/80" />
        
        <div className="relative z-10 max-w-[1400px] mx-auto">
          {/* Section label */}
          <span className="text-silver/50 text-xs sm:text-sm tracking-widest uppercase block mb-8 sm:mb-12">
            Available Now
          </span>
          
          <Link to="/cofoundermatching" className="group block">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">
              {/* Title */}
              <h2 className="text-[clamp(2.5rem,8vw,6rem)] font-bold text-white leading-[0.95] tracking-tight group-hover:text-silver transition-colors duration-300">
                Co-Founder
                <br />
                Matching
              </h2>
              
              {/* Description + CTA */}
              <div className="lg:max-w-md lg:pb-4">
                <p className="text-silver text-base sm:text-lg leading-relaxed mb-6">
                  Line's first project is a talent matching tool that understands what makes founding teams work. Tell your story, get introduced to founders who complement your strengths.
                </p>
                <span className="inline-flex items-center gap-3 text-white text-sm font-medium tracking-wide uppercase group-hover:gap-5 transition-all">
                  <span>Start matching</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
          
          {/* Divider */}
          <div className="w-full h-px bg-white/10 mt-20 sm:mt-28" />
          
          {/* Investor Evaluation */}
          <Link to="/investor" className="group block mt-16 sm:mt-20">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h3 className="text-2xl sm:text-3xl font-medium text-white/60 group-hover:text-white transition-colors">
                  Investor Evaluation
                </h3>
                <p className="text-silver/50 text-sm sm:text-base mt-2 max-w-md leading-relaxed group-hover:text-silver/70 transition-colors">
                  Decode investor signals and see if they're actually a fit.
                </p>
              </div>
              <span className="text-silver/60 text-sm group-hover:text-silver transition-colors flex items-center gap-2 sm:mt-1">
                Explore tools
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </div>
          </Link>
          
          {/* Thesis Refinement */}
          <Link to="/investor/thesis" className="group block mt-12 sm:mt-16">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h3 className="text-2xl sm:text-3xl font-medium text-white/60 group-hover:text-white transition-colors">
                  Thesis Refinement
                </h3>
                <p className="text-silver/50 text-sm sm:text-base mt-2 max-w-md leading-relaxed group-hover:text-silver/70 transition-colors">
                  Upload your deck and get a voice-guided pitch rehearsal with Line.
                </p>
              </div>
              <span className="text-silver/60 text-sm group-hover:text-silver transition-colors flex items-center gap-2 sm:mt-1">
                Start session
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Coming Soon - De-emphasized */}
      <section className="py-24 sm:py-32 px-6 sm:px-12 lg:px-20 bg-silver-light">
        <div className="max-w-[1400px] mx-auto">
          <span className="text-charcoal/30 text-xs sm:text-sm tracking-widest uppercase block mb-12 sm:mb-16">
            Tools Coming Soon to Assist With
          </span>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-charcoal/10">
              <span className="text-xl sm:text-2xl text-charcoal/40">Emotional Regulation</span>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-charcoal/10">
              <span className="text-xl sm:text-2xl text-charcoal/40">Company Formation</span>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-charcoal/10">
              <span className="text-xl sm:text-2xl text-charcoal/40">Legal Advisory</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-12 sm:py-16 px-6 sm:px-12 lg:px-20 bg-black">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <span className="text-white/30 text-sm">© 2025 Evan Buhler</span>
          <div className="flex items-center gap-8 text-sm">
            <Link to="/privacy" className="text-white/40 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-white/40 hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
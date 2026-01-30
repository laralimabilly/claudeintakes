import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const InvestorEvaluation = () => {
  return (
    <div className="min-h-screen bg-charcoal relative overflow-hidden">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Back link */}
      <Link 
        to="/" 
        className="fixed top-6 left-6 sm:top-8 sm:left-12 lg:left-20 z-20 flex items-center gap-2 text-silver/60 hover:text-white transition-colors text-sm"
      >
        <span>←</span>
        <span>Home</span>
      </Link>
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-20 pt-28 sm:pt-36 pb-24 sm:pb-32">
        {/* Header - Line's observation */}
        <header className="mb-20 sm:mb-28 lg:mb-36">
          <span className="text-silver/40 text-xs tracking-widest uppercase block mb-8">Line's Observations</span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-[1.3] max-w-4xl">
            Investor communication is a pattern.
            <br />
            <span className="text-silver/70">Once you see it, you can't unsee it.</span>
          </h1>
        </header>

        {/* Organic Tool Layout */}
        <TooltipProvider>
          <div className="space-y-16 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8">
            
            {/* Tool 1: Email Thread Analysis - spans left side */}
            <div className="lg:col-span-7 lg:row-span-2">
              <div className="relative">
                {/* Sketchy border effect - smaller inset on mobile */}
                <svg className="absolute -inset-2 sm:-inset-3 w-[calc(100%+16px)] sm:w-[calc(100%+24px)] h-[calc(100%+16px)] sm:h-[calc(100%+24px)] pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="none">
                  <path 
                    d="M 10,10 Q 5,5 20,8 L 380,12 Q 395,10 392,25 L 388,275 Q 390,290 375,288 L 15,285 Q 5,287 8,270 L 12,20 Q 10,10 10,10" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="relative bg-cream/[0.03] backdrop-blur-sm p-6 sm:p-8 lg:p-12">
                  <h2 className="text-xl sm:text-2xl font-medium text-white mb-4 sm:mb-6">
                    Email Thread Analysis
                  </h2>
                  
                  {/* Line's annotation */}
                  <p className="font-handwritten text-xl sm:text-2xl lg:text-3xl text-cream/90 leading-relaxed mb-6 sm:mb-8">
                    "They said 'excited to learn more' three weeks ago. Radio silence since. I've seen this 10,000 times. Here's what it actually means."
                  </p>
                  
                  <p className="text-silver/60 text-sm mb-6 sm:mb-8">
                    Paste an investor email thread. Get the translation.
                  </p>
                  
                  <Link
                    to="/investor/email-decoder"
                    className="inline-flex items-center gap-3 px-5 sm:px-6 py-3 bg-ochre text-white font-medium text-sm hover:bg-ochre/90 transition-all group min-h-[44px]"
                    style={{ borderRadius: '2px' }}
                  >
                    <span>Translate Emails</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
              
              {/* Hand-drawn connecting element */}
              <svg className="hidden lg:block mx-auto mt-8 w-1 h-24 text-silver/15" viewBox="0 0 4 100">
                <path 
                  d="M 2,0 Q 3,25 1,50 T 2,100" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="6 8"
                />
              </svg>
            </div>

            {/* Tool 2: Fund Website Decoder - top right */}
            <div className="lg:col-span-5 lg:mt-12">
              {/* Circle decoration */}
              <svg className="absolute -translate-x-12 -translate-y-8 w-16 h-16 text-silver/10 hidden lg:block" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 4" />
              </svg>
              
              <div className="relative">
                {/* Different sketchy border - smaller on mobile */}
                <svg className="absolute -inset-2 sm:-inset-3 w-[calc(100%+16px)] sm:w-[calc(100%+24px)] h-[calc(100%+16px)] sm:h-[calc(100%+24px)] pointer-events-none" viewBox="0 0 400 280" preserveAspectRatio="none">
                  <path 
                    d="M 15,15 C 10,8 25,5 40,10 L 360,8 C 385,5 395,15 390,30 L 392,250 C 395,270 380,278 365,275 L 30,278 C 10,280 5,265 10,250 L 8,30 C 5,15 15,15 15,15" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.06)" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="relative bg-cream/[0.02] backdrop-blur-sm p-6 sm:p-8 lg:p-10">
                  <div className="flex items-start justify-between mb-4 sm:mb-5">
                    <h2 className="text-lg sm:text-xl font-medium text-white/60">
                      Fund Website Decoder
                    </h2>
                    <span className="text-xs text-silver/40 uppercase tracking-wider">Soon</span>
                  </div>
                  
                  {/* Line's annotation */}
                  <p className="font-handwritten text-lg sm:text-xl lg:text-2xl text-cream/50 leading-relaxed mb-5 sm:mb-6">
                    "Every VC says they're 'founder-friendly.' Their portfolio tells a different story."
                  </p>
                  
                  <p className="text-silver/40 text-sm mb-5 sm:mb-6">
                    Drop a fund URL. See what they actually invest in.
                  </p>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        disabled
                        className="inline-flex items-center gap-3 px-5 py-2.5 border border-silver/20 text-silver/40 font-medium text-sm cursor-not-allowed min-h-[44px]"
                        style={{ borderRadius: '2px' }}
                      >
                        <span>Decode a Fund</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-charcoal text-white border-charcoal">
                      <p>Coming Soon</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Tool 3: Thesis Alignment - bottom right */}
            <div className="lg:col-span-5 lg:col-start-8 lg:-mt-8">
              {/* Hand-drawn underline decoration */}
              <svg className="hidden lg:block mb-4 w-24 h-4 text-silver/15" viewBox="0 0 100 20">
                <path 
                  d="M 5,10 Q 25,15 50,8 T 95,12" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              
              <div className="relative">
                {/* Another sketchy border variant - smaller on mobile */}
                <svg className="absolute -inset-2 sm:-inset-3 w-[calc(100%+16px)] sm:w-[calc(100%+24px)] h-[calc(100%+16px)] sm:h-[calc(100%+24px)] pointer-events-none" viewBox="0 0 400 280" preserveAspectRatio="none">
                  <path
                    d="M 12,20 L 388,15 Q 392,15 390,25 L 385,260 Q 387,275 375,272 L 20,278 Q 8,280 10,265 L 15,25 Q 12,18 12,20" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="relative bg-cream/[0.03] backdrop-blur-sm p-6 sm:p-8 lg:p-10">
                  <h2 className="text-lg sm:text-xl font-medium text-white mb-4 sm:mb-5">
                    Thesis Alignment
                  </h2>
                  
                  {/* Line's annotation */}
                  <p className="font-handwritten text-lg sm:text-xl lg:text-2xl text-cream/90 leading-relaxed mb-5 sm:mb-6">
                    "Upload your deck. I'll push back, ask hard questions, and help you see what investors will see before they see it."
                  </p>
                  
                  <p className="text-silver/60 text-sm mb-5 sm:mb-6">
                    Voice conversation with Line about your pitch.
                  </p>
                  
                  <Link
                    to="/investor/thesis"
                    className="inline-flex items-center gap-3 px-5 sm:px-6 py-3 bg-ochre text-white font-medium text-sm hover:bg-ochre/90 transition-all group min-h-[44px]"
                    style={{ borderRadius: '2px' }}
                  >
                    <span>Talk to Line</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
            
          </div>
        </TooltipProvider>

        {/* Footer Note */}
        <footer className="mt-20 sm:mt-28 lg:mt-40 pt-10 sm:pt-12 border-t border-white/5">
          <p className="text-sm text-silver/40 mb-5 sm:mb-6">
            No login required. Your data stays private.
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-silver/40 hover:text-white transition-colors min-h-[44px]"
          >
            <span>←</span>
            <span>Back to all tools</span>
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default InvestorEvaluation;
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does this work?",
    answer: "Our AI has a natural conversation with you to understand your vision, skills, what you're looking for and how you work. We then match you with founders who complement your strengths, share your values and are at a similar stage. When we find a strong match, we reach out to both of you. If you're both interested, we make the introduction via WhatsApp.",
  },
  {
    question: "How long until I get matched?",
    answer: "Usually one to two weeks, though it depends on the current pool of founders. Our priority is quality over speed - we'd rather find you the right person than a fast mismatch.",
  },
  {
    question: "What if I don't like a match?",
    answer: "No problem! All introductions are double opt-in, meaning both parties have to say 'yes' before we connect you. After you meet, we'll ask for feedback to improve future matches. You're never obligated to move forward.",
  },
  {
    question: "What do you charge?",
    answer: "The matching service is free for now. Too many brilliant individuals struggle to find the right co-founder. We believe the best companies are built by great teams and we want to remove friction from that process.",
  },
  {
    question: "What happens when I find a co-founder?",
    answer: "Congratulations! Just let us know and we'll pause sending you new introductions. Your account stays active in case things change down the road.",
  },
  {
    question: "Is my information kept private?",
    answer: "Absolutely. We only share your information with potential matches after you've both expressed interest. See our Privacy Policy for full details.",
  },
  {
    question: "What if I'm not ready to commit full-time yet?",
    answer: "That's fine! Many founders start part-time or on nights and weekends. We match based on commitment level, so you'll meet others with similar availability.",
  },
];

export const FAQSection = () => {
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-cream relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Background sketch elements */}
      <svg className="absolute top-20 right-16 w-20 h-20 text-charcoal/[0.03] hidden lg:block" viewBox="0 0 100 100">
        <path d="M 20,20 Q 50,10 80,20 Q 90,50 80,80 Q 50,90 20,80 Q 10,50 20,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="absolute bottom-24 left-12 w-16 h-16 text-charcoal/[0.03] hidden lg:block" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 5" />
      </svg>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header with hand-drawn elements */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-charcoal/40 text-xs tracking-widest uppercase block mb-4">Common Questions</span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-medium text-charcoal mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <svg className="mx-auto w-36 h-4 text-charcoal/15" viewBox="0 0 160 20">
            <path d="M 5,10 Q 40,16 80,8 T 155,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        
        {/* FAQ items with organic styling */}
        <div className="relative">
          {/* Outer hand-drawn frame */}
          <svg className="absolute -inset-6 w-[calc(100%+48px)] h-[calc(100%+48px)] pointer-events-none hidden sm:block" viewBox="0 0 500 800" preserveAspectRatio="none">
            <path 
              d="M 15,20 Q 10,10 30,12 L 470,15 Q 490,10 488,30 L 485,770 Q 488,790 468,785 L 28,788 Q 10,792 15,770 L 18,35 Q 12,20 15,20" 
              fill="none" 
              stroke="rgba(43,43,43,0.04)" 
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          
          <Accordion type="single" collapsible defaultValue="item-0" className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="relative bg-white/70 backdrop-blur-sm px-5 sm:px-7 border-0 transition-all"
              >
                {/* Individual item hand-drawn border */}
                <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none" viewBox="0 0 400 80" preserveAspectRatio="none">
                  <path 
                    d="M 8,10 L 392,8 Q 398,8 396,15 L 394,65 Q 396,72 388,70 L 10,72 Q 4,74 6,65 L 8,15 Q 6,10 8,10" 
                    fill="none" 
                    stroke="rgba(43,43,43,0.06)" 
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
                
                <AccordionTrigger className="relative text-left text-base sm:text-lg font-medium text-charcoal hover:text-charcoal/70 py-5 sm:py-6 hover:no-underline min-h-[56px]">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="relative text-sm sm:text-base text-charcoal/60 leading-relaxed pb-5 sm:pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";

const Science = () => {
  return (
    <div className="min-h-screen bg-charcoal">
      {/* Back link */}
      <Link 
        to="/cofoundermatching" 
        className="fixed top-6 left-6 sm:top-8 sm:left-12 lg:left-20 z-20 flex items-center gap-2 text-silver/60 hover:text-white transition-colors text-sm"
      >
        <span>←</span>
        <span>Co-Founder Matching</span>
      </Link>
      
      <article className="max-w-[850px] mx-auto px-6 sm:px-12 lg:px-8 pt-24 sm:pt-32 pb-20">
        {/* Page Title */}
        <header className="mb-16 sm:mb-24">
          <span className="text-silver/50 text-xs tracking-widest uppercase block mb-6">Our Philosophy</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight">
            The Science of Co-Founder Matching
          </h1>
        </header>
        
        {/* Why Most Co-Founder Searches Fail */}
        <section className="mb-24 sm:mb-32">
          <div className="mb-10 sm:mb-12">
            <span className="text-silver/50 text-xs tracking-widest uppercase">Why Most Co-Founder Searches Fail</span>
          </div>
          
          <div className="space-y-8 sm:space-y-10">
            <p className="text-lg sm:text-xl text-white leading-[1.9]">
              Finding a co-founder through traditional networking is like finding the perfect box to sit in - you try dozens that look promising from the outside, but they are either too small, already occupied or get thrown out right when you have settled in.
            </p>
            
            <p className="text-lg sm:text-xl text-white leading-[1.9]">
              Most founders resort to posting on Twitter, attending random meetups or reaching out to former colleagues. The results are predictably poor: either no matches at all, or surface-level connections that fizzle out after a few coffee chats.
            </p>
            
            <p className="text-lg sm:text-xl text-white leading-[1.9]">
              But there is a deeper skepticism at play. Many founders hesitate to look for co-founders online, as if there is something artificial or desperate about it. Yet we have watched entire generations find their life partners on dating apps. The same logic applies to finding a business partner.
            </p>
            
            <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
              The problem is not meeting people online. The problem is that most co-founder searches lack structure, rigor and a framework for evaluating compatibility.
            </p>
          </div>
        </section>
        
        {/* Divider */}
        <div className="flex justify-center mb-24 sm:mb-32">
          <div className="w-24 h-px bg-silver/20" />
        </div>

        {/* Do You Even Need a Co-Founder? */}
        <section className="mb-24 sm:mb-32">
          <div className="mb-10 sm:mb-12">
            <span className="text-silver/50 text-xs tracking-widest uppercase">Do You Even Need a Co-Founder?</span>
          </div>
          
          <div className="space-y-8 sm:space-y-10">
            <p className="text-lg sm:text-xl text-white leading-[1.9]">
              Not every business needs a co-founder. Solo founders have built iconic companies - Oracle and Dell, for example, started with one person. If you have the skills, the capital and the resilience to go it alone, that is a legitimate path.
            </p>
            
            <p className="text-lg sm:text-xl text-white leading-[1.9]">
              But the data tells a different story for most venture-backed startups. Research from First Round Capital found that founding teams with two or more co-founders outperformed solo founders on nearly every metric. Y Combinator's data echoes this: the vast majority of their most successful companies had co-founding teams.
            </p>
            
            <p className="text-2xl sm:text-3xl text-silver italic leading-[1.5] pl-6 sm:pl-8 border-l border-silver/20">
              A co-founder is not just someone to share the workload - they are someone to share the psychological burden of uncertainty.
            </p>
            
            <p className="text-lg sm:text-xl text-white leading-[1.9]">
              Building a transformative company is brutally hard. Having a partner who is equally committed transforms the journey from a lonely slog into a shared mission.
            </p>
          </div>
        </section>
        
        {/* Divider */}
        <div className="flex justify-center mb-24 sm:mb-32">
          <div className="w-24 h-px bg-silver/20" />
        </div>

        {/* What the World's Best Accelerators Know */}
        <section className="mb-24 sm:mb-32">
          <div className="mb-10 sm:mb-12">
            <span className="text-silver/50 text-xs tracking-widest uppercase">What the World's Best Accelerators Know</span>
          </div>
          
          <p className="text-lg sm:text-xl text-white leading-[1.9] mb-16">
            The top startup accelerators have cracked the code on co-founder matching - not through magic, but through decades of pattern recognition and structured processes.
          </p>
          
          {/* Y Combinator */}
          <div className="mb-16 sm:mb-20">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
              Y Combinator
              <span className="block text-base sm:text-lg font-normal text-silver/60 mt-2">Complementary Skills Trump Everything</span>
            </h3>
            <div className="space-y-6 sm:space-y-8">
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                The best founding teams are not made of people who are similar - they are made of people who are complementary. YC's most successful companies all had founding teams where technical brilliance met business acumen, where visionary thinking met operational excellence.
              </p>
              <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
                When founders have overlapping skills, they fight over the same territory. When they have complementary skills, they naturally divide and conquer.
              </p>
            </div>
          </div>
          
          {/* Entrepreneur First */}
          <div className="mb-16 sm:mb-20">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
              Entrepreneur First
              <span className="block text-base sm:text-lg font-normal text-silver/60 mt-2">Structure Beats Serendipity</span>
            </h3>
            <div className="space-y-6 sm:space-y-8">
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                EF pioneered something radical: bringing together talented individuals before they have ideas, then using structured methodologies to help them find co-founders. Their insight? Waiting for serendipity is inefficient.
              </p>
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                You cannot evaluate a co-founder relationship in a coffee chat - you need to see how someone works under pressure, how they handle disagreement, how they make decisions when the stakes are real.
              </p>
            </div>
          </div>
          
          {/* Antler */}
          <div className="mb-16 sm:mb-20">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
              Antler
              <span className="block text-base sm:text-lg font-normal text-silver/60 mt-2">Founder-Market Fit &gt; Product-Market Fit</span>
            </h3>
            <div className="space-y-6 sm:space-y-8">
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                Who you are matters as much as what you build. Founders succeed when they are building in domains where they have deep insight, unfair advantages or personal conviction.
              </p>
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                The right co-founder for one idea might be the wrong co-founder for another. The match has to work on three levels: personal chemistry, skill complementarity and shared conviction about the problem being solved.
              </p>
            </div>
          </div>
          
          {/* OnDeck */}
          <div className="mb-16 sm:mb-20">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
              OnDeck
              <span className="block text-base sm:text-lg font-normal text-silver/60 mt-2">Shared Values Beat Shared Interests</span>
            </h3>
            <div className="space-y-6 sm:space-y-8">
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                Shared interests are overrated. Shared values are everything. Two founders who both love SaaS products might seem like a natural match, but if one values rapid iteration while the other values careful planning, they will clash constantly.
              </p>
              <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
                The best matches happen when founders answer the hard questions the same way - even if they come from completely different backgrounds.
              </p>
            </div>
          </div>
          
          {/* TechStars */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
              TechStars
              <span className="block text-base sm:text-lg font-normal text-silver/60 mt-2">Work Together Before You Commit</span>
            </h3>
            <div className="space-y-6 sm:space-y-8">
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                Work together on something real before you commit. A trial project reveals more than a hundred coffee chats.
              </p>
              <p className="text-lg sm:text-xl text-white leading-[1.9]">
                Do they communicate clearly? Do they follow through on commitments? Do they handle stress with grace or blame? These questions cannot be answered in interviews. They emerge through working together.
              </p>
            </div>
          </div>
        </section>
        
        {/* Divider */}
        <div className="flex justify-center mb-24 sm:mb-32">
          <div className="w-24 h-px bg-silver/20" />
        </div>

        {/* Why AI Solves This Problem */}
        <section className="mb-24 sm:mb-32">
          <div className="mb-10 sm:mb-12">
            <span className="text-silver/50 text-xs tracking-widest uppercase">Why AI Solves This Problem</span>
          </div>
          
          <div className="space-y-8 sm:space-y-10">
            <p className="text-lg sm:text-xl text-white leading-[1.9]">
              Traditional co-founder matching fails because it is either purely algorithmic (cold, database-driven, no context) or purely human (subjective, biased, does not scale). AI allows us to do something better.
            </p>
            
            <div className="space-y-10 sm:space-y-12 mt-12">
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-4">Pattern recognition at scale</h4>
                <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
                  Great accelerators like YC and Techstars have seen thousands of founding teams. They know what works - complementary skill sets (whether that's technical + business, design + engineering, or domain expert + operator), aligned commitment levels, compatible working styles and shared urgency. AI synthesizes these hard-won patterns instantly.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-4">Contextual matching, not keyword matching</h4>
                <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
                  A database looks for overlaps. AI understands nuance. It knows that "move fast and break things" and "measure twice, cut once" describe fundamentally incompatible working styles. It recognizes when someone saying "I'm a generalist" actually means "I haven't figured out my superpower yet" versus "I can do sales, ops and product equally well." It reads between the lines of vague answers and flags potential misalignments before you waste months.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-4">Transparency about the "why"</h4>
                <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
                  When we suggest a match, we explain why - using the same frameworks great accelerators use. You go into conversations informed, not blind. You'll know exactly what makes this pairing promising and where the friction points are before your first call.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-4">Effortless onboarding that actually understands you</h4>
                <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
                  Instead of forcing you to fill out 40-question forms that nobody reads, we have a 10-minute conversation with you. Our AI interviewer asks follow-up questions, probes your actual motivations and extracts the signal from your answers. You talk naturally; we turn that into a structured profile that captures what you actually need - not just what checkboxes you ticked.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-white mb-4">Learning from every match</h4>
                <p className="text-lg sm:text-xl text-silver/80 leading-[1.9]">
                  Every conversation, every successful partnership, every failed match teaches the system what works. Unlike a static survey, our matching gets smarter over time. When we learn that "seeking a business co-founder" paired with "weaknesses: fundraising" often leads to frustration (because they want a specific business skill, not just any business person), we adjust.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Divider */}
        <div className="flex justify-center mb-24 sm:mb-32">
          <div className="w-24 h-px bg-silver/20" />
        </div>

        {/* Divider */}
        <div className="flex justify-center mb-24 sm:mb-32">
          <div className="w-24 h-px bg-silver/20" />
        </div>
        
        {/* Resources Section */}
        <section className="mb-24 sm:mb-32">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-8 sm:mb-10">Further Reading</h3>
          <div className="space-y-4">
            <a 
              href="https://review.firstround.com/the-founder-dating-playbook-heres-the-process-i-used-to-find-my-co-founder"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-base sm:text-lg text-silver/70 hover:text-white transition-colors group"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="group-hover:underline">The Founder Dating Playbook (First Round Review)</span>
            </a>
            <a 
              href="https://paulgraham.com/startupmistakes.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-base sm:text-lg text-silver/70 hover:text-white transition-colors group"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="group-hover:underline">The 18 Mistakes That Kill Startups (Paul Graham)</span>
            </a>
            <a 
              href="https://carta.com/learn/startups/founding-team/co-founder/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-base sm:text-lg text-silver/70 hover:text-white transition-colors group"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="group-hover:underline">How to Find a Co-Founder for Your Startup (Carta)</span>
            </a>
            <a 
              href="https://hbr.org/2024/06/why-cofounder-partnerships-fail-and-how-to-make-them-last"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-base sm:text-lg text-silver/70 hover:text-white transition-colors group"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="group-hover:underline">Why Cofounder Partnerships Fail (Harvard Business Review)</span>
            </a>
            <a 
              href="https://hbr.org/2022/04/how-cofounders-can-prevent-their-relationship-from-derailing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-base sm:text-lg text-silver/70 hover:text-white transition-colors group"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="group-hover:underline">How Cofounders Can Prevent Their Relationship from Derailing (HBR)</span>
            </a>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to find your co-founder?
          </h2>
          <p className="text-silver/60 text-base sm:text-lg mb-10 sm:mb-12">
            AI-powered matching that understands what makes teams work.
          </p>
          <Link 
            to="/cofoundermatching" 
            className="inline-flex items-center gap-3 px-8 py-4 border border-white/30 text-white text-base font-medium hover:bg-white hover:text-charcoal transition-all duration-300 group"
          >
            <span>Start matching</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </section>
      </article>
    </div>
  );
};

export default Science;
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Back link */}
      <Link 
        to="/" 
        className="fixed top-6 left-6 z-20 flex items-center gap-2 text-muted-foreground hover:text-charcoal transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">FounderKit</span>
      </Link>

      <main className="py-20 px-4">
        <article className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-charcoal">Terms of Service</h1>
          
          <p className="text-muted-foreground text-lg">Last Updated: November 24, 2025</p>
          
          <p className="text-foreground text-lg leading-relaxed">
            Welcome to FounderKit. By using our service, you agree to these Terms of Service.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Our Service</h2>
            <p className="text-foreground text-lg leading-relaxed">
              FounderKit is an AI-powered platform that matches founders with potential co-founders. We facilitate introductions but do not guarantee outcomes or partnerships.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Eligibility</h2>
            <p className="text-foreground text-lg leading-relaxed">
              You must be at least 18 years old to use FounderKit. By using our service, you confirm you meet this requirement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 text-foreground text-lg leading-relaxed">
              <li>Provide accurate information during your AI interview</li>
              <li>Communicate respectfully with potential matches</li>
              <li>Do not use the service for spam, fraud or harassment</li>
              <li>Conduct your own due diligence before entering any partnership</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Double Opt-In Policy</h2>
            <p className="text-foreground text-lg leading-relaxed">
              All introductions require mutual interest from both parties. You are never obligated to move forward with a match.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">No Warranties</h2>
            <p className="text-foreground text-lg leading-relaxed">
              FounderKit is provided "as is" without warranties of any kind. We do not guarantee you will find a co-founder or that any match will result in a successful partnership.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Limitation of Liability</h2>
            <p className="text-foreground text-lg leading-relaxed">
              FounderKit is not responsible for the actions, decisions or outcomes resulting from matches made through our platform. You assume all risks associated with co-founder relationships.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Free Service</h2>
            <p className="text-foreground text-lg leading-relaxed">
              FounderKit is currently free to use. We reserve the right to introduce fees in the future with advance notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Termination</h2>
            <p className="text-foreground text-lg leading-relaxed">
              We may suspend or terminate your access to FounderKit at any time for violation of these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Changes to Terms</h2>
            <p className="text-foreground text-lg leading-relaxed">
              We may update these Terms at any time. Continued use of FounderKit constitutes acceptance of updated Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Contact Us</h2>
            <p className="text-foreground text-lg leading-relaxed">
              Questions? Email us at{" "}
              <a href="mailto:hello@founderkit.tools" className="text-teal hover:underline">
                hello@founderkit.tools
              </a>.
            </p>
          </section>
        </article>
      </main>

      <footer className="py-8 px-4 border-t border-border mt-16">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-teal transition-colors">
              Home
            </Link>
            <Link to="/privacy" className="hover:text-teal transition-colors">
              Privacy Policy
            </Link>
          </div>
          <span className="font-semibold text-charcoal">Evan Buhler © 2025</span>
        </div>
      </footer>
    </div>
  );
}
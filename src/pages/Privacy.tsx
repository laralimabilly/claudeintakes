import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-4xl sm:text-5xl font-bold text-charcoal">Privacy Policy</h1>
          
          <p className="text-muted-foreground text-lg">Last Updated: November 24, 2025</p>
          
          <p className="text-foreground text-lg leading-relaxed">
            FounderKit ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use and safeguard your information.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Information We Collect</h2>
            <ul className="list-disc list-inside space-y-2 text-foreground text-lg leading-relaxed">
              <li>Phone number (for matching and communication)</li>
              <li>Conversation data from AI interviews (skills, goals, preferences)</li>
              <li>Match feedback and outcomes</li>
              <li>Email address and WhatsApp contact (when provided)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-foreground text-lg leading-relaxed">
              <li>To match you with compatible co-founders</li>
              <li>To facilitate introductions via WhatsApp and email</li>
              <li>To improve our matching algorithm</li>
              <li>To communicate about potential matches</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Information Sharing</h2>
            <p className="text-foreground text-lg leading-relaxed">
              We only share your information with potential co-founder matches after both parties have expressed mutual interest (double opt-in). We never sell your data to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Data Security</h2>
            <p className="text-foreground text-lg leading-relaxed">
              We use industry-standard encryption and security measures to protect your information. Your data is stored securely and accessible only to authorized personnel.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Your Rights</h2>
            <p className="text-foreground text-lg leading-relaxed">
              You can request to view, update or delete your information at any time by contacting us at{" "}
              <a href="mailto:hello@founderkit.tools" className="text-teal hover:underline">
                hello@founderkit.tools
              </a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-charcoal">Contact Us</h2>
            <p className="text-foreground text-lg leading-relaxed">
              If you have questions about this Privacy Policy, contact us at{" "}
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
            <Link to="/terms" className="hover:text-teal transition-colors">
              Terms of Service
            </Link>
          </div>
          <span className="font-semibold text-charcoal">Evan Buhler © 2025</span>
        </div>
      </footer>
    </div>
  );
}
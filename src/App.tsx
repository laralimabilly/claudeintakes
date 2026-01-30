import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import CofounderMatching from "./pages/CofounderMatching";
import InvestorEvaluation from "./pages/InvestorEvaluation";
import EmailDecoder from "./pages/EmailDecoder";
import ThesisAlignment from "./pages/ThesisAlignment";
import Science from "./pages/Science";
import Lore from "./pages/Lore";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import FounderProfile from "./pages/FounderProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/cofoundermatching" element={<CofounderMatching />} />
          <Route path="/investor" element={<InvestorEvaluation />} />
          <Route path="/investor/email-decoder" element={<EmailDecoder />} />
          <Route path="/investor/thesis" element={<ThesisAlignment />} />
          <Route path="/science" element={<Science />} />
          <Route path="/lore" element={<Lore />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/founder/:id" element={<FounderProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/admin");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateInputs = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    // Only validate password if not in reset mode
    if (!isResetPassword) {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We sent you a password reset link. Check your inbox.",
      });
      setIsResetPassword(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isResetPassword) {
      await handleResetPassword();
      return;
    }
    
    if (!validateInputs()) return;
    
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`
          }
        });
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Account created",
            description: "Please check your email to confirm your account, or sign in if auto-confirm is enabled.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Invalid credentials",
              description: "The email or password you entered is incorrect.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (isResetPassword) return "Reset Password";
    if (isSignUp) return "Sign Up";
    return "Sign In";
  };

  const getSubtitle = () => {
    if (isResetPassword) return "Password Reset";
    if (isSignUp) return "Create Account";
    return "Admin";
  };

  return (
    <div className="min-h-screen flex flex-col bg-charcoal">
      {/* Back link */}
      <div className="p-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-silver/40 hover:text-silver transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-xs tracking-widest uppercase text-silver/40 mb-3">
              {getSubtitle()}
            </p>
            <h1 className="text-3xl font-light text-white tracking-tight">
              {getTitle()}
            </h1>
            {isResetPassword && (
              <p className="text-sm text-silver/50 mt-3">
                Enter your email and we'll send you a reset link
              </p>
            )}
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                disabled={isLoading}
                className={`h-12 bg-transparent border-white/10 text-white placeholder:text-silver/30 focus:border-white/30 transition-colors ${errors.email ? "border-red-500/50" : ""}`}
              />
              {errors.email && (
                <p className="text-xs text-red-400/80">{errors.email}</p>
              )}
            </div>

            {!isResetPassword && (
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  disabled={isLoading}
                  className={`h-12 bg-transparent border-white/10 text-white placeholder:text-silver/30 focus:border-white/30 transition-colors ${errors.password ? "border-red-500/50" : ""}`}
                />
                {errors.password && (
                  <p className="text-xs text-red-400/80">{errors.password}</p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-white text-charcoal hover:bg-white/90 font-medium transition-colors" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
                  Please wait
                </span>
              ) : (
                isResetPassword ? "Send Reset Link" : (isSignUp ? "Create Account" : "Sign In")
              )}
            </Button>
          </form>

          {/* Toggle & Forgot Password */}
          <div className="mt-8 text-center space-y-3">
            {!isResetPassword && !isSignUp && (
              <button
                type="button"
                onClick={() => setIsResetPassword(true)}
                className="block w-full text-xs text-silver/50 hover:text-silver transition-colors"
              >
                Forgot your password?
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setIsResetPassword(false);
              }}
              className="text-xs text-silver/50 hover:text-silver transition-colors"
            >
              {isSignUp 
                ? "Already have an account? Sign in" 
                : "Need an account? Sign up"}
            </button>

            {isResetPassword && (
              <button
                type="button"
                onClick={() => setIsResetPassword(false)}
                className="block w-full text-xs text-silver/50 hover:text-silver transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

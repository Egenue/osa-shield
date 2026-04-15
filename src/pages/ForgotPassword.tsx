import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { API_BASE_URL } from '@/lib/api';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSent, setIsSent] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address");

    setIsLoading(true);
    setProgress(10); // Start progress

    try {
      // Simulate progress movement while the request is in flight
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 300);

      const response = await fetch(`${API_BASE_URL}/send-reset-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok) {
        setIsSent(true);
        toast.success("Reset link sent to your email");
      } else {
        throw new Error(data.message || "Identification failed");
      }
    } catch (error: any) {
      setProgress(0);
      toast.error(error.message || "Failed to reach assembly servers");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 flex items-center justify-center min-h-screen grid-bg">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md"
      >
        <Card className="glass border-primary/30 bg-card/40 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <ShieldCheck className="h-8 w-8 text-primary text-glow" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display font-bold tracking-tight uppercase">
              Password <span className="text-primary">Recovery</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground italic">
              Enter your credentials to receive a email reset link.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {!isSent ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onSubmit={handleResetRequest} 
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="email"
                        placeholder="agent@osa.net"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass bg-secondary/20 border-border/40 pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full relative overflow-hidden group h-11 bg-primary hover:bg-primary/80 text-primary-foreground font-bold uppercase tracking-tighter transition-all"
                  >
                    {/* The Progress Bar Overlay */}
                    {isLoading && (
                      <motion.div 
                        className="absolute bottom-0 left-0 h-1 bg-white/50 z-10"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                      />
                    )}
                    
                    <span className="flex items-center gap-2 relative z-20">
                      {isLoading ? "Processing..." : "Send Reset Link"}
                      {!isLoading && <Send className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                    </span>
                  </Button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-4"
                >
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    A secure transmission has been sent to <span className="text-primary font-mono">{email}</span>. 
                    Follow the encrypted link to reset your access.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-primary/20 hover:bg-primary/10"
                    onClick={() => setIsSent(false)}
                  >
                    Resend Transmission
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border/20 pt-4">
            <Link to="/login" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Terminal Login
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
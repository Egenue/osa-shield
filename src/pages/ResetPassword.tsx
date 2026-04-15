import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { API_BASE_URL } from '@/lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token'); // Assuming the URL is ?token=xyz

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return toast.error("Credentials do not match. Re-verify password.");
    }

    if (password.length < 8) {
      return toast.error("Password entropy too low. Use at least 8 characters.");
    }

    setIsLoading(true);
    setProgress(20);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 400);

      const response = await fetch(`${API_BASE_URL}/resetPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          password 
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (response.ok) {
        setProgress(100);
        toast.success("Security credentials updated successfully.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        throw new Error(data.message || "Reset token expired or invalid.");
      }
    } catch (error: any) {
      setProgress(0);
      toast.error(error.message || "Failed to sync with security servers.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 flex items-center justify-center min-h-screen grid-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md"
      >
        <Card className="glass border-primary/30 bg-card/40 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <Lock className="h-8 w-8 text-primary text-glow" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display font-bold tracking-tight uppercase">
              Update <span className="text-primary">Credentials</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground italic text-xs">
              Establish a new encrypted access key for your account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  New Access Key
                </label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass bg-secondary/20 border-border/40 pr-10 h-11"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Confirm Access Key
                </label>
                <div className="relative">
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      "glass bg-secondary/20 border-border/40 h-11",
                      confirmPassword && password !== confirmPassword && "border-destructive/50"
                    )}
                    required
                  />
                  {confirmPassword && password === confirmPassword && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !token}
                className="w-full relative overflow-hidden h-11 bg-primary hover:bg-primary/80 text-primary-foreground font-bold uppercase tracking-tighter"
              >
                {/* Progress Bar Overlay */}
                {isLoading && (
                  <motion.div 
                    className="absolute bottom-0 left-0 h-1 bg-white/40 z-10"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                  />
                )}
                
                <span className="relative z-20">
                  {isLoading ? "Updating Security..." : "Confirm New Password"}
                </span>
              </Button>

              {!token && (
                <div className="flex items-center gap-2 p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[10px] uppercase font-bold">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Invalid or missing security token.
                </div>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex justify-center text-[10px] text-muted-foreground italic">
            Secure Session ID: {token ? token.substring(0, 8) : 'NULL'}...
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
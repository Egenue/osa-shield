import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LoaderCircle, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

type VerificationState = 'pending' | 'loading' | 'success' | 'error' | 'missing';

export default function Verification() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isPendingView = searchParams.get('pending') === '1';
  const email = searchParams.get('email');
  const { verifyEmail } = useAuthStore();

  const [status, setStatus] = useState<VerificationState>(isPendingView ? 'pending' : 'missing');
  const [message, setMessage] = useState(
    isPendingView
      ? `We've sent a confirmation link${email ? ` to ${email}` : ''}. Open your email and confirm to continue.`
      : 'Verification token is missing.',
  );

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      return () => {
        cancelled = true;
      };
    }

    setStatus('loading');
    setMessage('Checking your verification link...');

    verifyEmail(token)
      .then((responseMessage) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(responseMessage);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'Email verification failed.';
        setMessage(errorMessage);
      });

    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail]);

  const title = useMemo(() => {
    if (status === 'loading') return 'Verifying email';
    if (status === 'success') return 'Email confirmed';
    if (status === 'error') return 'Verification failed';
    if (status === 'pending') return 'Check your inbox';
    return 'Verification token missing';
  }, [status]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg glass rounded-2xl p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          {status === 'loading' && <LoaderCircle className="h-8 w-8 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-8 w-8" />}
          {status === 'pending' && <Mail className="h-8 w-8" />}
          {(status === 'error' || status === 'missing') && <AlertCircle className="h-8 w-8" />}
        </div>
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Email Verification</p>
          <h1 className="font-display text-2xl font-bold mt-2">{title}</h1>
          <p className="text-sm text-muted-foreground mt-3">{message}</p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary">
          <Shield className="h-3.5 w-3.5" />
          Secure channel authenticated
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button asChild variant="cyber" size="lg" className="flex-1">
            <Link to="/login">Back to login</Link>
          </Button>
          {(status === 'error' || status === 'missing') && (
            <Button asChild variant="cyber-outline" size="lg" className="flex-1">
              <Link to="/register">Create account again</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

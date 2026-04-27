import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Send, MapPin, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const scamTypes = ['Email', 'URL', 'SMS', 'Phone Call'];

export default function ReportPage() {
  const navigate = useNavigate();
  const { user, checkSession } = useAuthStore();
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!location && user?.location) {
      setLocation(user.location);
    }
  }, [location, user?.location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type || !content) {
      toast.error('Please fill in required fields.');
      return;
    }

    setSubmitting(true);

    try {
        await apiFetch('/scams/report', {
        method: 'POST',
        body: JSON.stringify({
          type,
          content,
          location,
          anonymous,
        }),
      });

      await checkSession();
      toast.success('Report submitted successfully.');
      setType('');
      setContent('');
      setLocation(user?.location ?? '');
      setAnonymous(false);
      navigate('/community');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit the report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold">Report a Scam</h1>
          <p className="text-sm text-muted-foreground mt-1">Help protect the community by reporting suspicious activity.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Scam Type *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {scamTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    type === t ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground border border-transparent hover:border-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="content">Content / Details *</Label>
            <Textarea
              id="content"
              placeholder="Paste the scam message, URL, or describe the incident..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="mt-1 bg-secondary/50 border-border/50 min-h-[120px]"
            />
          </div>

          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
            {user?.location && (
              <p className="text-xs text-muted-foreground mt-2">
                Current session location: {user.location}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAnonymous(!anonymous)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {anonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {anonymous ? 'Submitting anonymously' : 'Submit with your profile'}
          </button>

          <Button type="submit" variant="cyber" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : <><Send className="h-4 w-4" /> Submit Report</>}
          </Button>
        </form>
      </div>
    </div>
  );
}










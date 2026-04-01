import { useEffect, useState } from 'react';
import { Shield, Activity, FileText, User, MapPin } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch, type ProfileActivity } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<ProfileActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadActivity = async () => {
      try {
        const data = await apiFetch<{ activities: ProfileActivity[] }>('/profile/activity');
        if (!ignore) {
          setHistory(data.activities);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : 'Could not load activity history.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadActivity();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Profile card */}
      <div className="glass rounded-2xl p-8 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{user?.name || 'Agent'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {user.location}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Trust Score', value: user?.trustScore || 0, icon: Shield },
            { label: 'Scans', value: user?.totalScans || 0, icon: Activity },
            { label: 'Reports', value: user?.totalReports || 0, icon: FileText },
          ].map((s) => (
            <div key={s.label} className="text-center p-4 rounded-xl bg-secondary/50">
              <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold mb-4">Activity History</h2>
        <div className="space-y-3">
          {isLoading && (
            <div className="p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
              Loading recent activity...
            </div>
          )}

          {!isLoading && history.length === 0 && (
            <div className="p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
              Your scan and report history will appear here once you start using the platform.
            </div>
          )}

          {history.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                {item.type === 'scan' ? (
                  <Activity className="h-4 w-4 text-primary" />
                ) : (
                  <FileText className="h-4 w-4 text-warning" />
                )}
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </div>
                  {item.details && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.details}</div>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                item.status === 'High Risk' ? 'bg-destructive/10 text-destructive' :
                item.status === 'Verified' ? 'bg-success/10 text-success' :
                item.status === 'Low Risk' ? 'bg-primary/10 text-primary' :
                'bg-warning/10 text-warning'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

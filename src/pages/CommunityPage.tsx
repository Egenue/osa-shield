import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Search, CheckCircle, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch, type CommunityReport } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

const typeColors: Record<string, string> = {
  Email: 'bg-cyber-blue/10 text-cyber-blue',
  SMS: 'bg-primary/10 text-primary',
  URL: 'bg-warning/10 text-warning',
  'Phone Call': 'bg-cyber-purple/10 text-cyber-purple',
  Message: 'bg-primary/10 text-primary',
};

export default function CommunityPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVoteId, setActiveVoteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    let ignore = false;

    const loadReports = async () => {
      try {
        const data = await apiFetch<{ reports: CommunityReport[] }>('/scams');
        if (!ignore) {
          setReports(data.reports);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : 'Could not load scam reports.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      ignore = true;
    };
  }, []);

  const typeOptions = ['all', ...Array.from(new Set(reports.map((report) => report.type)))];

  const filtered = reports.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search && !r.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visibleReports = filtered.slice(0, visibleCount);

  const handleVote = async (reportId: string, vote: 'like' | 'dislike') => {
    if (!isAuthenticated) {
      toast.error('Login is required to vote on community reports.');
      navigate('/login');
      return;
    }

    setActiveVoteId(reportId);

    try {
      const data = await apiFetch<{
        scamId: string;
        upvotes: number;
        downvotes: number;
        currentUserVote: 'like' | 'dislike' | null;
      }>(`/scams/${reportId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote }),
      });

      setReports((current) =>
        current.map((report) =>
          report.id === data.scamId
            ? {
                ...report,
                upvotes: data.upvotes,
                downvotes: data.downvotes,
                currentUserVote: data.currentUserVote,
              }
            : report,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update vote.');
    } finally {
      setActiveVoteId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Community Feed</h1>
      <p className="text-muted-foreground mb-6">Real-time scam reports from the network.</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {typeOptions.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {isLoading && (
          <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
            Loading reported scams...
          </div>
        )}

        {!isLoading && visibleReports.length === 0 && (
          <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
            No scam reports matched the current filters.
          </div>
        )}

        {visibleReports.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[report.type]}`}>
                    {report.type}
                  </span>
                  {report.verified && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle className="h-3 w-3" /> Verified
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(report.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mb-2 line-clamp-2">{report.content}</p>
                {report.explanation && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{report.explanation}</p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {report.location}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button
                  className={`p-1.5 rounded transition-colors ${
                    report.currentUserVote === 'like'
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'
                  }`}
                  onClick={() => handleVote(report.id, 'like')}
                  disabled={activeVoteId === report.id}
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium">{report.upvotes}</span>
                <button
                  className={`p-1.5 rounded transition-colors ${
                    report.currentUserVote === 'dislike'
                      ? 'bg-destructive/10 text-destructive'
                      : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                  }`}
                  onClick={() => handleVote(report.id, 'dislike')}
                  disabled={activeVoteId === report.id}
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium">{report.downvotes}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!isLoading && visibleCount < filtered.length && (
        <div className="text-center mt-8">
          <Button variant="cyber-outline" onClick={() => setVisibleCount((count) => count + 8)}>
            Load More Reports
          </Button>
        </div>
      )}
    </div>
  );
}

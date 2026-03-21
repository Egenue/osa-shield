import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Search, Filter, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const mockReports = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  type: ['Email', 'SMS', 'URL', 'Phone Call'][i % 4],
  content: [
    'Your account has been compromised. Click here to verify...',
    'Congratulations! You won $10,000. Claim now at...',
    'URGENT: Your bank account will be suspended unless...',
    'Hi, this is the IRS. You owe back taxes and must pay immediately...',
  ][i % 4],
  location: ['New York, US', 'London, UK', 'Lagos, NG', 'Mumbai, IN'][i % 4],
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  verified: i % 3 === 0,
  upvotes: Math.floor(Math.random() * 50) + 5,
  downvotes: Math.floor(Math.random() * 5),
}));

const typeColors: Record<string, string> = {
  Email: 'bg-cyber-blue/10 text-cyber-blue',
  SMS: 'bg-primary/10 text-primary',
  URL: 'bg-warning/10 text-warning',
  'Phone Call': 'bg-cyber-purple/10 text-cyber-purple',
};

export default function CommunityPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = mockReports.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search && !r.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
          {['all', 'Email', 'SMS', 'URL', 'Phone Call'].map((t) => (
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
        {filtered.map((report, i) => (
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
                    {new Date(report.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mb-2 line-clamp-2">{report.content}</p>
                <p className="text-xs text-muted-foreground">{report.location}</p>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium">{report.upvotes}</span>
                <button className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button variant="cyber-outline">Load More Reports</Button>
      </div>
    </div>
  );
}

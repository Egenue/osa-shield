import { useState } from 'react';
import { Activity, Shield, FileText, Zap, AlertTriangle, CheckCircle, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';

const mockTriggers = [
  { label: 'Urgency language detected', severity: 'high' },
  { label: 'Suspicious URL pattern', severity: 'high' },
  { label: 'Known phishing domain', severity: 'critical' },
  { label: 'Impersonation attempt', severity: 'medium' },
];

const mockRecommendations = [
  'Do not click any links in this message.',
  'Report this sender to your email provider.',
  'Verify sender identity through official channels.',
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { activeAnalyzerTab, setActiveAnalyzerTab } = useUIStore();
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<null | { score: number }>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 2000));
    setResult({ score: Math.floor(Math.random() * 60) + 40 });
    setIsAnalyzing(false);
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-destructive';
    if (score >= 50) return 'text-warning';
    return 'text-success';
  };

  const severityColor = (s: string) => {
    if (s === 'critical') return 'text-destructive bg-destructive/10';
    if (s === 'high') return 'text-warning bg-warning/10';
    return 'text-primary bg-primary/10';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">
          Welcome back, <span className="text-primary">{user?.name || 'Agent'}</span>
        </h1>
        <p className="text-muted-foreground">Your threat defense command center.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Scans', value: user?.totalScans || 0, icon: Activity },
          { label: 'Reports Filed', value: user?.totalReports || 0, icon: FileText },
          { label: 'Trust Score', value: user?.trustScore || 0, icon: Shield },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
              <stat.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-2xl font-display font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Analyzer */}
      <div className="glass rounded-xl p-6 mb-8">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> Risk Analyzer
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['text', 'url'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveAnalyzerTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeAnalyzerTab === tab
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground bg-secondary/50'
              }`}
            >
              {tab === 'text' ? <MessageSquare className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
              {tab === 'text' ? 'Text / Message' : 'URL'}
            </button>
          ))}
        </div>

        {activeAnalyzerTab === 'text' ? (
          <Textarea
            placeholder="Paste suspicious message content here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mb-4 bg-secondary/50 border-border/50 min-h-[120px]"
          />
        ) : (
          <Input
            placeholder="https://suspicious-link.example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mb-4 bg-secondary/50 border-border/50"
          />
        )}

        <Button variant="cyber" onClick={handleAnalyze} disabled={isAnalyzing || !input.trim()}>
          {isAnalyzing ? (
            <>
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Activity className="h-4 w-4" /> Analyze Threat
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="font-display text-xl font-bold mb-6">Analysis Results</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Score */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative h-40 w-40">
                <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${result.score * 3.14} 314`}
                    className={scoreColor(result.score)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-display font-bold ${scoreColor(result.score)}`}>{result.score}</span>
                  <span className="text-xs text-muted-foreground">Risk Score</span>
                </div>
              </div>
            </div>

            {/* Triggers */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Detected Triggers
              </h3>
              <div className="space-y-2">
                {mockTriggers.map((t) => (
                  <div key={t.label} className={`text-sm px-3 py-2 rounded-lg ${severityColor(t.severity)}`}>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" /> Recommendations
              </h3>
              <ul className="space-y-2">
                {mockRecommendations.map((r) => (
                  <li key={r} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
              <Button variant="destructive" size="sm" className="mt-4">
                <AlertTriangle className="h-4 w-4" /> Report This
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

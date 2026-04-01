import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Shield,
  FileText,
  Zap,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  MessageSquare,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { apiFetch, type ScamAnalysisResponse } from '@/lib/api';

function scoreColor(score: number) {
  if (score >= 75) return 'text-destructive';
  if (score >= 40) return 'text-warning';
  return 'text-success';
}

function buildRecommendations(result: ScamAnalysisResponse, tab: 'text' | 'url') {
  if (result.is_scam) {
    return [
      tab === 'url'
        ? 'Do not open the link or enter any information on the site.'
        : 'Do not click any links or reply to the sender.',
      'Do not share passwords, verification codes, card details, or personal documents.',
      result.stored_in_community
        ? 'This sample has been saved to the community feed for other users to review.'
        : 'Report the content so other users can see it.',
    ];
  }

  return [
    'No strong scam signals were detected, but you should still verify the sender through trusted channels.',
    tab === 'url'
      ? 'Open the link only if you trust the source and the domain is correct.'
      : 'Treat unexpected requests for money, login details, or urgency with caution.',
    'If the situation still feels suspicious, file a manual report for the community to review.',
  ];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, checkSession } = useAuthStore();
  const { activeAnalyzerTab, setActiveAnalyzerTab } = useUIStore();
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScamAnalysisResponse | null>(null);
  const [lastAnalyzedTab, setLastAnalyzedTab] = useState<'text' | 'url'>('text');

  const handleAnalyze = async () => {
    if (!input.trim()) return;

    setIsAnalyzing(true);
    setResult(null);
    setLastAnalyzedTab(activeAnalyzerTab);
    try {
      const analysis = await apiFetch<ScamAnalysisResponse>('/scams/analyze', {
        method: 'POST',
        body: JSON.stringify({
          inputType: activeAnalyzerTab,
          content: input.trim(),
        }),
      });

      setResult(analysis);
      await checkSession();

      if (analysis.is_scam) {
        toast.warning(
          analysis.stored_in_community
            ? 'Scam detected and saved to the community feed.'
            : 'Scam detected.',
        );
      } else {
        toast.success('Analysis completed.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const score = result ? Math.round(Number(result.spam_probability ?? 0) * 100) : 0;
  const recommendations = result ? buildRecommendations(result, lastAnalyzedTab) : [];

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
                    strokeDasharray={`${score * 3.14} 314`}
                    className={scoreColor(score)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-display font-bold ${scoreColor(score)}`}>{score}</span>
                  <span className="text-xs text-muted-foreground">Risk Score</span>
                </div>
              </div>
              <div className="mt-4 text-center space-y-2">
                <div className={`text-sm font-semibold ${result.is_scam ? 'text-destructive' : 'text-success'}`}>
                  {result.is_scam ? 'Likely Scam' : 'Low-Risk Content'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Prediction: <span className="capitalize text-foreground">{result.prediction}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Threshold: {(Number(result.threshold ?? 0.3) * 100).toFixed(0)}%
                </p>
                {result.location && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {result.location}
                  </p>
                )}
              </div>
            </div>

            {/* Triggers */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Detected Triggers
              </h3>
              <div className="space-y-2">
                {result.triggers.length ? (
                  result.triggers.map((trigger) => (
                    <div key={`${trigger.key}-${trigger.label}`} className="text-sm px-3 py-3 rounded-lg bg-warning/10 text-foreground">
                      <div className="font-medium flex items-center gap-2">
                        <span>{trigger.icon}</span>
                        {trigger.label}
                      </div>
                      {trigger.description && (
                        <p className="text-xs text-muted-foreground mt-1">{trigger.description}</p>
                      )}
                      {trigger.matches.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Matches: {trigger.matches.join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm px-3 py-3 rounded-lg bg-success/10 text-success">
                    No scam triggers were detected in this sample.
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" /> Recommendations
              </h3>
              <div className="rounded-lg bg-secondary/40 p-3 mb-4">
                <div className="flex items-start gap-2 text-sm">
                  <ShieldAlert className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    {result.explanation || 'No explanation was returned by the model.'}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {recommendations.map((r) => (
                  <li key={r} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
              {result.stored_in_community ? (
                <Button variant="destructive" size="sm" className="mt-4" onClick={() => navigate('/community')}>
                  <AlertTriangle className="h-4 w-4" /> View Community Report
                </Button>
              ) : (
                <Button variant="cyber-outline" size="sm" className="mt-4" onClick={() => navigate('/report')}>
                  <FileText className="h-4 w-4" /> Report Manually
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { 
  PlusCircle, Activity, Search, MessageSquare, ThumbsUp, ThumbsDown, X, ArrowLeft, Send, User, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { subMinutes, subDays, formatDistanceToNow } from 'date-fns';

// --- MOCK DATA ---
const INITIAL_POSTS = [
  {
    id: 'p1',
    author: { name: 'Maintainer Alpha', trustScore: 92 },
    timestamp: subMinutes(new Date(), 45),
    title: 'High Risk Threat Trigger found in recent NPM package update',
    summary: 'The latest release of the common-utils library appears to contain a persistent access backdoor trigger.',
    tags: ['supply_chain', 'backdoor'],
    initialVotes: 145,
    initialComments: 28,
    threatVerdict: 'high',
    comments: [
      { id: 'c1', user: 'SecurityExpert', text: 'I confirmed this on my local build environment as well.', time: '10m ago' },
      { id: 'c2', user: 'Maintainer_Bravo', text: 'Blacklisting the IP range now.', time: '2m ago' }
    ]
  },
  {
    id: 'p2',
    author: { name: 'Agent X', trustScore: 71 },
    timestamp: subDays(new Date(), 1),
    title: 'New Phishing Campaign targeting crypto wallets',
    summary: 'Phishing pages detected using punycode URLs to mimic official assembly login portals.',
    tags: ['phishing', 'crypto'],
    initialVotes: 89,
    initialComments: 51,
    threatVerdict: 'medium',
    comments: []
  }
];

// --- SUB-COMPONENT: THREAD VIEW (COMMENT SECTION) ---
function ThreadView({ post, onBack, onAddComment }: { post: any, onBack: () => void, onAddComment: (postId: string, text: string) => void }) {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim()) return;
    onAddComment(post.id, replyText);
    setReplyText('');
    toast.success("Comment deployed to assembly.");
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-primary p-0">
        <ArrowLeft className="h-4 w-4" /> Back to Feed
      </Button>

      <Card className="glass border-primary/30 bg-card/40">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl font-display uppercase tracking-tight">{post.title}</CardTitle>
            <div className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-1 rounded font-bold">
              TRUST SCORE: {post.author.trustScore}
            </div>
          </div>
          <CardDescription className="text-foreground/80 mt-2">{post.summary}</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4 pl-4 border-l border-primary/20">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Assembly Discussion</h3>
        
        <AnimatePresence mode="popLayout">
          {post.comments.map((c: any) => (
            <motion.div 
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 mb-4"
            >
              <div className="h-10 w-10 rounded bg-secondary/30 border border-border/50 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>

              <Card className="glass bg-secondary/10 border-none flex-1">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-[10px] mb-2">
                    <span className="text-primary font-bold uppercase tracking-tighter">{c.user}</span>
                    <span className="text-muted-foreground italic">{c.time}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{c.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="flex gap-3 mt-8 sticky bottom-4">
           <div className="h-10 w-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
           </div>
           <div className="relative flex-1">
              <Input 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Write a reply..." 
                className="glass bg-secondary/20 border-border/40 pr-12 h-10" 
              />
              <Button 
                onClick={handleSend}
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1 h-8 w-8 text-primary hover:bg-primary/20"
              >
                <Send className="h-4 w-4" />
              </Button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- SUB-COMPONENT: POST CARD ---
function PostCard({ post, onOpenComments }: { post: any, onOpenComments: () => void }) {
  const [votes, setVotes] = useState(post.initialVotes);
  const [voteType, setVoteType] = useState<'up' | 'down' | null>(null);

  const handleVote = (type: 'up' | 'down') => {
    if (voteType === type) return;
    setVotes((prev: number) => type === 'up' ? prev + 1 : prev - 1);
    setVoteType(type);
  };

  return (
    <Card className="glass border-border/50 bg-card/60 transition-all hover:border-primary/30 overflow-hidden">
      <div className="flex">
        <div className="flex flex-col items-center gap-1 p-4 bg-secondary/20 border-r border-border/40 w-16">
          <button onClick={() => handleVote('up')} className={cn("hover:text-success transition-colors", voteType === 'up' && "text-success")}><ThumbsUp className="h-4 w-4" /></button>
          <span className="font-bold text-sm">{votes}</span>
          <button onClick={() => handleVote('down')} className={cn("hover:text-destructive transition-colors", voteType === 'down' && "text-destructive")}><ThumbsDown className="h-4 w-4" /></button>
        </div>

        <div className="flex-1">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
              <span className="text-primary font-bold">{post.author.name}</span>
              <span>•</span>
              <span>{formatDistanceToNow(post.timestamp)} ago</span>
            </div>
            <CardTitle className="text-lg font-display font-bold leading-tight">{post.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-foreground/70 line-clamp-2">{post.summary}</p>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={onOpenComments} className="h-8 gap-2 text-xs text-muted-foreground hover:text-primary px-0">
              <MessageSquare className="h-4 w-4" /> {post.comments.length} Comments
            </Button>
            <div className={cn(
              "text-[9px] font-bold px-2 py-0.5 rounded border uppercase",
              post.threatVerdict === 'high' ? "border-destructive/50 text-destructive bg-destructive/10" : "border-success/50 text-success bg-success/10"
            )}>
              {post.threatVerdict} Risk
            </div>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}

// --- MAIN ZONE PAGE ---
export default function Zone() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const selectedPost = posts.find(p => p.id === selectedPostId);

  const handleAddComment = (postId: string, text: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [
            ...post.comments,
            { id: Date.now().toString(), user: 'YOU', text, time: 'Just now' }
          ]
        };
      }
      return post;
    }));
  };

  const handleCreateThread = (title: string, summary: string, risk: string) => {
    const newThread = {
      id: `p-${Date.now()}`,
      author: { name: 'YOU', trustScore: 100 },
      timestamp: new Date(),
      title,
      summary,
      tags: ['new_report'],
      initialVotes: 1,
      initialComments: 0,
      threatVerdict: risk,
      comments: []
    };
    setPosts([newThread, ...posts]);
    setIsCreateModalOpen(false);
    toast.success("Thread broadcasted to assembly.");
  };

  return (
    <div className="container mx-auto px-4 py-8 grid-bg min-h-screen relative">
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg">
              <Card className="glass border-primary/50 shadow-[0_0_20px_rgba(0,255,255,0.1)] relative">
                <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => setIsCreateModalOpen(false)}><X className="h-4 w-4" /></Button>
                <CardHeader>
                  <CardTitle className="font-display text-xl text-primary text-glow">Initiate New Discussion</CardTitle>
                  <CardDescription className="text-xs italic">Broadcast intelligence to the OSA assembly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Topic Title</label>
                    <Input id="t-title" placeholder="e.g., Potential vulnerability in API" className="glass bg-secondary/10 border-primary/20 h-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Detailed Intelligence</label>
                    <textarea id="t-summary" className="w-full rounded-md border border-primary/20 bg-secondary/10 p-3 text-sm focus:ring-1 focus:ring-primary outline-none min-h-[100px]" placeholder="Describe the findings..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Risk Level</label>
                      <select id="t-risk" className="w-full bg-secondary/20 border border-primary/20 rounded-md p-2 text-sm text-foreground outline-none">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                  <Button variant="cyber" className="px-6 font-bold uppercase tracking-wider h-9" onClick={() => {
                    const title = (document.getElementById('t-title') as HTMLInputElement).value;
                    const summary = (document.getElementById('t-summary') as HTMLTextAreaElement).value;
                    const risk = (document.getElementById('t-risk') as HTMLSelectElement).value;
                    if(title && summary) handleCreateThread(title, summary, risk);
                  }}>Broadcast Thread</Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Threat <span className="text-primary text-glow">Zone</span></h1>
          <p className="text-muted-foreground mt-1 text-sm italic">Assembly consensus and community discussions.</p>
        </div>
        {!selectedPostId && (
          <Button variant="cyber" size="lg" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <PlusCircle className="h-5 w-5" /> Create Thread
          </Button>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {selectedPost ? (
            <ThreadView post={selectedPost} onBack={() => setSelectedPostId(null)} onAddComment={handleAddComment} />
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} onOpenComments={() => setSelectedPostId(post.id)} />
              ))}
            </div>
          )}
        </div>

        {!selectedPostId && (
          <div className="space-y-6">
            <Card className="glass border-primary/20 bg-secondary/10">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> OSA Objectives</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3 text-xs text-foreground/70">
                  <li className="flex gap-2"><span>•</span> Verify NPM supply chain backdoor</li>
                  <li className="flex gap-2"><span>•</span> Review Governance RFC #44</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
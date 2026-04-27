import { useState } from 'react';
import { Shield, Users, FileText, CheckCircle, XCircle, Flag, Search, Ban, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const mockPendingReports = [
  { id: '1', type: 'Email', content: 'Your PayPal account has been limited...', reporter: 'agent_42', date: '10 min ago' },
  { id: '2', type: 'URL', content: 'https://faceb00k-login.com/verify', reporter: 'sentinel_7', date: '25 min ago' },
  { id: '3', type: 'SMS', content: 'URGENT package is being held...', reporter: 'anonymous', date: '1 hour ago' },
];

const mockUsers = [
  { id: '1', name: 'Agent Smith', email: 'smith@osa.net', role: 'user', trustScore: 85, reports: 12 },
  { id: '2', name: 'Sentinel 7', email: 'sentinel7@osa.net', role: 'user', trustScore: 72, reports: 8 },
  { id: '3', name: 'Shadow', email: 'shadow@osa.net', role: 'user', trustScore: 34, reports: 2 },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('reports');

  const tabs = [
    { key: 'reports', label: 'Pending Reports', icon },
    { key: 'users', label: 'Users', icon },
    { key: 'rules', label: 'Rules', icon },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {mockPendingReports.map((r) => (
            <div key={r.id} className="glass rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{r.type}</span>
                  <span className="text-xs text-muted-foreground">by {r.reporter} • {r.date}</span>
                </div>
                <p className="text-sm text-foreground/90">{r.content}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" className="text-success hover:text-success" onClick={() => toast.success('Report approved')}>
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => toast.success('Report rejected')}>
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-warning hover:text-warning" onClick={() => toast.success('Report flagged')}>
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-10 bg-secondary/50 border-border/50" />
          </div>
          <div className="space-y-3">
            {mockUsers.map((u) => (
              <div key={u.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email} • Trust: {u.trustScore} • Reports: {u.reports}</div>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive">
                  <Ban className="h-4 w-4" /> Suspend
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      {activeTab === 'rules' && (
        <div className="glass rounded-xl p-6">
          <h3 className="font-display text-lg font-bold mb-4">Blocked Domains</h3>
          <div className="space-y-2 mb-4">
            {['faceb00k-login.com', 'paypa1-verify.net', 'amaz0n-security.org'].map((d) => (
              <div key={d} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <code className="text-sm text-destructive">{d}</code>
                <Button size="sm" variant="ghost" className="text-destructive"><XCircle className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add blocked domain..." className="bg-secondary/50 border-border/50" />
            <Button variant="cyber" size="sm">Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}
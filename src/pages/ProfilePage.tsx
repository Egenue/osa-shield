import { Shield, Activity, FileText, Edit, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const mockHistory = [
  { id: 1, type: 'scan', label: 'Analyzed phishing URL', date: '2 hours ago', result: 'High Risk' },
  { id: 2, type: 'report', label: 'Reported SMS scam', date: '1 day ago', result: 'Verified' },
  { id: 3, type: 'scan', label: 'Analyzed email content', date: '3 days ago', result: 'Low Risk' },
  { id: 4, type: 'report', label: 'Reported phone scam', date: '1 week ago', result: 'Pending' },
];

export default function ProfilePage() {
  const { user } = useAuthStore();

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
          </div>
          <Button variant="cyber-outline" size="sm" className="ml-auto">
            <Edit className="h-4 w-4" /> Edit
          </Button>
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
          {mockHistory.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                {item.type === 'scan' ? (
                  <Activity className="h-4 w-4 text-primary" />
                ) : (
                  <FileText className="h-4 w-4 text-warning" />
                )}
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.date}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                item.result === 'High Risk' ? 'bg-destructive/10 text-destructive' :
                item.result === 'Verified' ? 'bg-success/10 text-success' :
                item.result === 'Low Risk' ? 'bg-primary/10 text-primary' :
                'bg-warning/10 text-warning'
              }`}>
                {item.result}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

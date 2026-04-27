import { Link } from 'react-router-dom';
import { Shield, Activity, Map, Zap, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const features = [
  {
    icon,
    title: 'AI-Powered Analysis',
    description: 'Advanced heuristics scan URLs, emails, and messages for malicious patterns in real-time.',
  },
  {
    icon,
    title: 'Community Intelligence',
    description: 'Crowdsourced scam reports verified by the community create a living threat database.',
  },
  {
    icon,
    title: 'Global Threat Map',
    description: 'Visualize scam hotspots worldwide with interactive geospatial threat intelligence.',
  },
  {
    icon,
    title: 'Trust Scoring',
    description: 'Build reputation through accurate reports and help protect others in the network.',
  },
];

const stats = [
  { value: '2.4M+', label: 'Threats Analyzed' },
  { value: '180K+', label: 'Active Agents' },
  { value: '99.2%', label: 'Detection Rate' },
  { value: '<500ms', label: 'Response Time' },
];

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px]" />
        
        <div className="container relative z-10 text-center px-4 py-20">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 bg-primary/10 mb-10"
          >
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-sm font-medium text-primary">Platform Online • Real-time Threat Defense</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight mb-6"
          >
            <span className="text-glow text-foreground">Detect. Report.</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-cyber-blue to-cyber-purple bg-clip-text text-transparent">
              Neutralize Scams.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10"
          >
            Project OSA leverages community intelligence and advanced heuristics to analyze URLs, emails, and messages for malicious intent before they cause harm.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/dashboard">
              <Button variant="cyber" size="xl" className="min-w-[200px]">
                Launch Analyzer <Zap className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/threats">
              <Button variant="cyber-outline" size="xl" className="min-w-[200px]">
                View Global Threats <Map className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Your <span className="text-primary">Arsenal</span> Against Fraud
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed to protect you and your community from evolving digital threats.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once }}
                className="glass rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:box-glow transition-all">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-cyber-blue/5 to-cyber-purple/5" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Fight Back?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join the growing network of digital defenders. Every report makes the internet safer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register">
              <Button variant="cyber" size="lg">
                Join the Network <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Free forever • No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm font-bold">PROJECT<span className="text-primary">OSA</span></span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Project OSA. Protecting the digital frontier.</p>
        </div>
      </footer>
    </div>
  );
}










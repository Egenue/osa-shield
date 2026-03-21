import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, Map, Menu, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

const navItems = [
  { label: 'Analyzer', icon: Activity, path: '/dashboard' },
  { label: 'Community', icon: Users, path: '/community' },
  { label: 'Threat Map', icon: Map, path: '/threats' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isMobileMenuOpen, toggleMobileMenu } = useUIStore();
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            PROJECT<span className="text-primary">OSA</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm">{user?.name}</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  <LogIn className="h-4 w-4 mr-1" /> Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="cyber" size="sm">Join Network</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass border-t border-border/50 p-4 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={toggleMobileMenu}
              className="flex items-center gap-2 text-sm py-2 text-muted-foreground hover:text-primary"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border/50 space-y-2">
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => { logout(); toggleMobileMenu(); }}>
                Logout
              </Button>
            ) : (
              <>
                <Link to="/login" onClick={toggleMobileMenu}>
                  <Button variant="ghost" size="sm" className="w-full">Log In</Button>
                </Link>
                <Link to="/register" onClick={toggleMobileMenu}>
                  <Button variant="cyber" size="sm" className="w-full">Join Network</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

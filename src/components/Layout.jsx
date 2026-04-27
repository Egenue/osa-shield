import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}










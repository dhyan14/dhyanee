'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, BookOpen, Users, Monitor, LogOut,
  GraduationCap, Bell, ChevronRight
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/courses', icon: BookOpen, label: 'Courses' },
  { href: '/admin/students', icon: Users, label: 'Students' },
  { href: '/admin/monitoring', icon: Monitor, label: 'Live Monitor' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.replace('/login');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }} animate={{ x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed left-0 top-0 h-full w-64 z-40 flex flex-col"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--bg-border)' }}
      >
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--bg-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}>
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg gradient-text">Dhyanee</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={14} />}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--bg-border)' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--gradient-primary)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Administrator</p>
            </div>
            <button onClick={() => { clearAuth(); router.push('/login'); }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Logout">
              <LogOut size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 px-8 py-4 flex items-center justify-between"
          style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--bg-border)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>Admin</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text-primary)' }}>
              {navItems.find(n => pathname.startsWith(n.href))?.label || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
              title="Notifications">
              <Bell size={18} />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

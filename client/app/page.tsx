'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl animate-pulse-glow flex items-center justify-center"
          style={{ background: 'var(--gradient-primary)' }}>
          <span className="text-3xl">🎓</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading Dhyanee...</p>
      </div>
    </div>
  );
}

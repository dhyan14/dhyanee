import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Dhyanee – AI-Powered Learning Management System',
  description: 'Premium video-based learning with AI attention monitoring, strict lecture controls, and real-time analytics.',
  keywords: 'LMS, e-learning, AI monitoring, video lectures, online education, Dhyanee',
  openGraph: {
    title: 'Dhyanee LMS',
    description: 'AI-Powered Learning Management System',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#16161f',
              color: '#f1f0ff',
              border: '1px solid #2a2a3a',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}

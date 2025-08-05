// src/app/layout.jsx
// No "use client" directive here! This is a Server Component.

import './globals.css';
import { Inter } from 'next/font/google';
import AppHeader from '../components/AppHeader'; // Import the client component

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Ulmiversität Transit - Live Map & Route Planner',
  description: 'Find the best public transport connections in Ulm and Neu-Ulm.',
};

export default function RootLayout({ children }) {
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('theme');
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (theme === 'dark' || (theme === null && isSystemDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {
        console.error("Theme script failed", e);
      }
    })();
  `;

  return (
    <html lang="en" className={inter.className}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 font-inter text-white flex flex-col overflow-hidden relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Global Header - now correctly imported as a Client Component */}
        <AppHeader />

        {children}

        {/* Global Footer */}
        <footer className="relative z-20 bg-black/40 backdrop-blur-xl border-t border-white/10">
          <div className="px-4 py-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-white/90 font-medium">Ulmiversität Transit</span>
                </div>
                <div className="px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-400/30">
                  <span className="text-blue-300 font-medium text-xs">BETA</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-white/70">
                <a 
                  href="https://ulmiversitaet.de/impressum/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors duration-200 hover:underline"
                >
                  Impressum
                </a>
                <div className="flex items-center gap-1">
                  <span>Powered by</span>
                  <a 
                    href="https://api.swu.de/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
                  >
                    SWU API
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
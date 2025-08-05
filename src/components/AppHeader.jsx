// src/components/AppHeader.jsx
'use client'; // This directive must be at the very top of the file

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AppHeader = () => {
  const pathname = usePathname();
  const isRoutePlanner = pathname === '/route-planner';

  return (
    <header className="relative z-20">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-xl"></div>
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
                <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse sm:w-4 sm:h-4"></div>
            </div>
            
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Ulmiversität
              </h1>
              <p className="text-white/70 text-sm font-medium tracking-wide">
                {isRoutePlanner ? 'Route Planner' : 'Live Transit Map'}
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={`px-4 py-2 rounded-2xl font-medium text-sm transition-all duration-300 border backdrop-blur-sm shadow-lg ${
                !isRoutePlanner
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="hidden sm:inline">Live Map</span>
              </div>
            </Link>

            <Link
              href="/route-planner"
              className={`px-4 py-2 rounded-2xl font-medium text-sm transition-all duration-300 border backdrop-blur-sm shadow-lg ${
                isRoutePlanner
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="hidden sm:inline">Route Planner</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader; // Export as default
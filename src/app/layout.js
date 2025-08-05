// src/app/layout.jsx
import './globals.css'; // Your Tailwind and global CSS

export const metadata = {
  title: 'Public Transport Route Planner',
  description: 'Find the best public transport connections in Ulm and Neu-Ulm.',
};

export default function RootLayout({ children }) {
  // This script runs immediately after the HTML is parsed, before React hydrates.
  // It checks for user preference (localStorage) or system preference (media query)
  // and adds the 'dark' class to html if needed, preventing FOUC.
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('theme'); // Check for user's saved preference
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
    <html lang="en">
      {/* Inject the script directly into the <head> */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Other head elements like metadata, title will go here */}
      </head>
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
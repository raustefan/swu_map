// src/app/route-planner/layout.jsx
// No "use client" directive here! This is a Server Component.

export const metadata = {
  title: 'Route Planner - Ulmiversität Transit', // Specific title for this route
  description: 'Find optimal public transport routes using A* search.', // Specific description
};

export default function RoutePlannerLayout({ children }) {
  return (
    <>
      {children}
    </>
  );
}
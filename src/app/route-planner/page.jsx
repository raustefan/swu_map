// src/app/route-planner/page.jsx
'use client';

import React from 'react';
import DestinationFinder from '../../components/DestinationFinder';

// REMOVED METADATA EXPORT HERE, as client components cannot export metadata.
// If you need specific metadata for this route, create a src/app/route-planner/layout.jsx (server component).

export default function RoutePlannerPage() {
  return (
    <main className="flex-1 overflow-y-auto">
      <DestinationFinder />
    </main>
  );
}
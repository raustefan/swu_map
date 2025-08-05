// src/services/swuRoutingService.js

import { SWU_ROUTES_BASEDATA_URL } from '../config/apiEndpoints';

export async function fetchRawRouteBaseDataWithPatterns() {
  console.log(
    'RoutingService: Fetching Route BaseData (extended) with RoutePattern...',
  );
  const res = await fetch(SWU_ROUTES_BASEDATA_URL);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(
      `Route BaseData failed: ${res.status} ${res.statusText} ${txt}`,
    );
  }
  const data = await res.json();
  console.log(
    'RoutingService: Raw Route BaseData response:',
    data?.RouteAttributes?.RouteData
      ? `RouteData length=${data.RouteAttributes.RouteData.length}`
      : 'No RouteData found or empty response',
  );
  return data;
}
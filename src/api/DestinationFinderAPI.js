// src/api/DestinationFinderAPI.js

import {
  SWU_STOPS_API_URL,
  SWU_STOPPOINTS_API_URL, // New import for stoppoint coordinates
} from '../config/apiEndpoints';
import { fetchRawRouteBaseDataWithPatterns } from '../services/swuRoutingService';

// Caches for all stops and compiled route patterns
let allStopsCache = null;
let compiledRoutePatternsCache = null;

// New caches for stop and stoppoint lookup by ID/number
let stopsByIdCache = new Map();
let stopPointsByIdCache = new Map();

/**
 * Fetches and caches all stops and stoppoints for coordinate lookup
 * and general search/autocomplete purposes.
 * This is crucial for enriching route pattern data with geographic coordinates.
 */
export const fetchAllStopsAndStopPointsBaseData = async () => {
  if (allStopsCache && stopsByIdCache.size && stopPointsByIdCache.size) {
    // If all caches are populated, return existing data
    return {
      allStops: allStopsCache,
      stopsById: stopsByIdCache,
      stopPointsById: stopPointsByIdCache,
    };
  }

  console.log('DF-API: Fetching all stops and stoppoints (extended)...');

  // Fetch all stops
  const resStops = await fetch(SWU_STOPS_API_URL);
  if (!resStops.ok) {
    const txt = await resStops.text().catch(() => '');
    throw new Error(
      `Stops BaseData failed: ${resStops.status} ${resStops.statusText} ${txt}`,
    );
  }
  const stopsData = await resStops.json();
  const rawStops = stopsData?.StopAttributes?.StopData || [];

  const transformedStops = rawStops
    .map((s) => ({
      id: s.StopNumber, // Use StopNumber as the primary ID
      name: s.StopName,
      city:
        s.StopName?.includes('Ulm') || s.StopName?.includes('Neu-Ulm')
          ? 'Ulm'
          : '',
      coordinates: {
        lat: s?.StopCoordinates?.Latitude,
        lng: s?.StopCoordinates?.Longitude,
      },
    }))
    .filter(
      (s) =>
        typeof s.coordinates?.lat === 'number' &&
        typeof s.coordinates?.lng === 'number',
    );

  allStopsCache = transformedStops;
  stopsByIdCache = new Map(transformedStops.map((s) => [s.id, s]));
  console.log(`DF-API: Cached main stops: ${allStopsCache.length}`);

  // Fetch all stoppoints (for more granular coordinates if available)
  const resStopPoints = await fetch(SWU_STOPPOINTS_API_URL);
  if (!resStopPoints.ok) {
    const txt = await resStopPoints.text().catch(() => '');
    throw new Error(
      `StopPoints BaseData failed: ${resStopPoints.status} ${resStopPoints.statusText} ${txt}`,
    );
  }
  const stopPointsData = await resStopPoints.json();
  const rawStopPoints = stopPointsData?.StopPointAttributes?.StopPointData || [];

  stopPointsByIdCache = new Map();
  for (const sp of rawStopPoints) {
    const lat = sp?.StopPointCoordinates?.Latitude;
    const lng = sp?.StopPointCoordinates?.Longitude;
    if (typeof lat === 'number' && typeof lng === 'number') {
      stopPointsByIdCache.set(sp.StopPointNumber, {
        id: sp.StopPointNumber, // Using StopPointNumber as its ID
        stopNumber: sp.ParentStop?.StopNumber, // Link back to parent stop
        name: sp.StopPointName || sp.PlatformName,
        coordinates: { lat, lng },
      });
    }
  }
  console.log(`DF-API: Cached stoppoints: ${stopPointsByIdCache.size}`);

  return {
    allStops: allStopsCache,
    stopsById: stopsByIdCache,
    stopPointsById: stopPointsByIdCache,
  };
};

// Local search over cached stops (for autocomplete)
export const searchStops = async (query) => {
  const q = `${query}`.trim().toLowerCase();
  if (q.length < 3) return [];
  const { allStops } = await fetchAllStopsAndStopPointsBaseData(); // Use new fetch function
  return allStops.filter((s) => s.name?.toLowerCase().includes(q)).slice(0, 12);
};

// Optional: get details for a stop id
export const getStopDetails = async (stopId) => {
  const { stopsById } = await fetchAllStopsAndStopPointsBaseData(); // Use new fetch function
  return stopsById.get(stopId) || null;
};

// Build A* connections from Route BaseData RoutePattern (robust!)
export const getRouteConnections = async () => {
  if (compiledRoutePatternsCache) {
    console.log(
      'DF-API: Returning compiled patterns from cache:',
      compiledRoutePatternsCache.length,
    );
    return compiledRoutePatternsCache;
  }

  // Fetch stop and stoppoint coordinates
  const { stopsById, stopPointsById } =
    await fetchAllStopsAndStopPointsBaseData();

  const raw = await fetchRawRouteBaseDataWithPatterns();
  const routes = raw?.RouteAttributes?.RouteData || [];
  if (!Array.isArray(routes) || routes.length === 0) {
    console.warn('DF-API: RouteData empty in Route BaseData response.');
    compiledRoutePatternsCache = [];
    return compiledRoutePatternsCache;
  }

  const compiled = [];

  routes.forEach((route) => {
    const routeNumber = route?.RouteNumber;
    const routeName = route?.RouteName;
    const routeType = route?.RouteCategory === 1 ? 'TRAM' : 'BUS';

    const directions = route?.RouteDirections || [];
    // Handle RoutePattern as array or object.
    const patternsRaw = route?.RoutePattern;
    const patterns = Array.isArray(patternsRaw)
      ? patternsRaw
      : patternsRaw
      ? [patternsRaw]
      : [];

    if (patterns.length === 0) {
      console.warn(
        `DF-API: Route ${routeNumber} has no RoutePattern; skipping.`,
      );
      return;
    }

    patterns.forEach((pattern) => {
      const dirCode = pattern?.PatternDirection;
      const dirName =
        directions.find((d) => d?.Direction === dirCode)?.DirectionName ||
        `Direction ${dirCode ?? '?'}`;

      const spsRaw = pattern?.StopPoints;
      const routeStopPoints = Array.isArray(spsRaw)
        ? spsRaw
        : spsRaw
        ? [spsRaw]
        : [];
      if (routeStopPoints.length < 2) {
        return; // Need at least two points to form a segment
      }

      // Enrich StopPoints from RoutePattern with actual coordinates
      const transformedStops = routeStopPoints
        .map((sp) => {
          // Attempt to get coordinates from StopPoint first, then Stop
          const coordinates =
            stopPointsById.get(sp.StopPointNumber)?.coordinates ||
            stopsById.get(sp.StopNumber)?.coordinates;

          if (
            !coordinates ||
            typeof coordinates.lat !== 'number' ||
            typeof coordinates.lng !== 'number'
          ) {
            // This StopPoint or Stop does not have valid coordinates, skip it
            console.warn(
              `DF-API: StopPoint ${sp.StopPointNumber}/${sp.StopNumber} missing coordinates.`,
            );
            return null;
          }

          return {
            id: sp.StopNumber, // Use StopNumber as the consistent ID for graph nodes
            stopPointNumber: sp.StopPointNumber, // Keep for context if needed
            name: sp.StopName || sp.StopPointName,
            coordinates: coordinates,
          };
        })
        .filter(Boolean); // Filter out any nulls from stops with missing coordinates

      if (transformedStops.length < 2) {
        console.warn(
          `DF-API: Pattern ${routeNumber}-${dirCode} has less than 2 valid transformed stops; skipping.`,
        );
        return;
      }

      compiled.push({
        id: `${routeNumber}-${dirCode}`, // Unique ID for this specific route pattern
        number: routeNumber,
        name: routeName,
        type: routeType,
        directionName: dirName,
        stops: transformedStops,
      });
    });
  });

  console.log('DF-API: Compiled patterns for A*:', compiled.length);
  compiledRoutePatternsCache = compiled;
  return compiled;
};
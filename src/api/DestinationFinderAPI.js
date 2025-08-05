import {
  SWU_STOPS_API_URL,
  SWU_STOPPOINTS_API_URL,
  SWU_STOP_DEPARTURES_API_URL,
  SWU_STOP_ARRIVALS_API_URL,
} from '../config/apiEndpoints';
import { fetchRawRouteBaseDataWithPatterns } from '../services/swuRoutingService';

let allStopsCache = null;
let compiledRoutePatternsCache = null;

let stopsByIdCache = new Map();
let stopPointsByIdCache = new Map();

export const fetchAllStopsAndStopPointsBaseData = async () => {
  if (allStopsCache && stopsByIdCache.size && stopPointsByIdCache.size) {
    return {
      allStops: allStopsCache,
      stopsById: stopsByIdCache,
      stopPointsById: stopPointsByIdCache,
    };
  }

  console.log('DF-API: Fetching all stops and stoppoints (extended)...');

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
      id: s.StopNumber,
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
        id: sp.StopPointNumber,
        stopNumber: sp.ParentStop?.StopNumber,
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

export const searchStops = async (query) => {
  const q = `${query}`.trim().toLowerCase();
  if (q.length < 3) return [];
  const { allStops } = await fetchAllStopsAndStopPointsBaseData();
  return allStops.filter((s) => s.name?.toLowerCase().includes(q)).slice(0, 12);
};

export const getStopDetails = async (stopId) => {
  const { stopsById } = await fetchAllStopsAndStopPointsBaseData();
  return stopsById.get(stopId) || null;
};

export const fetchPassageDataForStop = async (stopNumber, limit = 30) => {
  if (stopNumber == null) {
    console.warn('fetchPassageDataForStop: stopNumber is null or undefined.');
    return [];
  }
  try {
    const departuresRes = await fetch(
      `${SWU_STOP_DEPARTURES_API_URL}?StopNumber=${stopNumber}&Limit=${limit}`,
    );
    const arrivalsRes = await fetch(
      `${SWU_STOP_ARRIVALS_API_URL}?StopNumber=${stopNumber}&Limit=${limit}`,
    );

    if (!departuresRes.ok && !arrivalsRes.ok) {
      const depTxt = await departuresRes.text().catch(() => '');
      const arrTxt = await arrivalsRes.text().catch(() => '');
      throw new Error(
        `Failed to fetch passages for stop ${stopNumber}. Departures: ${departuresRes.status} ${depTxt}, Arrivals: ${arrivalsRes.status} ${arrTxt}`,
      );
    }

    const departuresData = departuresRes.ok
      ? await departuresRes.json()
      : { PassageAttributes: { PassageData: [] } };
    const arrivalsData = arrivalsRes.ok
      ? await arrivalsRes.json()
      : { PassageAttributes: { PassageData: [] } };

    const allPassages = [
      ...(departuresData?.PassageAttributes?.PassageData || []),
      ...(arrivalsData?.PassageAttributes?.PassageData || []),
    ];

    const uniquePassages = new Map();
    allPassages.forEach((p) => {
      const key = `${p.RouteNumber}-${p.VehicleNumber}-${
        p.DepartureTimeActual ||
        p.DepartureTimeScheduled ||
        p.ArrivalTimeScheduled
      }`;
      if (!uniquePassages.has(key)) uniquePassages.set(key, p);
    });

    const sortedPassages = Array.from(uniquePassages.values()).sort((a, b) => {
      const t = (x) =>
        new Date(
          x.DepartureTimeActual ||
            x.DepartureTimeScheduled ||
            x.ArrivalTimeScheduled,
        ).getTime();
      return t(a) - t(b);
    });

    return sortedPassages;
  } catch (error) {
    console.error(`Error fetching passage data for stop ${stopNumber}:`, error);
    return [];
  }
};

export const getRouteConnections = async () => {
  if (compiledRoutePatternsCache) {
    console.log(
      'DF-API: Returning compiled patterns from cache:',
      compiledRoutePatternsCache.length,
    );
    return compiledRoutePatternsCache;
  }

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
        return;
      }

      const transformedStops = routeStopPoints
        .map((sp) => {
          const coordinates =
            stopPointsById.get(sp.StopPointNumber)?.coordinates ||
            stopsById.get(sp.StopNumber)?.coordinates;

          if (
            !coordinates ||
            typeof coordinates.lat !== 'number' ||
            typeof coordinates.lng !== 'number'
          ) {
            console.warn(
              `DF-API: StopPoint ${sp.StopPointNumber}/${sp.StopNumber} missing coordinates.`,
            );
            return null;
          }

          return {
            id: sp.StopNumber,
            stopPointNumber: sp.StopPointNumber,
            name: sp.StopName || sp.StopPointName,
            coordinates: coordinates,
          };
        })
        .filter(Boolean);

      if (transformedStops.length < 2) {
        console.warn(
          `DF-API: Pattern ${routeNumber}-${dirCode} has less than 2 valid transformed stops; skipping.`,
        );
        return;
      }

      compiled.push({
        id: `${routeNumber}-${dirCode}`,
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
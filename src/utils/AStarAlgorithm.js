// src/utils/AStarAlgorithm.js

import { fetchPassageDataForStop } from "../api/DestinationFinderAPI";

const calculateDistance = (a, b) => {
  if (
    typeof a?.lat !== "number" ||
    typeof a?.lng !== "number" ||
    typeof b?.lat !== "number" ||
    typeof b?.lng !== "number"
  ) {
    return Infinity;
  }
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
};

const createGraph = (routes) => {
  console.log("A* createGraph: routes count =", routes.length);
  const graph = new Map();
  const stopsMap = new Map();

  routes.forEach((route) => {
    if (!Array.isArray(route?.stops)) return;
    route.stops.forEach((s) => {
      if (
        s?.id == null ||
        typeof s?.coordinates?.lat !== "number" ||
        typeof s?.coordinates?.lng !== "number"
      ) {
        return;
      }
      if (!stopsMap.has(s.id)) {
        stopsMap.set(s.id, s);
      }
    });
  });

  routes.forEach((route) => {
    if (!Array.isArray(route?.stops)) return;
    for (let i = 0; i < route.stops.length - 1; i++) {
      const a = route.stops[i];
      const b = route.stops[i + 1];

      if (
        a?.id == null ||
        b?.id == null ||
        !stopsMap.has(a.id) ||
        !stopsMap.has(b.id)
      ) {
        continue;
      }

      const dist = calculateDistance(a.coordinates, b.coordinates);
      if (dist === Infinity) {
        console.warn(
          `createGraph: Skipping edge between ${a.id} and ${b.id} due to invalid coordinates.`,
        );
        continue;
      }

      const estimatedTravelTime = Math.max(2, Math.round(dist * 3));

      if (!graph.has(a.id)) graph.set(a.id, []);
      graph.get(a.id).push({
        stopId: b.id,
        route,
        distance: dist,
        estimatedTravelTime,
      });

      if (!graph.has(b.id)) graph.set(b.id, []);
      graph.get(b.id).push({
        stopId: a.id,
        route,
        distance: dist,
        estimatedTravelTime,
      });
    }
  });

  console.log(
    "A* createGraph: graph nodes =",
    graph.size,
    "unique stops =",
    stopsMap.size,
  );
  return { graph, stops: stopsMap };
};

class PriorityQueue {
  constructor() {
    this.elements = [];
  }
  enqueue(id, priority) {
    this.elements.push({ id, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }
  dequeue() {
    return this.elements.shift()?.id;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
  updatePriority(id, newPriority) {
    for (let i = 0; i < this.elements.length; i++) {
      if (this.elements[i].id === id) {
        this.elements[i].priority = newPriority;
        this.elements.sort((a, b) => a.priority - b.priority);
        return;
      }
    }
    this.enqueue(id, newPriority);
  }
}

const directionMatches = (depDir, routeDir) => {
  if (!depDir || !routeDir) return true;
  const a = `${depDir}`.toLowerCase();
  const b = `${routeDir}`.toLowerCase();
  return a.includes(b) || b.includes(a);
};

const aStar = async (graph, stops, startId, endId, startTime) => {
  const startStop = stops.get(startId);
  const endStop = stops.get(endId);

  if (!startStop || !endStop) {
    console.error(
      "A* init error: start or end stop not found in graph stops map.",
      { startStop, endStop, startId, endId },
    );
    return null;
  }

  const gScore = new Map();
  const cameFrom = new Map();
  const fScore = new Map();
  const openQueue = new PriorityQueue();

  const validatedStartMs =
    startTime instanceof Date && !isNaN(startTime.getTime())
      ? startTime.getTime()
      : Date.now();

  gScore.set(startId, validatedStartMs);
  fScore.set(
    startId,
    validatedStartMs +
      calculateDistance(startStop.coordinates, endStop.coordinates) *
        60 *
        1000,
  );
  openQueue.enqueue(startId, fScore.get(startId));

  const passageCache = new Map();
  const getPassages = async (stopId) => {
    if (!passageCache.has(stopId)) {
      const passages = await fetchPassageDataForStop(stopId, 40);
      passageCache.set(stopId, passages);
    }
    return passageCache.get(stopId);
  };

  while (!openQueue.isEmpty()) {
    const currentId = openQueue.dequeue();
    const currentTimeAtCurrentStop = gScore.get(currentId);

    if (currentId === endId) {
      const path = [];
      let node = currentId;
      while (cameFrom.has(node)) {
        const connection = cameFrom.get(node);
        path.unshift({
          stop: stops.get(node),
          connection: connection,
        });
        node = connection.fromStopId;
      }
      path.unshift({ stop: stops.get(startId), connection: undefined });
      return path;
    }

    const neighbors = graph.get(currentId) || [];

    for (const neighborConnection of neighbors) {
      const neighborId = neighborConnection.stopId;
      const route = neighborConnection.route;

      const departures = await getPassages(currentId);

      const nextDeparture = departures.find((p) => {
        const depMs = new Date(
          p.DepartureTimeActual || p.DepartureTimeScheduled,
        ).getTime();
        return (
          p.RouteNumber === route.number &&
          directionMatches(p.DepartureDirectionText, route.directionName) &&
          depMs >= currentTimeAtCurrentStop - 90 * 1000
        );
      });

      let useDepartureMs = null;
      let arrivalTimeAtNeighbor = null;
      let tripId = null;

      if (nextDeparture) {
        useDepartureMs = new Date(
          nextDeparture.DepartureTimeActual ||
            nextDeparture.DepartureTimeScheduled,
        ).getTime();
        const estimatedSegmentTravelMs =
          neighborConnection.estimatedTravelTime * 60 * 1000;
        arrivalTimeAtNeighbor = useDepartureMs + estimatedSegmentTravelMs;
        tripId = `${nextDeparture.RouteNumber}-${nextDeparture.VehicleNumber}-${
          nextDeparture.DepartureTimeScheduled ||
          nextDeparture.ArrivalTimeScheduled
        }`;
      } else {
        const waitTimeMs = 3 * 60 * 1000;
        useDepartureMs = currentTimeAtCurrentStop + waitTimeMs;
        const estimatedSegmentTravelMs =
          neighborConnection.estimatedTravelTime * 60 * 1000;
        arrivalTimeAtNeighbor = useDepartureMs + estimatedSegmentTravelMs;
        // This fallback ID was the source of the problem. It's now handled correctly during segment processing.
        tripId = `${route.number}-fallback-${validatedStartMs}`;
      }

      const prevBest = gScore.get(neighborId);
      if (prevBest === undefined || arrivalTimeAtNeighbor < prevBest) {
        gScore.set(neighborId, arrivalTimeAtNeighbor);
        cameFrom.set(neighborId, {
          ...neighborConnection,
          fromStopId: currentId,
          departureTime: useDepartureMs,
          arrivalTime: arrivalTimeAtNeighbor,
          tripId,
        });

        const neighborStop = stops.get(neighborId);
        if (!neighborStop) continue;

        const heuristicMs =
          calculateDistance(neighborStop.coordinates, endStop.coordinates) *
          60 *
          1000;

        fScore.set(neighborId, arrivalTimeAtNeighbor + heuristicMs);
        openQueue.updatePriority(neighborId, fScore.get(neighborId));
      }
    }
  }

  console.warn("A*: No path found from start to end within given constraints.");
  return null;
};

export const findOptimalRoute = async (
  startStop,
  endStop,
  routes,
  startTime,
) => {
  let effectiveStart = startTime instanceof Date ? startTime : null;
  if (!effectiveStart || isNaN(effectiveStart.getTime())) {
    effectiveStart = new Date();
  }

  console.log(
    "A* findOptimalRoute: start=",
    startStop?.id,
    "end=",
    endStop?.id,
    "at time=",
    effectiveStart.toISOString(),
  );

  const { graph, stops } = createGraph(routes);

  if (!stops.has(startStop?.id) || !stops.has(endStop?.id)) {
    console.error(
      "A* findOptimalRoute: Start or end stop ID not found in the generated graph.",
    );
    return [];
  }

  const path = await aStar(
    graph,
    stops,
    startStop.id,
    endStop.id,
    effectiveStart,
  );
  if (!path) {
    console.warn("A* findOptimalRoute: no path found by A* algorithm.");
    return [];
  }

  const result = {
    id: `route-${Date.now()}`,
    totalTravelTime: 0,
    totalDuration: 0,
    totalDistance: 0,
    transfers: -1,
    segments: [],
  };

  let currentRouteId = null;
  let currentTripId = null;
  let segment = null;
  let lastArrivalTime = effectiveStart.getTime();

  for (let i = 1; i < path.length; i++) {
    const { stop: currentSegmentEndStop, connection: conn } = path[i];

    if (!conn || !conn.route) continue;

    const segmentTravelTimeMs = conn.arrivalTime - conn.departureTime;
    const waitingTimeMs = Math.max(0, conn.departureTime - lastArrivalTime);

    // --- THIS IS THE FIX ---
    // A transfer only happens if the route changes, OR if it's a real-time trip
    // (not a fallback) and the specific vehicle ID changes.
    // This prevents creating new segments for every stop in a fallback scenario.
    const isRealtimeTrip = conn.tripId && !conn.tripId.includes("-fallback-");
    const isTransfer =
      currentRouteId !== conn.route.id ||
      (isRealtimeTrip && currentTripId !== conn.tripId);
    // --- END OF FIX ---

    if (isTransfer) {
      if (segment) result.segments.push(segment);
      result.transfers++;

      currentRouteId = conn.route.id;
      currentTripId = conn.tripId;

      segment = {
        route: conn.route,
        startStop: stops.get(conn.fromStopId),
        endStop: currentSegmentEndStop,
        stops: [stops.get(conn.fromStopId), currentSegmentEndStop],
        departureTime: new Date(conn.departureTime),
        arrivalTime: new Date(conn.arrivalTime),
        travelTimeMs: segmentTravelTimeMs,
        waitingTimeMs: waitingTimeMs,
        distance: conn.distance,
      };
    } else {
      // Extend the current segment
      segment.endStop = currentSegmentEndStop;
      segment.stops.push(currentSegmentEndStop);
      segment.arrivalTime = new Date(conn.arrivalTime);
      segment.travelTimeMs += segmentTravelTimeMs;
      segment.distance += conn.distance;
    }

    result.totalTravelTime += segmentTravelTimeMs;
    result.totalDuration += waitingTimeMs + segmentTravelTimeMs;
    result.totalDistance += conn.distance;
    lastArrivalTime = conn.arrivalTime;
  }

  if (segment) result.segments.push(segment);
  result.transfers = Math.max(0, result.transfers);

  console.log("A* result:", result);
  return [result];
};
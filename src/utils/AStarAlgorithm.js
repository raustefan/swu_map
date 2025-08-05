// src/utils/AStarAlgorithm.js

/**
 * Calculates the distance between two geographical coordinates using the Haversine formula.
 * @param {object} a - { lat, lng } for point A
 * @param {object} b - { lat, lng } for point B
 * @returns {number} Distance in kilometers, or Infinity if coordinates are invalid.
 */
const calculateDistance = (a, b) => {
  if (
    typeof a?.lat !== 'number' ||
    typeof a?.lng !== 'number' ||
    typeof b?.lat !== 'number' ||
    typeof b?.lng !== 'number'
  ) {
    // console.warn('calculateDistance: Invalid coordinates provided.', a, b);
    return Infinity;
  }
  const R = 6371; // Radius of Earth in kilometers
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

/**
 * Creates a graph representation from compiled route patterns.
 * Each node in the graph is a stop, and edges represent connections
 * between consecutive stops on a route. Includes bidirectional edges.
 * @param {Array<Object>} routes - An array of compiled route patterns.
 * @returns {{graph: Map, stops: Map}} An object containing the adjacency graph and a map of unique stops.
 */
const createGraph = (routes) => {
  console.log('A* createGraph: routes count =', routes.length);
  const graph = new Map(); // Adjacency list: Map<stopId, Array<{stopId, route, distance, travelTime, transferCost}>>
  const stopsMap = new Map(); // Map<stopId, stopObject> for quick lookup of stop details

  // First, populate the stopsMap with all unique stops from all routes
  routes.forEach((route) => {
    if (!Array.isArray(route?.stops)) return;
    route.stops.forEach((s) => {
      // Ensure stop has valid ID and coordinates before adding to map
      if (
        s?.id == null ||
        typeof s?.coordinates?.lat !== 'number' ||
        typeof s?.coordinates?.lng !== 'number'
      ) {
        // console.warn('createGraph: Skipping invalid stop:', s);
        return;
      }
      if (!stopsMap.has(s.id)) {
        stopsMap.set(s.id, s);
      }
    });
  });

  // Then, build the graph connections (edges)
  routes.forEach((route) => {
    if (!Array.isArray(route?.stops)) return;
    for (let i = 0; i < route.stops.length - 1; i++) {
      const a = route.stops[i];
      const b = route.stops[i + 1];

      // Ensure both stops have valid data and exist in our stopsMap
      if (
        a?.id == null ||
        b?.id == null ||
        !stopsMap.has(a.id) ||
        !stopsMap.has(b.id)
      ) {
        // console.warn(`createGraph: Skipping connection due to invalid stop IDs or missing in map: ${a?.id} -> ${b?.id}`);
        continue;
      }

      const dist = calculateDistance(a.coordinates, b.coordinates);
      // Skip if distance is infinite (invalid coordinates)
      if (dist === Infinity) {
        console.warn(
          `createGraph: Skipping edge between ${a.id} and ${b.id} due to invalid coordinates.`,
        );
        continue;
      }

      // Add forward edge (a -> b)
      if (!graph.has(a.id)) graph.set(a.id, []);
      graph.get(a.id).push({
        stopId: b.id, // Destination stop ID
        route, // The route object this connection belongs to
        distance: dist, // Geographic distance
        travelTime: 2, // Simplified: 2 minutes per segment (you can refine this later)
        transferCost: 0, // Cost for staying on the same route
      });

      // Add reverse edge (b -> a) for bidirectional travel on the same route
      // This assumes routes can be traversed in both directions, which is typical for public transport lines.
      if (!graph.has(b.id)) graph.set(b.id, []);
      graph.get(b.id).push({
        stopId: a.id, // Destination stop ID
        route, // The route object this connection belongs to
        distance: dist,
        travelTime: 2,
        transferCost: 0,
      });
    }
  });

  console.log(
    'A* createGraph: graph nodes =',
    graph.size,
    'unique stops =',
    stopsMap.size,
  );

  return { graph, stops: stopsMap };
};

/**
 * Implements the A* search algorithm to find the shortest path between two stops.
 * @param {Map} graph - The adjacency graph of stops.
 * @param {Map} stops - A map of stop IDs to stop objects.
 * @param {string|number} startId - The ID of the starting stop.
 * @param {string|number} endId - The ID of the ending stop.
 * @returns {Array<Object>|null} The path from start to end, or null if no path is found.
 */
const aStar = (graph, stops, startId, endId) => {
  console.log(
    `A* run: start=${startId} end=${endId} graph=${graph.size} stops=${stops.size}`,
  );
  const startStop = stops.get(startId);
  const endStop = stops.get(endId);

  if (!startStop || !endStop) {
    console.error(
      'A* init error: start or end stop not found in graph stops map.',
      { startStop, endStop, startId, endId },
    );
    return null;
  }

  // Set of nodes to be evaluated
  const openSet = new Set([startId]);

  // For reconstructing the path
  const cameFrom = new Map(); // Map<nodeId, {connectionData, fromStopId}>

  // Cost from start to current node
  const gScore = new Map(); // Map<nodeId, cost>
  gScore.set(startId, 0);

  // Estimated total cost from start to end through current node
  const fScore = new Map(); // Map<nodeId, cost>
  fScore.set(
    startId,
    calculateDistance(startStop.coordinates, endStop.coordinates),
  );

  // Initialize all other nodes to Infinity
  for (const stopId of stops.keys()) {
    if (stopId !== startId) {
      gScore.set(stopId, Infinity);
      fScore.set(stopId, Infinity);
    }
  }

  while (openSet.size > 0) {
    let currentId = null;
    let minFScore = Infinity;

    // Find the node in openSet with the lowest fScore value
    for (const id of openSet) {
      if (fScore.get(id) < minFScore) {
        minFScore = fScore.get(id);
        currentId = id;
      }
    }

    if (currentId === endId) {
      // Path found, reconstruct it
      const path = [];
      let node = currentId;
      while (node != null) {
        const connectionToCurrent = cameFrom.get(node);
        path.unshift({
          stop: stops.get(node), // The current stop itself
          connection: connectionToCurrent, // The connection/edge that led to this stop
        });
        // Move to the previous node in the path
        node = connectionToCurrent?.fromStopId ?? null;
      }
      // The first element of path will be { stop: startStop, connection: undefined }
      return path;
    }

    openSet.delete(currentId);
    const neighbors = graph.get(currentId) || [];

    for (const neighborConnection of neighbors) {
      const neighborId = neighborConnection.stopId;
      // Calculate tentative gScore for this neighbor
      const tentative_gScore =
        gScore.get(currentId) +
        neighborConnection.travelTime +
        neighborConnection.transferCost; // travelTime is the cost of this segment

      if (tentative_gScore < gScore.get(neighborId)) {
        // This path to neighbor is better than any previous one. Record it.
        cameFrom.set(neighborId, { ...neighborConnection, fromStopId: currentId });
        gScore.set(neighborId, tentative_gScore);

        const neighborStop = stops.get(neighborId);
        if (!neighborStop) {
          console.warn(`A*: Neighbor stop ${neighborId} not found in stops map.`);
          continue;
        }

        fScore.set(
          neighborId,
          tentative_gScore +
            calculateDistance(neighborStop.coordinates, endStop.coordinates), // Heuristic: distance to end
        );

        if (!openSet.has(neighborId)) {
          openSet.add(neighborId);
        }
      }
    }
  }

  console.warn('A*: No path found from start to end.');
  return null; // No path found
};

/**
 * Finds the optimal route between a start and end stop using the A* algorithm.
 * @param {object} startStop - The starting stop object {id, name, coordinates}.
 * @param {object} endStop - The ending stop object {id, name, coordinates}.
 * @param {Array<Object>} routes - The compiled route patterns.
 * @returns {Array<Object>} An array containing the optimal route result, or empty if no route is found.
 */
export const findOptimalRoute = (startStop, endStop, routes) => {
  console.log(
    'A* findOptimalRoute: start=',
    startStop?.id,
    startStop?.name,
    'end=',
    endStop?.id,
    endStop?.name,
    'routes count=',
    routes.length,
  );

  // Build the graph from the routes
  const { graph, stops } = createGraph(routes);

  // Check if start and end stops are actually in our generated graph's stop map
  console.log(
    'A* findOptimalRoute: start in stops map?',
    stops.has(startStop?.id),
    'end in stops map?',
    stops.has(endStop?.id),
  );

  if (!stops.has(startStop?.id) || !stops.has(endStop?.id)) {
    console.error(
      'A* findOptimalRoute: Start or end stop ID not found in the generated graph.',
      { startId: startStop?.id, endId: endStop?.id },
    );
    return [];
  }

  // Run A*
  const path = aStar(graph, stops, startStop.id, endStop.id);
  if (!path) {
    console.warn('A* findOptimalRoute: no path found by A* algorithm.');
    return [];
  }

  // Process the raw path into a structured route result
  const result = {
    id: `route-${Date.now()}`,
    totalTime: 0,
    totalDistance: 0,
    transfers: -1, // Start at -1, first segment doesn't count as a transfer
    segments: [],
  };

  let currentRouteId = null;
  let segment = null;

  // The path starts with the startStop and an undefined connection.
  // We iterate from the second element to process connections.
  for (let i = 1; i < path.length; i++) {
    const { stop: currentSegmentEndStop, connection: conn } = path[i];

    if (!conn || !conn.route) {
      // This should ideally not happen if A* correctly builds connections
      console.warn('A* findOptimalRoute: Missing connection or route in path segment.');
      continue;
    }

    // Check if we are continuing on the same route or transferring
    if (currentRouteId !== conn.route.id) {
      // New route, so push the previous segment (if exists) and start a new one
      if (segment) {
        result.segments.push(segment);
      }
      result.transfers++; // Increment transfers for a new route segment

      currentRouteId = conn.route.id;
      segment = {
        route: conn.route,
        startStop: stops.get(conn.fromStopId), // The stop *from* which this connection was made
        endStop: currentSegmentEndStop, // The current stop
        stops: [stops.get(conn.fromStopId), currentSegmentEndStop], // Stops included in this segment
        travelTime: conn.travelTime,
        distance: conn.distance,
      };
    } else {
      // Continue on the same route
      segment.endStop = currentSegmentEndStop;
      segment.stops.push(currentSegmentEndStop);
      segment.travelTime += conn.travelTime;
      segment.distance += conn.distance;
    }

    result.totalTime += conn.travelTime;
    result.totalDistance += conn.distance;
  }

  // Add the last segment after the loop finishes
  if (segment) {
    result.segments.push(segment);
  }

  // Ensure transfers count is not negative (0 if direct path, no transfers)
  result.transfers = Math.max(0, result.transfers);

  console.log('A* result:', result);
  return [result]; // Return as an array as per original component expectation
};
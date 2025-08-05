// src/config/apiEndpoints.js

// Base URL for the SWU Mobility API
// Adjust this if your actual API base differs or requires a specific version segment
export const SWU_API_BASE = 'https://api.swu.de/mobility/v1';

// Append your API key if required by the SWU API
// Example: `?key=YOUR_API_KEY`
const API_KEY_PARAM = ''; // e.g., '?key=YOUR_API_KEY' if needed

// Endpoints for BaseData (extended content scope requested for more details)
export const SWU_STOPS_API_URL = `${SWU_API_BASE}/stop/attributes/BaseData?ContentScope=extended${API_KEY_PARAM}`;
export const SWU_STOPPOINTS_API_URL = `${SWU_API_BASE}/stoppoint/attributes/BaseData?ContentScope=extended${API_KEY_PARAM}`;
export const SWU_ROUTES_BASEDATA_URL = `${SWU_API_BASE}/route/attributes/BaseData?ContentScope=extended${API_KEY_PARAM}`;

// You might not need these in this specific implementation, but useful to keep
// for future reference or other parts of your app
export const SWU_VEHICLE_TRIP_URL = `${SWU_API_BASE}/vehicle/trip/Trip${API_KEY_PARAM}`;
export const SWU_STOP_ARRIVALS_URL = `${SWU_API_BASE}/stop/passage/Arrivals${API_KEY_PARAM}`;

// src/config/apiEndpoints.js

// export const SWU_STOPS_API_URL = 'https://api.swu.de/mobility/v1/stop/attributes/BaseData';
export const SWU_VEHICLE_TRIP_API_URL = 'https://api.swu.de/mobility/v1/vehicle/trip/Trip';
// export const SWU_DEPARTURES_API_BASE_URL = 'https://api.swu.de/mobility/v1/stop/passage/Departures?Limit=6&StopNumber=';

export const SWU_VERSION_INFO_URL = `${SWU_API_BASE}/VersionInfo`;


// For the map page's LIVE vehicle positions
// DANGER: Your documentation DOES NOT show an endpoint for *all* live vehicle positions.
// The /vehicle/trip/Trip requires a VehicleNumber.
// If you want live vehicle positions on the map, you likely need to:
// A) Find a undocumented endpoint.
// B) Iterate through all known vehicle numbers (from `vehicle/attributes/BaseData`) and fetch each one's `trip/Trip`. This is inefficient for a live map.
// C) Get a static GTFS feed and try to infer positions, or use a third-party service.
// For now, I'll update it to point to a theoretical "all active vehicles" if one existed,
// but keep the current structure that might return limited data.
export const SWU_LIVE_VEHICLE_POSITIONS_URL = `${SWU_API_BASE}/vehicle/trip/Trip`; // This requires VehicleNumber! We'll modify swuService.js accordingly.
// If you don't have a way to get ALL active vehicles, the "live vehicles on map" feature
// will be limited (e.g., only show specific vehicles you hardcode).
export const SWU_DEPARTURES_API_BASE_URL =
  `${SWU_API_BASE}/stop/passage/Departures?StopNumber=`;
import routeColorMap from "../utils/routeColorMap";
const fetchAndDrawRoutePattern = async (vehicleNumber, activeRoutePolylineRef, googleMapRef) => {
  try {
    const response = await fetch(`https://api.swu.de/mobility/v1/vehicle/trip/Pattern?VehicleNumber=${vehicleNumber}&ContentScope=Track`);
    if (!response.ok) {
      console.warn(`Pattern request failed: ${response.status}`);
      return;
    }

    const data = await response.json();
    const vehiclePattern = data?.VehiclePattern;

    const trackPoints = vehiclePattern?.PatternData?.TrackPoints;
    const routeNumber = vehiclePattern?.RouteNumber?.toString();
    const routeColor = routeColorMap[routeNumber] || '#000000'; // fallback color

    if (!trackPoints || trackPoints.length === 0) {
      console.warn(`No track points for vehicle ${vehicleNumber}`);
      return;
    }

    const path = trackPoints.map(pt => ({
      lat: pt.Latitude,
      lng: pt.Longitude
    }));

    console.log(`Drawing route for vehicle ${vehicleNumber} (route ${routeNumber})`, path);

    if (activeRoutePolylineRef.current) {
      activeRoutePolylineRef.current.setMap(null);
    }

    const polyline = new window.google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: routeColor,
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map: googleMapRef.current,
    });

    activeRoutePolylineRef.current = polyline;

  } catch (err) {
    console.error(`Error fetching pattern for vehicle ${vehicleNumber}:`, err);
  }
};

export default fetchAndDrawRoutePattern;
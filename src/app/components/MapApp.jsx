'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createElementFromHTML } from "../../../lib/utils"



// Hauptkomponente der Anwendung
const App = (data) => {
  // Zustand für die Google Maps API-geladen-Status
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  // Zustand für die Haltestellendaten
  const [stopsData, setStopsData] = useState([]);
  // Zustand für die Fahrzeugdaten
  const [vehiclesData, setVehiclesData] = useState([]);
  // Zustand für den Ladezustand
  const [isLoading, setIsLoading] = useState(true);
  // Zustand für Fehler‚
  const [error, setError] = useState(null);
  // Referenz für das Karten-DIV-Element
  const mapRef = useRef(null);
  // Referenz für das Google Map-Objekt
  const googleMapRef = useRef(null);
  // Referenz für die Haltestellen-Marker auf der Karte
  const stopMarkersRef = useRef({});
  // Referenz für die Fahrzeug-Marker auf der Karte
  const vehicleMarkersRef = useRef({});

  const activeRoutePolylineRef = useRef(null);

const [showStops, setShowStops] = useState(false);

const routeColorMap = {
  '1': '#E52229',
  '2': '#3EAD56',
  '4': '#09816E',
  '5': '#1AA9BF',
  '6': '#F49437',
  '7': '#B30F6C',
  '8': '#78418F',
  '9': '#E09DBC',
  '10': '#A5A058',
  '11': '#045EA4',
  '12': '#B32E2A',
  '13': '#7CC293',
  '14': '#2BABE2',
  '15': '#B282B8',
  '16': '#DD4B95',
  '17': '#D6A700',

  // add more routeNumber to color mappings
};


const loadRouteIcon = (routeNumber, callback) => {
  const imageUrl = `/icons/Linie_${routeNumber}_Pikto.gif`;
  const fallbackUrl = '/icons/tram_logo.png';

  const img = new Image();
  img.onload = () => callback(imageUrl);
  img.onerror = () => callback(fallbackUrl);
  img.src = imageUrl;
};

  const GOOGLE_MAPS_API_KEY = data.apikeys.MAPS_API_KEY;
  const GOOGLE_MAP_ID = data.apikeys.MAP_ID;

  // URL für die SWU ÖPNV Haltestellen-Basisdaten-API
  const SWU_STOPS_API_URL = 'https://api.swu.de/mobility/v1/stoppoint/attributes/BaseData';
  // URL für die SWU ÖPNV Fahrzeug-Basisdaten-API (für alle Fahrzeugnummern)
  const SWU_VEHICLE_BASE_API_URL = 'https://api.swu.de/mobility/v1/vehicle/attributes/BaseData?ContentScope=minimal';
  // Präfix für die SWU ÖPNV Fahrzeug-Trip-Daten-API (für Live-Positionen)
  const SWU_VEHICLE_TRIP_API_URL_PREFIX = 'https://api.swu.de/mobility/v1/vehicle/trip/Trip?VehicleNumber=';

  // Funktion zum Laden der Google Maps JavaScript API
  const loadGoogleMapsApi = useCallback(() => {
    if (window.google) {
      setIsApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=maps`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsApiLoaded(true);
    };
    script.onerror = () => {
      setError('Fehler beim Laden der Google Maps API. Bitte überprüfen Sie Ihren API-Schlüssel und Ihre Internetverbindung.');
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [GOOGLE_MAPS_API_KEY]);

  // Funktion zum Abrufen der Haltestellendaten von der SWU API
  const fetchStopData = useCallback(async () => {
    try {
      const response = await fetch(SWU_STOPS_API_URL);
      if (!response.ok) {
        throw new Error(`HTTP-Fehler! Status: ${response.status}`);
      }
      const data = await response.json();

      if (data && data.StopPointAttributes && Array.isArray(data.StopPointAttributes.StopPointData)) {
        const parsedStops = data.StopPointAttributes.StopPointData.map(stopPoint => ({
          id: stopPoint.StopPointCode,
          name: stopPoint.StopPointName,
          latitude: stopPoint.StopPointCoordinates.Latitude,
          longitude: stopPoint.StopPointCoordinates.Longitude,
          platform: stopPoint.PlatformName,
          parentStopName: stopPoint.ParentStop?.StopName,
        })).filter(s => s.latitude && s.longitude);
        setStopsData(parsedStops);
      } else {
        setStopsData([]);
        console.warn('Keine Haltestellendaten von der SWU API erhalten oder unerwartetes Format.', data);
      }
    } catch (err) {
      console.error("Fehler beim Abrufen der Haltestellendaten:", err);
      // Fehler wird im Haupt-Error-State behandelt, um nicht mehrere Fehlermeldungen zu überlagern
    }
  }, [SWU_STOPS_API_URL]);

  // Funktion zum Abrufen aller Fahrzeugpositionen
  const SWU_VEHICLE_TRIP_API_URL = 'https://api.swu.de/mobility/v1/vehicle/trip/Trip';

const fetchAllVehiclePositions = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch(SWU_VEHICLE_TRIP_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP-Fehler beim Abrufen der Trip-Daten! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.VehicleTrip || !Array.isArray(data.VehicleTrip.TripData)) {
      console.warn('Keine oder ungültige Trip-Daten empfangen:', data);
      setVehiclesData([]);
      return;
    }

    const activeVehicles = data.VehicleTrip.TripData
      .filter(v => v.IsActive && v.PositionData)
      .map(v => ({
        id: v.VehicleNumber,
        latitude: v.PositionData.Latitude,
        longitude: v.PositionData.Longitude,
        routeNumber: v.JourneyData?.RouteNumber,
        directionText: v.JourneyData?.DepartureDirectionText,
        bearing: v.PositionData?.Bearing,
        category: v.VehicleCategory
      }));

    setVehiclesData(activeVehicles);
  } catch (err) {
    console.error("Fehler beim Abrufen der Fahrzeugdaten:", err);
    setError('Fehler beim Abrufen der Fahrzeugdaten. Versuchen Sie es später erneut.');
  } finally {
    setIsLoading(false);
  }
}, [SWU_VEHICLE_TRIP_API_URL]);


const fetchAndDrawRoutePattern = async (vehicleNumber) => {
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






  // Initiales Laden der Google Maps API
  useEffect(() => {
    loadGoogleMapsApi();
  }, [loadGoogleMapsApi]);

  // Initialisieren der Karte, sobald die API geladen ist und Daten abrufen
  useEffect(() => {
    if (isApiLoaded && mapRef.current && !googleMapRef.current) {
      // Standardposition für Ulm
      const ulm = { lat: 48.4011, lng: 9.9877 };
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: ulm,
        zoom: 13,
        mapId: GOOGLE_MAP_ID, // Wichtig: ERSETZEN SIE DIES DURCH IHRE EIGENE MAP ID AUS DER GOOGLE CLOUD CONSOLE
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      // Haltestellendaten einmalig abrufen
      fetchStopData();
      // Fahrzeugdaten regelmäßig abrufen
      fetchAllVehiclePositions();
      const vehicleIntervalId = setInterval(fetchAllVehiclePositions, 15000); // Alle 15 Sekunden aktualisieren
      return () => clearInterval(vehicleIntervalId); // Bereinigung bei Komponenten-Unmount
    }
  }, [isApiLoaded, fetchStopData, fetchAllVehiclePositions, GOOGLE_MAP_ID]);

  // Aktualisieren der Haltestellen-Marker auf der Karte
  useEffect(() => {
  if (!googleMapRef.current) return;

  // Create or update markers
  if (stopsData.length > 0) {
    const currentStopIds = new Set(stopsData.map(s => s.id));

    // Remove old markers no longer in data
    for (const stopId in stopMarkersRef.current) {
      if (!currentStopIds.has(stopId)) {
        stopMarkersRef.current[stopId].setMap(null);
        delete stopMarkersRef.current[stopId];
      }
    }

    // Add or update all current markers
    stopsData.forEach(stop => {
      const position = { lat: stop.latitude, lng: stop.longitude };

      if (!stopMarkersRef.current[stop.id]) {
        stopMarkersRef.current[stop.id] = new window.google.maps.Marker({
          position,
          map: showStops ? googleMapRef.current : null,
          title: `${stop.name} (Steig: ${stop.platform || 'N/A'})`,
          icon: {
            url: '/icons/stop_point.svg',
            scaledSize: new window.google.maps.Size(10, 10),
          },
        });
      } else {
        stopMarkersRef.current[stop.id].setPosition(position);
        stopMarkersRef.current[stop.id].setMap(showStops ? googleMapRef.current : null);
      }
    });
  }

  // Toggle visibility of all existing markers
  if (stopsData.length > 0) {
    Object.values(stopMarkersRef.current).forEach(marker => {
      marker.setMap(showStops ? googleMapRef.current : null);
    });
  }
}, [stopsData, showStops]);

  // Aktualisieren der Fahrzeug-Marker auf der Karte
  useEffect(() => {
    if (googleMapRef.current && vehiclesData.length > 0) {
      const currentVehicleIds = new Set(vehiclesData.map(v => v.id));
      for (const vehicleId in vehicleMarkersRef.current) {
        if (!currentVehicleIds.has(vehicleId)) {
          vehicleMarkersRef.current[vehicleId].setMap(null);
          delete vehicleMarkersRef.current[vehicleId];
        }
      }

      vehiclesData.forEach(vehicle => {
        const position = { lat: vehicle.latitude, lng: vehicle.longitude };
        if (vehicleMarkersRef.current[vehicle.id]) {
          vehicleMarkersRef.current[vehicle.id].setPosition(position);
        } else {


const routeColor = routeColorMap[vehicle.routeNumber] || '#888888';

const existingMarker = vehicleMarkersRef.current[vehicle.id];

if (existingMarker) {
  existingMarker.setPosition(position);
} else {
  const baseIconUrl = vehicle.category === 1 ? '/icons/tram_logo.png' : '/icons/bus_logo.png';
  const routeColor = routeColorMap[vehicle.routeNumber] || '#888888';

  loadRouteIcon(vehicle.routeNumber, (iconUrl) => {
  const marker = new window.google.maps.Marker({
    position: { lat: vehicle.latitude, lng: vehicle.longitude },
    map: googleMapRef.current,
    title: `Fahrzeug ${vehicle.id} (Linie: ${vehicle.routeNumber || 'N/A'}, Richtung: ${vehicle.directionText || 'N/A'})`,
    icon: {
      url: iconUrl,
      scaledSize: new window.google.maps.Size(20, 20),
    },
  });

  const infoWindow = new window.google.maps.InfoWindow({
  headerContent:
    createElementFromHTML(`<strong style="font-size: 12px‚;">${vehicle.directionText}</strong>`)
  ,
  content: `
    <div style="min-width: 150px; display:flex; gap:8px; align-items:center;">
      <img src="${iconUrl}" alt="Linienlogo" width="24" height="24" />
      <div>
        <strong>Fahrzeug ${vehicle.id}</strong>
      </div>
    </div>
  `
});

  marker.addListener('click', () => {
    infoWindow.open({
      anchor: marker,
      map: googleMapRef.current,
      shouldFocus: false,
    });

    fetchAndDrawRoutePattern(vehicle.id);
  });

  vehicleMarkersRef.current[vehicle.id] = marker;
});
}
        }
      });
    } else if (googleMapRef.current && vehiclesData.length === 0 && !isLoading) {
      for (const vehicleId in vehicleMarkersRef.current) {
        vehicleMarkersRef.current[vehicleId].setMap(null);
      }
      vehicleMarkersRef.current = {};
    }
  }, [vehiclesData, isLoading]);


  return (
    <div className="min-h-screen bg-gray-100 font-inter text-gray-900 flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md rounded-b-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <h1 className="text-xl lg:text-3xl font-bold text-center sm:text-left">
    SWU ÖPNV Echtzeitkarte
  </h1>
  <div className="flex items-center gap-2 text-sm">
    <input
      id="toggleStops"
      type="checkbox"
      checked={showStops}
      onChange={() => setShowStops(prev => !prev)}
      className="h-4 w-4 text-blue-600"
    />
    <label htmlFor="toggleStops" className="cursor-pointer">
      Haltestellen anzeigen
    </label>
  </div>
</header>

      <main className="flex-grow flex flex-col p-0"> {/* p-0 für den Rand-zu-Rand-Effekt der Karte */}
        {/* Nachrichtenbereich (Ladezustand, Fehler, Hinweise) */}
        {(error || (stopsData.length === 0 && !isLoading && !error && vehiclesData.length === 0)) && (
          <div className="w-full bg-white rounded-lg shadow-xl p-4 m-4 mx-auto max-w-4xl text-center"> {/* Mit Padding für den Inhalt */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2" role="alert">
                <strong className="font-bold">Fehler: </strong>
                <span className="block sm:inline">{error}</span>
                <p className="text-sm mt-1">
                  Bitte stellen Sie sicher, dass Ihr Google Maps API-Schlüssel korrekt ist, die richtige Map ID verwendet wird und dass die SWU-APIs zugänglich sind.
                </p>
              </div>
            )}





            {!isLoading && stopsData.length === 0 && vehiclesData.length === 0 && !error && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-2" role="alert">
                <strong className="font-bold">Hinweis: </strong>
                <span className="block sm:inline">Keine Haltestellen oder Fahrzeuge gefunden oder Daten noch nicht verfügbar.</span>
                <p className="text-sm mt-1">
                  Die Karte wird sich automatisch aktualisieren, sobald Daten verfügbar sind.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Kartenbereich */}
        <div
          ref={mapRef}
          className="flex-grow w-full h-full" // Karte füllt verfügbaren Platz aus
          style={{ minHeight: '500px' }} // Mindesthöhe für die Karte
          aria-label="Google Maps Karte mit ÖPNV Haltestellen und Fahrzeugen"
        >
          {/* Die Karte wird hier von Google Maps API gerendert */}
        </div>
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center text-sm rounded-t-lg mt-4">
        &copy; {new Date().getFullYear()} Echtzeit-ÖPNV-Karte für Ulm. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
};




const tintIconWithSource = (iconUrl, color, callback) => {
  const baseImage = new Image();
  baseImage.src = iconUrl;
  baseImage.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(baseImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const tint = hexToRgb(color);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (r === 255 && g === 255 && b === 255 && a > 0) {
        continue; // keep white parts white
      }

      data[i] = tint.r;
      data[i + 1] = tint.g;
      data[i + 2] = tint.b;
    }

    ctx.putImageData(imageData, 0, 0);
    callback(canvas.toDataURL());
  };
};


const tintIcon = (color, callback) => {
  const baseImage = new Image();
  baseImage.src = '/icons/tram_logo.png';
  baseImage.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(baseImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert hex color to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const tint = hexToRgb(color);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // If pixel is white (and opaque), skip it
      if (r === 255 && g === 255 && b === 255 && a > 0) {
        continue;
      }

      // Apply tint
      data[i] = tint.r;
      data[i + 1] = tint.g;
      data[i + 2] = tint.b;
      // Alpha remains unchanged
    }

    ctx.putImageData(imageData, 0, 0);
    callback(canvas.toDataURL());
  };
};



export default App;

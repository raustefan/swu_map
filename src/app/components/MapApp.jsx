'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createElementFromHTML } from '../../../lib/utils';
import routeColorMap from '../utils/routeColorMap';
import fetchAndDrawRoutePattern from '../utils/fetchAndDrawRoutePattern';
import loadRouteIcon from '../utils/loadRouteIcon';

const App = (data) => {
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [stopsData, setStopsData] = useState([]);
  const [vehiclesData, setVehiclesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStops, setShowStops] = useState(false);

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const stopMarkersRef = useRef({});
  const vehicleMarkersRef = useRef({});
  const activeRoutePolylineRef = useRef(null);

  const GOOGLE_MAPS_API_KEY = data.apikeys.MAPS_API_KEY;
  const GOOGLE_MAP_ID = data.apikeys.MAP_ID;

  const SWU_STOPS_API_URL = 'https://api.swu.de/mobility/v1/stoppoint/attributes/BaseData';
  const SWU_VEHICLE_TRIP_API_URL = 'https://api.swu.de/mobility/v1/vehicle/trip/Trip';

  const loadGoogleMapsApi = useCallback(() => {
    if (window.google) {
      setIsApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=maps`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsApiLoaded(true);
    script.onerror = () => {
      setError('Fehler beim Laden der Google Maps API. Bitte überprüfen Sie Ihren API-Schlüssel und Ihre Internetverbindung.');
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [GOOGLE_MAPS_API_KEY]);

  const fetchStopData = useCallback(async () => {
    try {
      const response = await fetch(SWU_STOPS_API_URL);
      if (!response.ok) throw new Error(`HTTP-Fehler! Status: ${response.status}`);

      const data = await response.json();
      if (data?.StopPointAttributes?.StopPointData?.length) {
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
        console.warn('Keine Haltestellendaten oder unerwartetes Format.', data);
      }
    } catch (err) {
      console.error('Fehler beim Abrufen der Haltestellendaten:', err);
    }
  }, []);

  const fetchAllVehiclePositions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(SWU_VEHICLE_TRIP_API_URL);
      if (!response.ok) throw new Error(`HTTP-Fehler beim Abrufen der Trip-Daten! Status: ${response.status}`);

      const data = await response.json();
      if (!data?.VehicleTrip?.TripData?.length) {
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
          category: v.VehicleCategory,
        }));

      setVehiclesData(activeVehicles);
    } catch (err) {
      console.error('Fehler beim Abrufen der Fahrzeugdaten:', err);
      setError('Fehler beim Abrufen der Fahrzeugdaten. Versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => loadGoogleMapsApi(), [loadGoogleMapsApi]);

  useEffect(() => {
    if (isApiLoaded && mapRef.current && !googleMapRef.current) {
      const ulm = { lat: 48.4011, lng: 9.9877 };
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: ulm,
        zoom: 13,
        mapId: GOOGLE_MAP_ID,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      fetchStopData();
      fetchAllVehiclePositions();
      const vehicleIntervalId = setInterval(fetchAllVehiclePositions, 15000);
      return () => clearInterval(vehicleIntervalId);
    }
  }, [isApiLoaded, fetchStopData, fetchAllVehiclePositions, GOOGLE_MAP_ID]);

  useEffect(() => {
    if (!googleMapRef.current) return;

    const currentStopIds = new Set(stopsData.map(s => s.id));
    for (const stopId in stopMarkersRef.current) {
      if (!currentStopIds.has(stopId)) {
        stopMarkersRef.current[stopId].setMap(null);
        delete stopMarkersRef.current[stopId];
      }
    }

    stopsData.forEach(stop => {
      const position = { lat: stop.latitude, lng: stop.longitude };
      const existingMarker = stopMarkersRef.current[stop.id];

      if (!existingMarker) {
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
        existingMarker.setPosition(position);
        existingMarker.setMap(showStops ? googleMapRef.current : null);
      }
    });
  }, [stopsData, showStops]);

  useEffect(() => {
    if (!googleMapRef.current) return;

    const currentVehicleIds = new Set(vehiclesData.map(v => v.id));
    for (const id in vehicleMarkersRef.current) {
      if (!currentVehicleIds.has(id)) {
        vehicleMarkersRef.current[id].setMap(null);
        delete vehicleMarkersRef.current[id];
      }
    }

    vehiclesData.forEach(vehicle => {
      const position = { lat: vehicle.latitude, lng: vehicle.longitude };

      if (vehicleMarkersRef.current[vehicle.id]) {
        vehicleMarkersRef.current[vehicle.id].setPosition(position);
        return;
      }

      loadRouteIcon(vehicle.routeNumber, (iconUrl) => {
        const marker = new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          title: `Fahrzeug ${vehicle.id} (Linie: ${vehicle.routeNumber || 'N/A'}, Richtung: ${vehicle.directionText || 'N/A'})`,
          icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(20, 20),
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          headerContent: createElementFromHTML(`<strong style="font-size: 12px;">${vehicle.directionText}</strong>`),
          content: `
            <div style="min-width: 150px; display:flex; gap:8px; align-items:center;">
              <img src="${iconUrl}" alt="Linienlogo" width="24" height="24" />
              <div><strong>Fahrzeug ${vehicle.id}</strong></div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open({ anchor: marker, map: googleMapRef.current, shouldFocus: false });
          fetchAndDrawRoutePattern(vehicle.id, activeRoutePolylineRef, googleMapRef);
        });

        vehicleMarkersRef.current[vehicle.id] = marker;
      });
    });
  }, [vehiclesData, isLoading]);

  return (
    <div className="min-h-screen bg-gray-100 font-inter text-gray-900 flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md rounded-b-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl lg:text-3xl font-bold text-center sm:text-left">SWU ÖPNV Echtzeitkarte</h1>
        <div className="flex items-center gap-2 text-sm">
          <input id="toggleStops" type="checkbox" checked={showStops} onChange={() => setShowStops(prev => !prev)} className="h-4 w-4 text-blue-600" />
          <label htmlFor="toggleStops" className="cursor-pointer">Haltestellen anzeigen</label>
        </div>
      </header>

      <main className="flex-grow flex flex-col p-0">
        {(error || (stopsData.length === 0 && !isLoading && !error && vehiclesData.length === 0)) && (
          <div className="w-full bg-white rounded-lg shadow-xl p-4 m-4 mx-auto max-w-4xl text-center">
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

        <div ref={mapRef} className="flex-grow w-full h-full" style={{ minHeight: '500px' }} aria-label="Google Maps Karte mit ÖPNV Haltestellen und Fahrzeugen" />
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center text-sm rounded-t-lg mt-4">
        &copy; {new Date().getFullYear()} Echtzeit-ÖPNV-Karte für Ulm. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
};

export default App;
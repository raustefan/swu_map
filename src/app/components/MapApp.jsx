'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createElementFromHTML } from '../../../lib/utils';
import routeColorMap from '../utils/routeColorMap';
import fetchAndDrawRoutePattern from '../utils/fetchAndDrawRoutePattern';
import loadRouteIcon from '../utils/loadRouteIcon';

const App = (data) => {
  const [activeStopData, setActiveStopData] = useState(null);
  
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [stopsData, setStopsData] = useState([]);
  const [vehiclesData, setVehiclesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStops, setShowStops] = useState(false);
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const stopMarkersRef = useRef({});
  const vehicleMarkersRef = useRef({});
  const activeRoutePolylineRef = useRef(null);
  const activeInfoWindowRef = useRef(null); // Ref to hold the active info window

  const Maps_API_KEY = data.apikeys.MAPS_API_KEY;
  const GOOGLE_MAP_ID = data.apikeys.MAP_ID;

  const SWU_STOPS_API_URL = 'https://api.swu.de/mobility/v1/stoppoint/attributes/BaseData';
  const SWU_VEHICLE_TRIP_API_URL = 'https://api.swu.de/mobility/v1/vehicle/trip/Trip';
  const SWU_DEPARTURES_API_BASE_URL = 'https://api.swu.de/mobility/v1/stoppoint/passage/Departures?Limit=2&StopPointCode=';

  const loadGoogleMapsApi = useCallback(() => {
    if (window.google) {
      setIsApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&libraries=maps`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsApiLoaded(true);
    script.onerror = () => {
      setError('Fehler beim Laden der Google Maps API. Bitte überprüfen Sie Ihren API-Schlüssel und Ihre Internetverbindung.');
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [Maps_API_KEY]);

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

  const fetchDeparturesData = useCallback(async (stopId) => {
    try {
      const response = await fetch(`${SWU_DEPARTURES_API_BASE_URL}${stopId}`);
      if (!response.ok) throw new Error(`HTTP-Fehler! Status: ${response.status}`);

      const data = await response.json();
      return data?.StopPointPassage?.DepartureData || [];
    } catch (err) {
      console.error(`Fehler beim Abrufen der Abfahrtsdaten für Haltestelle ${stopId}:`, err);
      return null;
    }
  }, [SWU_DEPARTURES_API_BASE_URL]);

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
          deviation: v.TimeData?.Deviation || 0
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

      // Close infowindow when clicking on the map
      googleMapRef.current.addListener('click', () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
          activeInfoWindowRef.current = null;
        }
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
      let existingMarker = stopMarkersRef.current[stop.id];

      if (!existingMarker) {
        const marker = new window.google.maps.Marker({
          position,
          map: showStops ? googleMapRef.current : null,
          title: `${stop.name} (Steig: ${stop.platform || 'N/A'})`,
          icon: {
            url: '/icons/stop_point.svg',
            scaledSize: new window.google.maps.Size(12, 12),
          },
        });

        marker.addListener('click', async () => {
          const departures = await fetchDeparturesData(stop.id);

          setActiveStopData({
            stop,
            departures,
          });
        });

        stopMarkersRef.current[stop.id] = marker;
      } else {
        existingMarker.setPosition(position);
        existingMarker.setMap(showStops ? googleMapRef.current : null);
      }
    });
  }, [stopsData, showStops, fetchDeparturesData]);

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

        const absDeviation = Math.abs(vehicle.deviation || 0);
        const minutes = Math.floor(absDeviation / 60).toString().padStart(2, '0');
        const seconds = Math.abs(absDeviation % 60).toString().padStart(2, '0');

        let delayText;
        if (vehicle.deviation > 0) {
          delayText = `+${minutes}:${seconds} Verspätung`;
        } else if (vehicle.deviation < 0) {
          delayText = `-${minutes}:${seconds} zu früh`;
        } else {
          delayText = `Pünktlich`;
        }

        const infoWindow = new window.google.maps.InfoWindow({
          headerContent: createElementFromHTML(`<strong style="font-size: 12px;">${vehicle.directionText}</strong>`),
          content: `
            <div style="min-width: 180px; display:flex; gap:8px; align-items:center;">
              <img src="${iconUrl}" alt="Linienlogo" width="24" height="24" />
              <div>
                <strong>Fahrzeug ${vehicle.id}</strong><br/>
                <span>${delayText}</span>
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          if (activeInfoWindowRef.current) {
            activeInfoWindowRef.current.close();
          }
          infoWindow.open({ anchor: marker, map: googleMapRef.current, shouldFocus: false });
          activeInfoWindowRef.current = infoWindow;
          fetchAndDrawRoutePattern(vehicle.id, activeRoutePolylineRef, googleMapRef);
        });

        vehicleMarkersRef.current[vehicle.id] = marker;
      });
    });
  }, [vehiclesData, isLoading]);











  return (
    <div className="h-[100dvh] bg-gray-100 font-inter text-gray-900 flex flex-col">
            <header className="bg-gradient-to-r from-blue-800 to-blue-500 text-white px-6 py-4 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center sm:text-left">
          Ulmiversität ÖPNV Echtzeitkarte
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <label htmlFor="toggleStops" className="flex items-center cursor-pointer">
            {/* Switch Container */}
            <div className="relative">
              {/* Hidden Checkbox */}
              <input
                type="checkbox"
                id="toggleStops"
                checked={showStops}
                onChange={() => setShowStops(prev => !prev)}
                className="sr-only"
              />
              {/* Track */}
              <div className="block w-12 h-7 bg-white rounded-full border border-white shadow-inner"></div>
              {/* Thumb */}
              <div
                className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all duration-200 ease-in-out
                  ${showStops ? 'translate-x-5 bg-blue-500' : 'bg-gray-400'}`}
              ></div>
            </div>
            {/* Label */}
            <span className="ml-3 select-none text-white">Haltestellen anzeigen</span>
          </label>
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

      <footer className="bg-gray-800 text-white p-2 text-center text-sm">
        &copy; {new Date().getFullYear()} Echtzeit-ÖPNV-Karte für Ulm. Alle Rechte vorbehalten. Wir stehen in keinerlei Verbindung zu den Stadtwerken Ulm.
      </footer>
      {activeStopData && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
      <button
        onClick={() => setActiveStopData(null)}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
        aria-label="Schließen"
      >
        &times;
      </button>
      <h2 className="text-xl font-bold mb-4">{activeStopData.stop.name}</h2>

      {activeStopData.departures && activeStopData.departures.length > 0 ? (
        <ul className="space-y-3">
          {activeStopData.departures.slice(0, 2).map((dep, i) => {
            const scheduled = new Date(dep.DepartureTimeScheduled).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const actual = new Date(dep.DepartureTimeActual).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const deviation = dep.DepartureDeviation || 0;
            const delayMinutes = Math.floor(Math.abs(deviation) / 60);
            const delaySeconds = Math.abs(deviation % 60);
            const delayText = deviation > 0
              ? `+${delayMinutes}min ${delaySeconds}s`
              : (deviation < 0
                  ? `-${delayMinutes}min ${delaySeconds}s`
                  : 'Pünktlich');

            return (
              <li key={i} className="border-b pb-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Linie {dep.RouteNumber}</span>
                  <span>{dep.DepartureDirectionText}</span>
                  <span>{scheduled}</span>
                  <span className={`font-semibold ${deviation > 60 ? 'text-red-500' : deviation < 0 ? 'text-green-600' : ''}`}>
                    {delayText}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-gray-600">Keine bevorstehenden Abfahrten.</div>
      )}

      <div className="mt-6 text-right">
        <button
          onClick={() => setActiveStopData(null)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default App;
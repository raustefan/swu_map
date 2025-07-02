// src/app/App.jsx
'use client';

import React, { useEffect, useState, useRef } from 'react'; // Removed useCallback as it's not strictly necessary with this structure now
import loadRouteIcon from './utils/loadRouteIcon';
import fetchAndDrawRoutePattern from './utils/fetchAndDrawRoutePattern';
import { loadGoogleMapsApi, initializeMap, createStopMarker, createVehicleMarker } from './utils/googleMapsUtils';
import { fetchStopData, fetchDeparturesData, fetchAllVehiclePositions } from './services/swuService';
import StopDetailsModal from './components/StopDetailsModal';

const App = ({ apikeys }) => { // Reverted to accepting 'data' prop
  // Destructure keys from data.apikeys
  const Maps_API_KEY = apikeys.MAPS_API_KEY;
  const GOOGLE_MAP_ID = apikeys.MAP_ID;

  // State variables
  const [activeStopData, setActiveStopData] = useState(null);
  const [routeIcons, setRouteIcons] = useState({});
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [stopsData, setStopsData] = useState([]);
  const [vehiclesData, setVehiclesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStops, setShowStops] = useState(false);

  // Refs for Google Maps objects and markers
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const stopMarkersRef = useRef({});
  const vehicleMarkersRef = useRef({});
  const activeRoutePolylineRef = useRef(null);
  const activeInfoWindowRef = useRef(null);

  // Effect to load route icons for active stop departures
  useEffect(() => {
    if (!activeStopData) return;
    activeStopData.departures.forEach(dep => {
      if (!routeIcons[dep.RouteNumber]) {
        loadRouteIcon(dep.RouteNumber, (url) => {
          if (url) {
            setRouteIcons(prev => ({ ...prev, [dep.RouteNumber]: url }));
          }
        });
      }
    });
  }, [activeStopData, routeIcons]);

  // Effect to load Google Maps API on component mount
  useEffect(() => {
    // Pass Maps_API_KEY directly
    loadGoogleMapsApi(Maps_API_KEY, setIsApiLoaded, setError, setIsLoading);
  }, [Maps_API_KEY]); // Dependency on Maps_API_KEY

  // Effect to initialize the map and fetch initial data
  useEffect(() => {
    if (isApiLoaded && mapRef.current && !googleMapRef.current) {
      // Pass GOOGLE_MAP_ID directly
      initializeMap(mapRef, googleMapRef, activeInfoWindowRef, GOOGLE_MAP_ID);

      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          await fetchStopData().then(setStopsData);
          await fetchAllVehiclePositions().then(setVehiclesData);
        } catch (err) {
          setError(err.message || 'Ein Fehler ist aufgetreten.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
      const vehicleIntervalId = setInterval(() => {
        fetchAllVehiclePositions()
          .then(setVehiclesData)
          .catch(err => console.error("Error fetching vehicles in interval:", err));
      }, 15000);
      return () => clearInterval(vehicleIntervalId);
    }
  }, [isApiLoaded, GOOGLE_MAP_ID]); // Dependencies on isApiLoaded and GOOGLE_MAP_ID

  // Effect to manage stop markers on the map
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
      let existingMarker = stopMarkersRef.current[stop.id];

      const onClickHandler = async () => {
        const departures = await fetchDeparturesData(stop.id);
        setActiveStopData({ stop, departures });
      };

      if (!existingMarker) {
        existingMarker = createStopMarker(stop, showStops ? googleMapRef.current : null, onClickHandler);
        stopMarkersRef.current[stop.id] = existingMarker;
      } else {
        existingMarker.setPosition({ lat: stop.latitude, lng: stop.longitude });
        existingMarker.setMap(showStops ? googleMapRef.current : null);
      }
    });
  }, [stopsData, showStops]);

  // Effect to manage vehicle markers on the map
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
        const marker = createVehicleMarker(
          vehicle,
          googleMapRef.current,
          iconUrl,
          activeInfoWindowRef,
          activeRoutePolylineRef, 
          googleMapRef
        );


        vehicleMarkersRef.current[vehicle.id] = marker;
      });
    });
  }, [vehiclesData, isLoading]);

  return (
    <div className="h-[100dvh] bg-gray-100 font-inter text-gray-900 flex flex-col">
      <header className="bg-gradient-to-r from-blue-800 to-blue-500 text-white px-6 py-4 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center sm:text-left">
          Ulmiversität Echtzeitkarte
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <label htmlFor="toggleStops" className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                id="toggleStops"
                checked={showStops}
                onChange={() => setShowStops(prev => !prev)}
                className="sr-only"
              />
              <div className="block w-12 h-7 bg-white rounded-full border border-white shadow-inner"></div>
              <div
                className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all duration-200 ease-in-out
                  ${showStops ? 'translate-x-5 bg-blue-500' : 'bg-gray-400'}`}
              ></div>
            </div>
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
        Ulmiversität ÖPNV-Karte (beta). <a href="https://ulmiversitaet.de/impressum/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Impressum</a>. Daten von <a href="https://api.swu.de/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">SWU-API</a>
      </footer>

      <StopDetailsModal
        activeStopData={activeStopData}
        setActiveStopData={setActiveStopData}
        routeIcons={routeIcons}
      />
    </div>
  );
};

export default App;
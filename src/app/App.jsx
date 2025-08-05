// src/app/App.jsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import loadRouteIcon from '../utils/loadRouteIcon';
import fetchAndDrawRoutePattern from '../utils/fetchAndDrawRoutePattern';
import { loadGoogleMapsApi, initializeMap, createStopMarker, createVehicleMarker } from '../utils/googleMapsUtils';
import { fetchStopData, fetchDeparturesData, fetchAllVehiclePositions } from '../services/swuService';
import StopDetailsModal from '../components/StopDetailsModal';
import DestinationFinder from '../components/DestinationFinder';

// Map Component (extracted from main App)
const MapView = ({ apikeys }) => {
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
  const [showStops, setShowStops] = useState(true);

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
    loadGoogleMapsApi(Maps_API_KEY, setIsApiLoaded, setError, setIsLoading);
  }, [Maps_API_KEY]);

  // Effect to initialize the map and fetch initial data
  useEffect(() => {
    if (isApiLoaded && mapRef.current && !googleMapRef.current) {
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
  }, [isApiLoaded, GOOGLE_MAP_ID]);

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
    <>
      {/* Floating Error/Status Cards */}
      {(error || (stopsData.length === 0 && !isLoading && !error && vehiclesData.length === 0)) && (
        <div className="absolute top-16 left-4 right-4 z-30 max-w-md mx-auto">
          {error && (
            <div className="bg-red-500/90 backdrop-blur-xl rounded-3xl p-4 border border-red-400/30 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-400/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Verbindungsfehler</h3>
                  <p className="text-red-100 text-sm leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && stopsData.length === 0 && vehiclesData.length === 0 && !error && (
            <div className="bg-amber-500/90 backdrop-blur-xl rounded-3xl p-4 border border-amber-400/30 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-400/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Keine Daten</h3>
                  <p className="text-amber-100 text-sm leading-relaxed">Warten auf Live-Daten...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map Container with Floating Controls */}
      <main className="flex-1 relative overflow-hidden">
        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ minHeight: '400px' }}
          aria-label="Google Maps Karte mit ÖPNV Haltestellen und Fahrzeugen"
        />
        
        {/* Floating Map Controls */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
          {/* Live Indicator */}
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl px-3 py-2 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <span className="text-white font-medium text-sm">Live</span>
            </div>
          </div>
        </div>

        {/* Navigation to Route Planner */}
        <div className="absolute top-4 right-4 z-10">
          <Link 
            to="/route-planner"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-2xl font-medium transition-all duration-300 shadow-lg backdrop-blur-sm border border-white/20"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Route Planner
            </div>
          </Link>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-indigo-900/95 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <div className="absolute inset-2 w-8 h-8 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animate-reverse"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-1">Karte wird geladen</h3>
                  <p className="text-white/70 text-sm">Verbindung zu Live-Daten...</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <StopDetailsModal
        activeStopData={activeStopData}
        setActiveStopData={setActiveStopData}
        routeIcons={routeIcons}
      />

      {/* Toggle Button in Header Controls */}
      <div className="absolute top-20 right-4 z-10">
        <button
          onClick={() => setShowStops(prev => !prev)}
          className={`relative group px-3 py-2 sm:px-4 sm:py-3 rounded-2xl font-medium text-sm transition-all duration-300 border backdrop-blur-sm shadow-lg
            ${showStops 
              ? 'bg-white/20 border-white/30 text-white' 
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${showStops ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="hidden sm:inline">Haltestellen</span>
            <span className="sm:hidden">Stops</span>
          </div>
        </button>
      </div>
    </>
  );
};

// Navigation Header Component
const AppHeader = () => {
  const location = useLocation();
  const isRoutePlanner = location.pathname === '/route-planner';

  return (
    <header className="relative z-20">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-xl"></div>
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
                <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse sm:w-4 sm:h-4"></div>
            </div>
            
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Ulmiversität
              </h1>
              <p className="text-white/70 text-sm font-medium tracking-wide">
                {isRoutePlanner ? 'Route Planner' : 'Live Transit Map'}
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`px-4 py-2 rounded-2xl font-medium text-sm transition-all duration-300 border backdrop-blur-sm shadow-lg ${
                !isRoutePlanner
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="hidden sm:inline">Live Map</span>
              </div>
            </Link>

            <Link
              to="/route-planner"
              className={`px-4 py-2 rounded-2xl font-medium text-sm transition-all duration-300 border backdrop-blur-sm shadow-lg ${
                isRoutePlanner
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="hidden sm:inline">Route Planner</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

// Main App Component with Router
const App = ({ apikeys }) => {
  return (
    <Router>
      <div className="h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 font-inter text-white flex flex-col overflow-hidden relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <AppHeader />

        <Routes>
          <Route path="/" element={<MapView apikeys={apikeys} />} />
          <Route path="/route-planner" element={<DestinationFinder />} />
        </Routes>

        {/* Futuristic Footer */}
        <footer className="relative z-20 bg-black/40 backdrop-blur-xl border-t border-white/10">
          <div className="px-4 py-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-white/90 font-medium">Ulmiversität Transit</span>
                </div>
                <div className="px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-400/30">
                  <span className="text-blue-300 font-medium text-xs">BETA</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-white/70">
                <a 
                  href="https://ulmiversitaet.de/impressum/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors duration-200 hover:underline"
                >
                  Impressum
                </a>
                <div className="flex items-center gap-1">
                  <span>Powered by</span>
                  <a 
                    href="https://api.swu.de/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
                  >
                    SWU API
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
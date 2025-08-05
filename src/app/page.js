// src/app/page.jsx
'use client'; // This component uses hooks and client-side interactions

import React, { useEffect, useState, useRef } from 'react';
import loadRouteIcon from '../utils/loadRouteIcon';
// fetchAndDrawRoutePattern is likely not needed in this component directly
// it seems more like a utility called by vehicle markers or route results
// import fetchAndDrawRoutePattern from '../utils/fetchAndDrawRoutePattern';
import { loadGoogleMapsApi, initializeMap, createStopMarker, createVehicleMarker } from '../utils/googleMapsUtils';
import { fetchStopData, fetchDeparturesData, fetchAllVehiclePositions } from '../services/swuService';
import StopDetailsModal from '../components/StopDetailsModal';
// DestinationFinder is a separate page, not rendered here directly

// Access API keys from process.env (Next.js handles this)
const apikeys = {
  MAPS_API_KEY: process.env.NEXT_PUBLIC_MAPS_API_KEY,
  MAP_ID: process.env.NEXT_PUBLIC_MAP_ID,
};

const Maps_API_KEY = apikeys.MAPS_API_KEY;
const GOOGLE_MAP_ID = apikeys.MAP_ID;

export default function HomePage() {
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
    if (!Maps_API_KEY || !GOOGLE_MAP_ID) {
      setError("Google Maps API keys are not configured. Please check environment variables.");
      setIsLoading(false);
      return;
    }
    loadGoogleMapsApi(Maps_API_KEY, setIsApiLoaded, setError, setIsLoading);
  }, [Maps_API_KEY, GOOGLE_MAP_ID]);

  // Effect to initialize the map and fetch initial data
  useEffect(() => {
    if (isApiLoaded && mapRef.current && !googleMapRef.current) {
      initializeMap(mapRef, googleMapRef, activeInfoWindowRef, GOOGLE_MAP_ID);

      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // Fetch initial data
          const [stops, vehicles] = await Promise.all([
            fetchStopData(),
            fetchAllVehiclePositions()
          ]);
          setStopsData(stops);
          setVehiclesData(vehicles);
        } catch (err) {
          setError(err.message || 'Ein Fehler ist aufgetreten.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
      // Set up interval for vehicle positions
      const vehicleIntervalId = setInterval(() => {
        fetchAllVehiclePositions()
          .then(setVehiclesData)
          .catch(err => console.error("Error fetching vehicles in interval:", err));
      }, 15000);
      return () => clearInterval(vehicleIntervalId); // Cleanup on unmount
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
  }, [vehiclesData, isLoading]); // Removed isLoading from deps as it doesn't directly affect marker *creation* logic after initial load.

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

        {/* This link is now handled by the AppHeader, or could be kept here if specific to the map page */}
        {/* <div className="absolute top-4 right-4 z-10">
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
        </div> */}

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

      {/* Toggle Button in Header Controls (adjust position, maybe relative to map container) */}
      <div className="absolute top-20 right-4 z-10"> {/* Adjust this position based on final layout */}
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
}
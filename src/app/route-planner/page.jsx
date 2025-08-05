// src/app/route-planner/page.jsx
'use client'; // This component uses hooks and client-side interactions

import React, { useState, useEffect, useCallback } from 'react';
import { searchStops, getRouteConnections } from '../../api/DestinationFinderAPI'; // Adjust path
import { findOptimalRoute } from '../../utils/AStarAlgorithm'; // Adjust path
import RouteResult from '../../components/RouteResult'; // Adjust path
import '../../components/DestinationFinder.css'; // Adjust path

export default function DestinationFinderPage() {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [selectedStart, setSelectedStart] = useState(null); // Full stop object
  const [selectedEnd, setSelectedEnd] = useState(null); // Full stop object
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Memoized search function for debouncing
  const doSearch = useCallback(
    async (q, setSuggestions, setSelectedStop) => {
      if ((q || '').trim().length < 3) {
        setSuggestions([]);
        setSelectedStop(null); // Deselect if query becomes too short
        return;
      }
      try {
        const res = await searchStops(q);
        setSuggestions(res);
        // If the query exactly matches a suggestion, auto-select it
        if (res.length === 1 && res[0].name.toLowerCase() === q.toLowerCase()) {
          setSelectedStop(res[0]);
        }
      } catch (e) {
        console.error('Search failed:', e);
        setSuggestions([]);
        setErr('Fehler beim Suchen von Haltestellen.');
      }
    },
    [],
  );

  // Debounce effect for start location input
  useEffect(() => {
    setErr(null); // Clear errors on input change
    setSelectedStart(null); // Clear selected start until a valid one is chosen
    const timer = setTimeout(
      () => doSearch(startLocation, setStartSuggestions, setSelectedStart),
      250,
    );
    return () => clearTimeout(timer);
  }, [startLocation, doSearch]);

  // Debounce effect for end location input
  useEffect(() => {
    setErr(null); // Clear errors on input change
    setSelectedEnd(null); // Clear selected end until a valid one is chosen
    const timer = setTimeout(
      () => doSearch(endLocation, setEndSuggestions, setSelectedEnd),
      250,
    );
    return () => clearTimeout(timer);
  }, [endLocation, doSearch]);

  const handleStartSelect = (s) => {
    setSelectedStart(s);
    setStartLocation(s.name);
    setStartSuggestions([]); // Clear suggestions after selection
  };

  const handleEndSelect = (s) => {
    setSelectedEnd(s);
    setEndLocation(s.name);
    setEndSuggestions([]); // Clear suggestions after selection
  };

  // In src/app/route-planner/page.jsx

const handleSearch = async () => {
  setErr(null);
  setRoutes([]);
  if (!selectedStart || !selectedEnd) {
    setErr("Please select both a start and end location from the suggestions.");
    return;
  }

  if (selectedStart.id === selectedEnd.id) {
    setErr("Start and end locations cannot be the same.");
    return;
  }

  try {
    setLoading(true);
    console.log("DF: Starting route calculation...");
    const connections = await getRouteConnections();
    console.log("DF: Retrieved connections for A* =", connections.length);

    // Define the start time to pass to the algorithm
    const startTime = new Date();

    // --- THE FIX IS HERE: Added 'await' and 'startTime' ---
    const optimal = await findOptimalRoute(
      selectedStart,
      selectedEnd,
      connections,
      startTime,
    );
    // ----------------------------------------------------

    console.log("DF: Received optimal routes from A*:", optimal); // New log to confirm

    if (!optimal || optimal.length === 0) {
      setErr(
        "No route found. (No suitable departures/arrivals found soon or data issues)",
      );
      setRoutes([]); // Ensure routes is an empty array
    } else {
      // The result from A* should already be in the correct format.
      // If you still need normalization, you can do it here, but let's
      // trust the output of the algorithm first.
      setRoutes(optimal);
    }
  } catch (e) {
    console.error("Route search error:", e);
    setErr(e.message || "Error calculating the route.");
    setRoutes([]); // Ensure routes is an empty array on error
  } finally {
    setLoading(false);
  }
};

  const swapLocations = () => {
    // Swap display names
    const tempLocation = startLocation;
    setStartLocation(endLocation);
    setEndLocation(tempLocation);

    // Swap selected stop objects
    const tempSelected = selectedStart;
    setSelectedStart(selectedEnd);
    setSelectedEnd(tempSelected);

    // Clear suggestions after swap as input fields change
    setStartSuggestions([]);
    setEndSuggestions([]);
  };

  return (
    <div className="destination-finder flex-1 overflow-auto p-4 sm:p-6 lg:p-8"> {/* Added flex-1 and padding */}
      <div className="destination-finder__header mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2">Route Planner</h1>
        <p className="text-lg text-white/80">Find the best public transport connections</p>
      </div>

      <div className="destination-finder__form bg-white/5 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl max-w-2xl mx-auto">
        <div className="location-input-group flex flex-col gap-4 mb-6">
          <div className="location-input relative">
            <label htmlFor="start-input" className="block text-white/70 text-sm font-medium mb-1">From</label>
            <input
              id="start-input"
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              placeholder="Enter start location..."
              className={`location-input__field w-full px-4 py-3 rounded-xl bg-white/10 text-white border ${
                selectedStart && startLocation === selectedStart.name
                  ? 'border-green-400'
                  : 'border-white/20 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200`}
            />
            {startSuggestions.length > 0 && (
              <ul className="suggestions-list absolute z-10 bg-gray-800 border border-gray-700 rounded-xl mt-1 w-full max-h-60 overflow-y-auto shadow-lg">
                {startSuggestions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => handleStartSelect(s)}
                    className="suggestions-list__item px-4 py-3 cursor-pointer text-white hover:bg-blue-600/30 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <strong>{s.name}</strong>
                    <span className="stop-info text-white/70 text-sm ml-2">{s.city}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className="swap-button self-center bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors duration-200"
            onClick={swapLocations}
            aria-label="Swap start and end locations"
            title="Swap locations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          <div className="location-input relative">
            <label htmlFor="end-input" className="block text-white/70 text-sm font-medium mb-1">To</label>
            <input
              id="end-input"
              type="text"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
              placeholder="Enter destination..."
              className={`location-input__field w-full px-4 py-3 rounded-xl bg-white/10 text-white border ${
                selectedEnd && endLocation === selectedEnd.name
                  ? 'border-green-400'
                  : 'border-white/20 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200`}
            />
            {endSuggestions.length > 0 && (
              <ul className="suggestions-list absolute z-10 bg-gray-800 border border-gray-700 rounded-xl mt-1 w-full max-h-60 overflow-y-auto shadow-lg">
                {endSuggestions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => handleEndSelect(s)}
                    className="suggestions-list__item px-4 py-3 cursor-pointer text-white hover:bg-blue-600/30 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <strong>{s.name}</strong>
                    <span className="stop-info text-white/70 text-sm ml-2">{s.city}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          className="search-button w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold py-3 rounded-2xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSearch}
          disabled={loading || !selectedStart || !selectedEnd}
        >
          {loading ? 'Searching...' : 'Find Routes'}
        </button>
      </div>

      {err && <div className="error-message bg-red-600/30 text-red-100 p-4 rounded-xl mt-6 text-center max-w-2xl mx-auto">{err}</div>}

      {routes.length > 0 && (
        <div className="results-section mt-8 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Route Options</h2>
          <div className="flex flex-col gap-4">
            {routes.map((r, i) => (
              // Ensure route has a unique ID, otherwise fallback to index
              <RouteResult key={r.id || `route-${i}`} route={r} />
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-spinner flex flex-col items-center justify-center mt-8 p-6 bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 shadow-2xl max-w-sm mx-auto">
          <div className="spinner w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white text-lg">Finding best routes...</p>
        </div>
      )}
    </div>
  );
}
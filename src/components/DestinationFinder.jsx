// src/components/DestinationFinder.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { searchStops, getRouteConnections } from '../api/DestinationFinderAPI'; // Updated API functions
import { findOptimalRoute } from '../utils/AStarAlgorithm';
import RouteResult from './RouteResult';
import '../components/DestinationFinder.css'; // Assuming you have this CSS file

const DestinationFinder = () => {
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

  const handleSearch = async () => {
    setErr(null);
    setRoutes([]); // Clear previous routes
    if (!selectedStart || !selectedEnd) {
      setErr('Please select both a start and end location from the suggestions.');
      return;
    }

    if (selectedStart.id === selectedEnd.id) {
      setErr('Start and end locations cannot be the same.');
      return;
    }

    try {
      setLoading(true);
      console.log('DF: Starting route calculation...');
      // getRouteConnections will internally call fetchAllStopsAndStopPointsBaseData
      const connections = await getRouteConnections();
      console.log('DF: Retrieved connections for A* =', connections.length);

      const optimal = findOptimalRoute(selectedStart, selectedEnd, connections);

      if (optimal.length === 0) {
        setErr(
          'No route found. (Perhaps no continuous pattern between stops or data issues)',
        );
      }
      setRoutes(optimal);
    } catch (e) {
      console.error('Route search error:', e);
      setErr(e.message || 'Error calculating the route.');
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
    <div className="destination-finder">
      <div className="destination-finder__header">
        <h1>Route Planner</h1>
        <p>Find the best public transport connections</p>
      </div>

      <div className="destination-finder__form">
        <div className="location-input-group">
          <div className="location-input">
            <label htmlFor="start-input">From</label>
            <input
              id="start-input"
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              placeholder="Enter start location..."
              className="location-input__field"
              // Visually indicate if a valid stop is selected
              style={
                selectedStart && startLocation === selectedStart.name
                  ? { borderColor: 'green' }
                  : {}
              }
            />
            {startSuggestions.length > 0 && (
              <ul className="suggestions-list">
                {startSuggestions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => handleStartSelect(s)}
                    className="suggestions-list__item"
                  >
                    <strong>{s.name}</strong>
                    <span className="stop-info">{s.city}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className="swap-button"
            onClick={swapLocations}
            aria-label="Swap start and end locations"
            title="Swap locations"
          >
            ⇅
          </button>

          <div className="location-input">
            <label htmlFor="end-input">To</label>
            <input
              id="end-input"
              type="text"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
              placeholder="Enter destination..."
              className="location-input__field"
              // Visually indicate if a valid stop is selected
              style={
                selectedEnd && endLocation === selectedEnd.name
                  ? { borderColor: 'green' }
                  : {}
              }
            />
            {endSuggestions.length > 0 && (
              <ul className="suggestions-list">
                {endSuggestions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => handleEndSelect(s)}
                    className="suggestions-list__item"
                  >
                    <strong>{s.name}</strong>
                    <span className="stop-info">{s.city}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          className="search-button"
          onClick={handleSearch}
          disabled={loading || !selectedStart || !selectedEnd}
        >
          {loading ? 'Searching...' : 'Find Routes'}
        </button>
      </div>

      {err && <div className="error-message">{err}</div>}

      {routes.length > 0 && (
        <div className="results-section">
          <h2>Route Options</h2>
          {routes.map((r, i) => (
            <RouteResult key={r.id || i} route={r} />
          ))}
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Finding best routes...</p>
        </div>
      )}
    </div>
  );
};

export default DestinationFinder;
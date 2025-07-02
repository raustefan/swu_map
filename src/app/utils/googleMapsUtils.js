// src/utils/googleMapsUtils.js
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../config/mapConfig';
import { createElementFromHTML } from '../../../lib/utils';
import fetchAndDrawRoutePattern from './fetchAndDrawRoutePattern'; // <--- NEW IMPORT HERE

export function loadGoogleMapsApi(Maps_API_KEY, setIsApiLoaded, setError, setIsLoading) {
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
}

export function initializeMap(mapRef, googleMapRef, activeInfoWindowRef, GOOGLE_MAP_ID) {
  if (mapRef.current && !googleMapRef.current) {
    const map = new window.google.maps.Map(mapRef.current, {
      center: INITIAL_MAP_CENTER,
      zoom: INITIAL_MAP_ZOOM,
      mapId: GOOGLE_MAP_ID,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });

    map.addListener('click', () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
    });
    googleMapRef.current = map;
  }
}

export function createStopMarker(stop, map, onClickHandler) {
  const marker = new window.google.maps.Marker({
    position: { lat: stop.latitude, lng: stop.longitude },
    map: map,
    title: `${stop.name} (Steig: ${stop.platform || 'N/A'})`,
    icon: {
      url: '/icons/stop_point.svg',
      scaledSize: new window.google.maps.Size(12, 12),
    },
  });
  marker.addListener('click', onClickHandler);
  return marker;
}

// Updated signature to accept activeRoutePolylineRef and googleMapRef
export function createVehicleMarker(
  vehicle,
  map,
  iconUrl,
  activeInfoWindowRef,
  activeRoutePolylineRef, // <--- NEW PARAMETER
  googleMapRef // <--- NEW PARAMETER
) {
  const position = { lat: vehicle.latitude, lng: vehicle.longitude };

  const marker = new window.google.maps.Marker({
    position,
    map: map,
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
        fetchAndDrawRoutePattern(vehicle.id, activeRoutePolylineRef, googleMapRef);
    infoWindow.open({ anchor: marker, map: map, shouldFocus: false });
    activeInfoWindowRef.current = infoWindow;
    // <--- MOVED THIS CALL HERE

  });
  return marker;
}
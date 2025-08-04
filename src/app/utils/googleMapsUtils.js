// src/utils/googleMapsUtils.js
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../config/mapConfig';
import { createElementFromHTML } from '../../../lib/utils';
import fetchAndDrawRoutePattern from './fetchAndDrawRoutePattern';

export function loadGoogleMapsApi(Maps_API_KEY, setIsApiLoaded, setError, setIsLoading) {
  if (window.google) {
    setIsApiLoaded(true);
    setIsLoading(false);
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&libraries=maps,geometry&v=weekly`;
  script.async = true;
  script.defer = true;
  
  script.onload = () => {
    console.log('✅ Google Maps API loaded successfully');
    setIsApiLoaded(true);
    setIsLoading(false);
  };
  
  script.onerror = (error) => {
    console.error('❌ Google Maps API loading failed:', error);
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
      
      // Enhanced UI controls
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      
      // Modern styling options
      gestureHandling: 'greedy',
      backgroundColor: '#1e293b',
      
      // Enhanced zoom and pan controls
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
        style: window.google.maps.ZoomControlStyle.SMALL
      },
      
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      
      // Restrict bounds to reasonable area (optional)
      restriction: {
        latLngBounds: {
          north: 49.0,
          south: 47.0,
          west: 9.0,
          east: 11.0,
        },
        strictBounds: false,
      },
    });

    // Enhanced click handler with smooth animations
    map.addListener('click', () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
    });

    // Add custom map styles for better visibility
    map.addListener('tilesloaded', () => {
      console.log('🗺️ Map tiles loaded successfully');
    });

    googleMapRef.current = map;
  }
}

export function createStopMarker(stop, map, onClickHandler) {
  // Enhanced stop marker with custom styling
  const marker = new window.google.maps.Marker({
    position: { lat: stop.latitude, lng: stop.longitude },
    map: map,
    title: `${stop.name}${stop.platform ? ` (Steig: ${stop.platform})` : ''}`,
    icon: {
      url: '/icons/stop_point.svg',
      scaledSize: new window.google.maps.Size(16, 16),
      anchor: new window.google.maps.Point(8, 8),
    },
    animation: window.google.maps.Animation.DROP,
    optimized: true,
  });

  // Enhanced click handler with loading state
  marker.addListener('click', async () => {
    try {
      // Add subtle bounce animation
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => marker.setAnimation(null), 700);
      
      await onClickHandler();
    } catch (error) {
      console.error('Error handling stop click:', error);
    }
  });

  // Add hover effects
  marker.addListener('mouseover', () => {
    marker.setIcon({
      url: '/icons/stop_point.svg',
      scaledSize: new window.google.maps.Size(20, 20),
      anchor: new window.google.maps.Point(10, 10),
    });
  });

  marker.addListener('mouseout', () => {
    marker.setIcon({
      url: '/icons/stop_point.svg',
      scaledSize: new window.google.maps.Size(16, 16),
      anchor: new window.google.maps.Point(8, 8),
    });
  });

  return marker;
}

export function createVehicleMarker(
  vehicle,
  map,
  iconUrl,
  activeInfoWindowRef,
  activeRoutePolylineRef,
  googleMapRef
) {
  const position = { lat: vehicle.latitude, lng: vehicle.longitude };

  // Enhanced vehicle marker with rotation based on heading
  const marker = new window.google.maps.Marker({
    position,
    map: map,
    title: `Fahrzeug ${vehicle.id} - Linie ${vehicle.routeNumber || 'N/A'}`,
    icon: {
      url: iconUrl,
      scaledSize: new window.google.maps.Size(24, 24),
      anchor: new window.google.maps.Point(12, 12),
      // Add rotation if heading is available
      ...(vehicle.heading && {
        rotation: vehicle.heading
      })
    },
    zIndex: 1000,
    optimized: false, // Better for animations
  });

  // Enhanced delay calculation and formatting
  const formatDelay = (deviation) => {
    if (!deviation) return { text: 'Pünktlich', color: '#10b981', icon: '🟢' };
    
    const absDeviation = Math.abs(deviation);
    const minutes = Math.floor(absDeviation / 60);
    const seconds = absDeviation % 60;
    
    if (deviation < 0) {
      return {
        text: `+${minutes}:${seconds.toString().padStart(2, '0')} Verspätung`,
        color: '#ef4444',
        icon: '🔴'
      };
    } else {
      return {
        text: `-${minutes}:${seconds.toString().padStart(2, '0')} zu früh`,
        color: '#3b82f6',
        icon: '🔵'
      };
    }
  };

  const delayInfo = formatDelay(vehicle.deviation);

  // Create modern, styled info window
  const createInfoWindowContent = () => {
    return `
      <div style="
        min-width: 280px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-radius: 16px;
        padding: 0;
        margin: -8px;
        color: white;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      ">
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          padding: 16px;
          border-radius: 16px 16px 0 0;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <img src="${iconUrl}" alt="Linie ${vehicle.routeNumber}" 
               style="width: 32px; height: 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
          <div>
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 2px;">
              Linie ${vehicle.routeNumber || 'N/A'}
            </div>
            <div style="font-size: 12px; opacity: 0.9;">
              Fahrzeug ${vehicle.id}
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 16px;">
          <div style="margin-bottom: 12px;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #e2e8f0;">
              🎯 ${vehicle.directionText || 'Unbekannte Richtung'}
            </div>
          </div>
          
          <div style="
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(10px);
          ">
            <span style="font-size: 16px;">${delayInfo.icon}</span>
            <div>
              <div style="font-size: 13px; font-weight: 600; color: ${delayInfo.color};">
                ${delayInfo.text}
              </div>
              <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">
                Live-Status
              </div>
            </div>
          </div>
          
          ${vehicle.nextStop ? `
            <div style="
              margin-top: 12px;
              padding: 8px 12px;
              background: rgba(59, 130, 246, 0.1);
              border-radius: 8px;
              border-left: 3px solid #3b82f6;
            ">
              <div style="font-size: 11px; opacity: 0.8; margin-bottom: 2px;">NÄCHSTE HALTESTELLE</div>
              <div style="font-size: 12px; font-weight: 500;">${vehicle.nextStop}</div>
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 0 0 16px 16px;
          font-size: 10px;
          opacity: 0.7;
          text-align: center;
        ">
          Klicken Sie auf die Karte, um die Route anzuzeigen
        </div>
      </div>
    `;
  };

  const infoWindow = new window.google.maps.InfoWindow({
    content: createInfoWindowContent(),
    pixelOffset: new window.google.maps.Size(0, -10),
    disableAutoPan: false,
    maxWidth: 320,
  });

  // Enhanced click handler with smooth animations
  marker.addListener('click', async () => {
    try {
      // Close any existing info windows
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
      }

      // Add click animation
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => marker.setAnimation(null), 1400);

      // Fetch and draw route pattern
      await fetchAndDrawRoutePattern(vehicle.id, activeRoutePolylineRef, googleMapRef);
      
      // Open info window
      infoWindow.open({
        anchor: marker,
        map: map,
        shouldFocus: false
      });
      
      activeInfoWindowRef.current = infoWindow;
      
      // Smooth pan to marker
      map.panTo(position);
      
    } catch (error) {
      console.error('Error handling vehicle marker click:', error);
      
      // Show error in info window
      const errorInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; color: #ef4444; font-family: Inter, sans-serif;">
            <strong>⚠️ Fehler</strong><br>
            Route konnte nicht geladen werden.
          </div>
        `,
      });
      
      errorInfoWindow.open({ anchor: marker, map: map });
      activeInfoWindowRef.current = errorInfoWindow;
    }
  });

  // Add hover effects for better UX
  marker.addListener('mouseover', () => {
    marker.setIcon({
      url: iconUrl,
      scaledSize: new window.google.maps.Size(28, 28),
      anchor: new window.google.maps.Point(14, 14),
      ...(vehicle.heading && { rotation: vehicle.heading })
    });
  });

  marker.addListener('mouseout', () => {
    marker.setIcon({
      url: iconUrl,
      scaledSize: new window.google.maps.Size(24, 24),
      anchor: new window.google.maps.Point(12, 12),
      ...(vehicle.heading && { rotation: vehicle.heading })
    });
  });

  return marker;
}

// Utility function to create custom map controls
export function createCustomControl(map, position, content, onClick) {
  const controlDiv = document.createElement('div');
  controlDiv.style.cssText = `
    background: rgba(30, 41, 59, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    margin: 8px;
    padding: 12px 16px;
    color: white;
    font-family: Inter, sans-serif;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  `;
  
  controlDiv.innerHTML = content;
  
  controlDiv.addEventListener('click', onClick);
  controlDiv.addEventListener('mouseenter', () => {
    controlDiv.style.background = 'rgba(30, 41, 59, 1)';
    controlDiv.style.transform = 'translateY(-1px)';
  });
  controlDiv.addEventListener('mouseleave', () => {
    controlDiv.style.background = 'rgba(30, 41, 59, 0.95)';
    controlDiv.style.transform = 'translateY(0)';
  });
  
  map.controls[position].push(controlDiv);
  return controlDiv;
}

// Enhanced error handling utility
export function handleMapError(error, setError) {
  console.error('Map Error:', error);
  
  const errorMessages = {
    'ZERO_RESULTS': 'Keine Ergebnisse gefunden.',
    'OVER_QUERY_LIMIT': 'API-Limit erreicht. Bitte versuchen Sie es später erneut.',
    'REQUEST_DENIED': 'Anfrage verweigert. Überprüfen Sie Ihren API-Schlüssel.',
    'INVALID_REQUEST': 'Ungültige Anfrage.',
    'UNKNOWN_ERROR': 'Ein unbekannter Fehler ist aufgetreten.',
  };
  
  const message = errorMessages[error.code] || error.message || 'Ein Fehler ist aufgetreten.';
  setError(message);
}

// Utility for smooth marker animations
export function animateMarkerMovement(marker, newPosition, duration = 1000) {
  const startPosition = marker.getPosition();
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth animation
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    const easedProgress = easeInOutCubic(progress);
    
    const lat = startPosition.lat() + (newPosition.lat - startPosition.lat()) * easedProgress;
    const lng = startPosition.lng() + (newPosition.lng - startPosition.lng()) * easedProgress;
    
    marker.setPosition({ lat, lng });
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  animate();
}
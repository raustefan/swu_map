// src/utils/googleMapsUtils.js
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../config/mapConfig';
import { createElementFromHTML } from '../../lib/utils';
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
        activeInfoWindowRef.current.hide();
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

// Custom InfoWindow class with modern UI
class CustomInfoWindow {
  constructor(options = {}) {
    this.position = options.position;
    this.content = options.content;
    this.map = null;
    this.div = null;
    this.visible = false;
    this.offset = options.offset || { x: 0, y: -40 };
    this.className = options.className || 'custom-info-window';
    this.onClose = options.onClose || (() => {});
  }

  setContent(content) {
    this.content = content;
    if (this.div) {
      this.div.innerHTML = this.createContent();
    }
  }

  setPosition(position) {
    this.position = position;
    if (this.visible) {
      this.updatePosition();
    }
  }

  createContent() {
    return `
      <div class="custom-info-window-container">
        <div class="custom-info-window-content">
          ${this.content}
        </div>
        <button class="custom-info-window-close" onclick="this.parentElement.parentElement.style.display='none'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="custom-info-window-arrow"></div>
      </div>
    `;
  }

  show(map, position) {
    this.map = map;
    if (position) this.position = position;
    
    if (!this.div) {
      this.div = document.createElement('div');
      this.div.className = this.className;
      this.div.innerHTML = this.createContent();
      
      // Add close button functionality
      const closeBtn = this.div.querySelector('.custom-info-window-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        this.onClose();
      });
      
      // Add to map
      this.map.getDiv().appendChild(this.div);
    }

    this.updatePosition();
    this.div.style.display = 'block';
    this.visible = true;

    // Animate in
    requestAnimationFrame(() => {
      this.div.classList.add('visible');
    });

    // Update position on map changes
    this.mapListeners = [
      this.map.addListener('bounds_changed', () => this.updatePosition()),
      this.map.addListener('zoom_changed', () => this.updatePosition()),
    ];
  }

  hide() {
    if (this.div) {
      this.div.classList.remove('visible');
      setTimeout(() => {
        if (this.div) {
          this.div.style.display = 'none';
        }
      }, 200);
    }
    this.visible = false;

    // Remove listeners
    if (this.mapListeners) {
      this.mapListeners.forEach(listener => {
        window.google.maps.event.removeListener(listener);
      });
      this.mapListeners = null;
    }
  }

  updatePosition() {
    if (!this.div || !this.map || !this.position) return;

    const projection = this.map.getProjection();
    if (!projection) return;

    const point = projection.fromLatLngToPoint(this.position);
    const scale = Math.pow(2, this.map.getZoom());
    const pixelPosition = new window.google.maps.Point(
      point.x * scale,
      point.y * scale
    );

    const mapDiv = this.map.getDiv();
    const mapRect = mapDiv.getBoundingClientRect();
    const mapCenter = projection.fromLatLngToPoint(this.map.getCenter());
    const mapCenterPixel = new window.google.maps.Point(
      mapCenter.x * scale,
      mapCenter.y * scale
    );

    const x = (pixelPosition.x - mapCenterPixel.x) + (mapRect.width / 2) + this.offset.x;
    const y = (pixelPosition.y - mapCenterPixel.y) + (mapRect.height / 2) + this.offset.y;

    this.div.style.left = `${x}px`;
    this.div.style.top = `${y}px`;
  }

  destroy() {
    this.hide();
    if (this.div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
    }
    this.div = null;
    this.map = null;
  }
}

// Add CSS styles for custom info window
function injectCustomInfoWindowStyles() {
  if (document.getElementById('custom-info-window-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'custom-info-window-styles';
  styles.textContent = `
    .custom-info-window {
      position: absolute;
      z-index: 1000;
      pointer-events: none;
      transform: translate(-50%, -100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15));
    }

    .custom-info-window.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .custom-info-window-container {
      position: relative;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      min-width: 280px;
      max-width: 320px;
      overflow: hidden;
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.3),
        0 10px 10px -5px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .custom-info-window-content {
      color: white;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    .custom-info-window-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10;
    }

    .custom-info-window-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      transform: scale(1.05);
    }

    .custom-info-window-arrow {
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      height: 16px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-top: none;
      border-left: none;
      transform: translateX(-50%) rotate(45deg);
      backdrop-filter: blur(20px);
    }

    .info-header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }

    .info-header img {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .info-title {
      font-weight: 700;
      font-size: 16px;
      margin-bottom: 2px;
    }

    .info-subtitle {
      font-size: 12px;
      opacity: 0.9;
    }

    .info-body {
      padding: 16px;
    }

    .info-direction {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #e2e8f0;
    }

    .info-status {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      margin-bottom: 12px;
    }

    .info-status-icon {
      font-size: 16px;
    }

    .info-status-text {
      font-size: 13px;
      font-weight: 600;
    }

    .info-status-subtext {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 2px;
    }

    .info-next-stop {
      padding: 8px 12px;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 8px;
      border-left: 3px solid #3b82f6;
    }

    .info-next-stop-label {
      font-size: 11px;
      opacity: 0.8;
      margin-bottom: 2px;
      font-weight: 500;
    }

    .info-next-stop-name {
      font-size: 12px;
      font-weight: 500;
    }

    .info-footer {
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      font-size: 10px;
      opacity: 0.7;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .info-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(59, 130, 246, 0.1);
      border-top: 1px solid rgba(59, 130, 246, 0.2);
    }

    .info-loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .info-error {
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.1);
      border-top: 1px solid rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pulse-animation {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;
  
  document.head.appendChild(styles);
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
  // Inject styles on first use
  injectCustomInfoWindowStyles();

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

  // Create modern, styled info window content
  const createInfoWindowContent = () => {
    return `
      <div class="info-header">
        <img src="${iconUrl}" alt="Linie ${vehicle.routeNumber}" />
        <div>
          <div class="info-title">Linie ${vehicle.routeNumber || 'N/A'}</div>
          <div class="info-subtitle">Fahrzeug ${vehicle.id}</div>
        </div>
      </div>
      
      <div class="info-body">
        <div class="info-direction">
          🎯 ${vehicle.directionText || 'Unbekannte Richtung'}
        </div>
        
        <div class="info-status">
          <span class="info-status-icon">${delayInfo.icon}</span>
          <div>
            <div class="info-status-text" style="color: ${delayInfo.color};">
              ${delayInfo.text}
            </div>
            <div class="info-status-subtext">Live-Status</div>
          </div>
        </div>
        
        ${vehicle.nextStop ? `
          <div class="info-next-stop">
            <div class="info-next-stop-label">NÄCHSTE HALTESTELLE</div>
            <div class="info-next-stop-name">${vehicle.nextStop}</div>
          </div>
        ` : ''}
      </div>
      
    `;
  };

  // Create custom info window
  const customInfoWindow = new CustomInfoWindow({
    content: createInfoWindowContent(),
    position: position,
    offset: { x: 0, y: -50 },
    onClose: () => {
      activeInfoWindowRef.current = null;
    }
  });

  // Enhanced click handler with smooth animations and loading states
  marker.addListener('click', async () => {
    try {
      // Close any existing info windows
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.hide();
      }

      // Add click animation
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => marker.setAnimation(null), 1400);

      // Show info window with loading state
      customInfoWindow.setContent(`
        ${createInfoWindowContent()}
        <div class="info-loading">
          <div class="info-loading-spinner"></div>
          <span>Route wird geladen...</span>
        </div>
      `);
      
      customInfoWindow.show(map, position);
      activeInfoWindowRef.current = customInfoWindow;
      
      // Smooth pan to marker
      map.panTo(position);
      
      try {
        // Fetch and draw route pattern
        await fetchAndDrawRoutePattern(vehicle.id, activeRoutePolylineRef, googleMapRef);
        
        // Update content to remove loading state
        customInfoWindow.setContent(createInfoWindowContent());
        
      } catch (routeError) {
        console.error('Error loading route:', routeError);
        
        // Show error state
        customInfoWindow.setContent(`
          ${createInfoWindowContent()}
          <div class="info-error">
            <span>⚠️</span>
            <span>Route konnte nicht geladen werden</span>
          </div>
        `);
      }
      
    } catch (error) {
      console.error('Error handling vehicle marker click:', error);
      
      // Show error info window
      const errorContent = `
        <div class="info-header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          <div>
            <div class="info-title">⚠️ Fehler</div>
            <div class="info-subtitle">Daten konnten nicht geladen werden</div>
          </div>
        </div>
        <div class="info-body">
          <div style="color: #fca5a5; font-size: 13px;">
            Bitte versuchen Sie es später erneut.
          </div>
        </div>
      `;
      
      customInfoWindow.setContent(errorContent);
      customInfoWindow.show(map, position);
      activeInfoWindowRef.current = customInfoWindow;
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
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    cursor: pointer;
    margin: 8px;
    padding: 12px 16px;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
  `;
  
  controlDiv.innerHTML = content;
  
  controlDiv.addEventListener('click', onClick);
  controlDiv.addEventListener('mouseenter', () => {
    controlDiv.style.background = 'rgba(15, 23, 42, 1)';
    controlDiv.style.transform = 'translateY(-2px) scale(1.02)';
    controlDiv.style.boxShadow = `
      0 12px 40px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.15)
    `;
  });
  controlDiv.addEventListener('mouseleave', () => {
    controlDiv.style.background = 'rgba(15, 23, 42, 0.95)';
    controlDiv.style.transform = 'translateY(0) scale(1)';
    controlDiv.style.boxShadow = `
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `;
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

// Utility to create interactive route info panels
export function createRouteInfoPanel(map, route, onClose) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 20px;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    max-width: 300px;
    box-shadow: 
      0 20px 25px -5px rgba(0, 0, 0, 0.3),
      0 10px 10px -5px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    z-index: 1000;
    transition: all 0.3s ease;
  `;
  
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Route Information</h3>
      <button onclick="this.parentElement.parentElement.remove(); (${onClose.toString()})()" 
              style="background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 18px;">×</button>
    </div>
    <div style="font-size: 14px; line-height: 1.5;">
      ${route.description || 'Route wird angezeigt'}
    </div>
  `;
  
  map.getDiv().appendChild(panel);
  
  // Animate in
  requestAnimationFrame(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translateY(0)';
  });
  
  return panel;
}
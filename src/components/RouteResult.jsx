import React from 'react';
import './RouteResult.css';

const RouteResult = ({ route }) => {
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDistance = (km) => {
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  };

  return (
    <div className="route-result">
      <div className="route-result__header">
        <div className="route-summary">
          <span className="total-time">{formatTime(route.totalTime)}</span>
          <span className="total-distance">
            {formatDistance(route.totalDistance)}
          </span>
          {route.transfers > 0 && (
            <span className="transfers">
              {route.transfers} transfer{route.transfers > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="route-result__segments">
        {route.segments.map((segment, index) => (
          <div key={index} className="route-segment">
            <div className="route-info">
              <div className="route-badge">
                <span className="route-number">{segment.route.number}</span>
                <span className="route-type">{segment.route.type}</span>
              </div>
              <div className="route-details">
                <div className="route-direction">
                  <strong>{segment.startStop.name}</strong>
                  <span className="arrow">→</span>
                  <strong>{segment.endStop.name}</strong>
                </div>
                <div className="route-meta">
                  <span>{formatTime(segment.travelTime)}</span>
                  <span>•</span>
                  <span>{segment.stops.length - 1} stops</span>
                  <span>•</span>
                  <span>{formatDistance(segment.distance)}</span>
                </div>
              </div>
            </div>

            {index < route.segments.length - 1 && (
              <div className="transfer-indicator">
                <div className="transfer-line"></div>
                <div className="transfer-text">Transfer</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <details className="route-details-toggle">
        <summary>Show detailed stops</summary>
        <div className="detailed-stops">
          {route.segments.map((segment, segmentIndex) => (
            <div key={segmentIndex} className="segment-stops">
              <h4>
                Route {segment.route.number} - {segment.route.name}
              </h4>
              <ul className="stops-list">
                {segment.stops.map((stop, stopIndex) => (
                  <li key={stop.id} className="stop-item">
                    <span className="stop-name">{stop.name}</span>
                    {stopIndex === 0 && (
                      <span className="stop-badge start">Start</span>
                    )}
                    {stopIndex === segment.stops.length - 1 && (
                      <span className="stop-badge end">End</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default RouteResult;
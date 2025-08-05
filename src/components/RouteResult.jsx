import React from "react";
import "./RouteResult.css";

const RouteResult = ({ route }) => {
  const hasRoute = route && typeof route === "object";
  const segments = Array.isArray(route?.segments) ? route.segments : [];
  const hasSegments = segments.length > 0;

  const num = (v, fb = 0) =>
    typeof v === "number" && isFinite(v) ? v : fb;

  const toDate = (d) => {
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    const nd = new Date(d);
    return !isNaN(nd.getTime()) ? nd : null;
  };

  const fmtDur = (ms) => {
    const minutes = Math.round(num(ms) / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtDist = (km) => {
    const k = num(km);
    return k < 1 ? `${Math.round(k * 1000)}m` : `${k.toFixed(1)}km`;
  };

  const fmtTime = (dateLike) => {
    const d = toDate(dateLike);
    if (!d) return "N/A";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Always render container with placeholder if no data yet
  if (!hasRoute || !hasSegments) {
    return (
      <div className="route-result" data-testid="route-result">
        <div className="route-result__header">
          <div className="route-summary">
            <span className="total-time">Total Duration: …</span>
            <span className="travel-time">(On vehicle: …)</span>
            <span className="total-distance">…</span>
            <span className="transfers">0 transfers</span>
          </div>
        </div>

        <div className="route-result__segments">
          <div className="route-segment route-segment--placeholder">
            <div className="route-info">
              <div className="route-badge">
                <span className="route-number">?</span>
                <span className="route-type">Loading</span>
              </div>
              <div className="route-details">
                <div className="route-direction">
                  <strong>Waiting for results…</strong>
                </div>
                <div className="route-meta">
                  <span>Travel Time: …</span>
                  <span>•</span>
                  <span>Wait Time: …</span>
                  <span>•</span>
                  <span>0 stops</span>
                  <span>•</span>
                  <span>…</span>
                </div>
              </div>
            </div>
          </div>
          <div className="route-arrival-summary">
            Final Arrival: …
          </div>
        </div>
      </div>
    );
  }

  const finalArrival = segments[segments.length - 1]?.arrivalTime;

  return (
    <div className="route-result" data-testid="route-result">
      <div className="route-result__header">
        <div className="route-summary">
          <span className="total-time">
            Total Duration: {fmtDur(route.totalDuration)}
          </span>
          {num(route.totalTravelTime) > 0 && (
            <span className="travel-time">
              (On vehicle: {fmtDur(route.totalTravelTime)})
            </span>
          )}
          <span className="total-distance">{fmtDist(route.totalDistance)}</span>
          <span className="transfers">
            {num(route.transfers)} transfer
            {num(route.transfers) === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="route-result__segments">
        {segments.map((segment, idx) => {
          if (!segment || typeof segment !== "object") return null;

          const stops = Array.isArray(segment.stops) ? segment.stops : [];
          const startName = segment.startStop?.name || "Start";
          const endName = segment.endStop?.name || "End";
          const routeNum =
            segment.route?.number != null ? String(segment.route.number) : "?";
          const routeType =
            segment.route?.type != null ? String(segment.route.type) : "";

          return (
            <div
              key={segment.route?.id ?? `${route.id}-${idx}`}
              className="route-segment"
            >
              <div className="route-info">
                <div className="route-badge">
                  <span className="route-number">{routeNum}</span>
                  <span className="route-type">{routeType}</span>
                </div>
                <div className="route-details">
                  <div className="route-direction">
                    <strong>{startName}</strong>{" "}
                    <span className="time-info">
                      (Dep: {fmtTime(segment.departureTime)})
                    </span>
                    <span className="arrow">→</span>
                    <strong>{endName}</strong>{" "}
                    <span className="time-info">
                      (Arr: {fmtTime(segment.arrivalTime)})
                    </span>
                  </div>
                  <div className="route-meta">
                    <span>Travel Time: {fmtDur(segment.travelTimeMs)}</span>
                    {num(segment.waitingTimeMs) > 0 && (
                      <>
                        <span>•</span>
                        <span>Wait Time: {fmtDur(segment.waitingTimeMs)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{Math.max(0, stops.length - 1)} stops</span>
                    <span>•</span>
                    <span>{fmtDist(segment.distance)}</span>
                  </div>
                </div>
              </div>

              {idx < segments.length - 1 && (
                <div className="transfer-indicator">
                  <div className="transfer-line"></div>
                  <div className="transfer-text">Transfer</div>
                </div>
              )}
            </div>
          );
        })}

        {finalArrival && segments.length > 0 && (
          <div className="route-arrival-summary">
            Final Arrival at{" "}
            <strong>{segments[segments.length - 1].endStop?.name || ""}</strong>
            : {fmtTime(finalArrival)}
          </div>
        )}
      </div>

      <details className="route-details-toggle">
        <summary>Show detailed stops</summary>
        <div className="detailed-stops">
          {segments.map((segment, sIdx) => {
            if (!segment) return null;
            const stops = Array.isArray(segment.stops) ? segment.stops : [];
            const lastIndex = Math.max(0, stops.length - 1);
            return (
              <div key={`seg-${sIdx}`} className="segment-stops">
                <h4>
                  Route {segment.route?.number ?? "?"} -{" "}
                  {segment.route?.name ?? ""}
                </h4>
                <ul className="stops-list">
                  {stops.map((stop, i) => (
                    <li key={stop?.id ?? `s-${sIdx}-${i}`} className="stop-item">
                      <span className="stop-name">
                        {stop?.name || "Unknown"}
                      </span>
                      {i === 0 && (
                        <span className="stop-badge start">
                          Dep: {fmtTime(segment.departureTime)}
                        </span>
                      )}
                      {i === lastIndex && stops.length > 1 && (
                        <span className="stop-badge end">
                          Arr: {fmtTime(segment.arrivalTime)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
};

export default RouteResult;
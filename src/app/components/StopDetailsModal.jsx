// src/components/StopDetailsModal.jsx
import React from 'react';

const StopDetailsModal = ({ activeStopData, setActiveStopData, routeIcons }) => {
  if (!activeStopData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
        <button
          onClick={() => setActiveStopData(null)}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Schließen"
        >
          &times;
        </button>

        {/* StopNr anzeigen */}
        <div className="text-sm text-gray-500 mb-1">StopNr: {activeStopData.stop.id}</div>
        <h2 className="text-xl font-bold mb-4">{activeStopData.stop.name}</h2>

        {activeStopData.departures && activeStopData.departures.length > 0 ? (
          <ul className="space-y-3">
            {activeStopData.departures.slice(0, 6).map((dep, i) => {
              const scheduled = new Date(dep.DepartureTimeScheduled).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const deviation = dep.DepartureDeviation || 0;
              const delayMinutes = Math.floor(Math.abs(deviation) / 60);
              const delaySeconds = Math.abs(deviation % 60);
              const delayText =
                deviation > 0
                  ? `+${delayMinutes}min ${delaySeconds}s`
                  : deviation < 0
                  ? `-${delayMinutes}min ${delaySeconds}s`
                  : 'Pünktlich';

              return (
                <li key={i} className="border-b pb-3 last:border-none">
                  <div className="flex items-center gap-3 text-sm">
                    <img
                      src={routeIcons[dep.RouteNumber] || '/icons/tram_logo.png'}
                      alt={`Linie ${dep.RouteNumber}`}
                      className="w-6 h-6 flex-shrink-0"
                    />
                    <div className="flex flex-col flex-grow">
                      <span className="font-medium text-gray-900">{dep.DepartureDirectionText}</span>
                      <span className="text-gray-600 text-xs">{scheduled}</span>
                    </div>
                    <span
                      className={`font-semibold text-sm ${
                        deviation > 0
                          ? 'text-red-600'
                          : deviation < 0
                          ? 'text-green-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {delayText}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-gray-600">Keine bevorstehenden Abfahrten.</div>
        )}

        <div className="mt-6 text-right">
          <button
            onClick={() => setActiveStopData(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopDetailsModal;
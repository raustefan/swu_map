// src/components/StopDetailsModal.jsx
import React, { useState, useEffect } from 'react';

const StopDetailsModal = ({ activeStopData, setActiveStopData, routeIcons }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('departures');

  useEffect(() => {
    if (activeStopData) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [activeStopData]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setActiveStopData(null), 300);
  };

  if (!activeStopData) return null;

  const { stop, departures } = activeStopData;

  // Group departures by route for better organization
  const groupedDepartures = departures.reduce((acc, dep) => {
    const route = dep.RouteNumber;
    if (!acc[route]) acc[route] = [];
    acc[route].push(dep);
    return acc;
  }, {});

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDelay = (deviation) => {
    if (!deviation) return { text: 'Pünktlich', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: '🟢' };
    
    const delayMinutes = Math.floor(Math.abs(deviation) / 60);
    const delaySeconds = Math.abs(deviation % 60);
    
    if (deviation > 0) {
      return {
        text: `+${delayMinutes}:${delaySeconds.toString().padStart(2, '0')}`,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: '🔴'
      };
    } else {
      return {
        text: `-${delayMinutes}:${delaySeconds.toString().padStart(2, '0')}`,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        icon: '🔵'
      };
    }
  };

  const getNextDepartures = () => {
    return departures
      .sort((a, b) => new Date(a.DepartureTimeScheduled) - new Date(b.DepartureTimeScheduled))
      .slice(0, 8);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 transition-all duration-300 ${
      isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
    }`}>
      <div className={`relative w-full max-w-2xl max-h-[85vh] transition-all duration-500 ease-out ${
        isVisible 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-8'
      }`}>
        
        {/* Main Modal Container */}
        <div className="bg-gradient-to-br from-slate-900/95 to-indigo-900/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          {/* Header */}
          <div className="relative px-8 py-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-t-3xl"></div>
            
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium text-white/70">
                      ID: {stop.id}
                    </span>
                    {stop.platform && (
                      <span className="px-3 py-1 bg-blue-500/20 rounded-lg text-xs font-medium text-blue-300">
                        Steig {stop.platform}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{stop.name}</h2>
                  <p className="text-white/70 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Live Abfahrten
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="p-3 hover:bg-white/10 rounded-2xl transition-all duration-200 group flex-shrink-0"
              >
                <svg className="w-6 h-6 text-white/70 group-hover:text-white group-hover:rotate-90 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add a visual spacer */}
          <div className="absolute inset-x-0 top-16 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          {/* Tab Navigation */}
          <div className="relative px-8 pt-4 pb-6">
            <div className="flex gap-2 bg-white/5 rounded-2xl p-1 backdrop-blur-sm">
              <button
                onClick={() => setSelectedTab('departures')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  selectedTab === 'departures'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Abfahrten ({departures.length})
                </div>
              </button>
              <button
                onClick={() => setSelectedTab('routes')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  selectedTab === 'routes'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Linien ({Object.keys(groupedDepartures).length})
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {selectedTab === 'departures' ? (
              departures.length > 0 ? (
                <div className="space-y-4">
                  {getNextDepartures().map((dep, index) => {
                    const delayInfo = formatDelay(dep.DepartureDeviation);
                    const scheduledTime = formatTime(dep.DepartureTimeScheduled);
                    
                    return (
                      <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="relative flex-shrink-0">
                              {routeIcons[dep.RouteNumber] ? (
                                <img 
                                  src={routeIcons[dep.RouteNumber]} 
                                  alt={`Linie ${dep.RouteNumber}`}
                                  className="w-12 h-12 rounded-xl shadow-lg"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                  <span className="text-white text-sm font-bold">{dep.RouteNumber}</span>
                                </div>
                              )}
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-semibold text-lg mb-1 truncate">
                                {dep.DepartureDirectionText}
                              </div>
                              <div className="flex items-center gap-2 text-white/60 text-sm">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Linie {dep.RouteNumber} • {scheduledTime}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${delayInfo.bgColor} backdrop-blur-sm`}>
                              <span className="text-sm">{delayInfo.icon}</span>
                              <span className={`font-bold text-sm ${delayInfo.color}`}>
                                {delayInfo.text}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-3 text-lg">Keine Abfahrten</h3>
                  <p className="text-white/70 text-sm max-w-sm mx-auto leading-relaxed">Aktuell sind keine bevorstehenden Abfahrten verfügbar.</p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedDepartures).map(([routeNumber, routeDepartures]) => (
                  <div key={routeNumber} className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center gap-5 mb-4">
                      {routeIcons[routeNumber] ? (
                        <img 
                          src={routeIcons[routeNumber]} 
                          alt={`Linie ${routeNumber}`}
                          className="w-12 h-12 rounded-lg shadow-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{routeNumber}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-white font-semibold text-lg">Linie {routeNumber}</div>
                        <div className="text-white/60 text-sm">{routeDepartures.length} Abfahrten</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pl-17">
                      {routeDepartures.slice(0, 3).map((dep, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-b-0">
                          <span className="text-white/80 flex-1 truncate pr-4">{dep.DepartureDirectionText}</span>
                          <span className="text-white/60 font-medium flex-shrink-0">{formatTime(dep.DepartureTimeScheduled)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="relative px-8 py-5 bg-black/20 backdrop-blur-sm border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live-Daten • Letztes Update: {new Date().toLocaleTimeString('de-DE')}</span>
              </div>
              
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default StopDetailsModal;
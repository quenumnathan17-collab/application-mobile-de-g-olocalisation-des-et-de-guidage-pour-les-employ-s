import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, Map, List, Navigation, Clock, 
  WifiOff, Search, Compass, ChevronRight, 
  MapPin, CheckCircle2, Play, ExternalLink, RefreshCw
} from 'lucide-react';

export default function MobileSimulator({ 
  clients, 
  employees, 
  operations, 
  activeEmployeeId, 
  setActiveEmployeeId,
  updateOperationStatus,
  updateEmployeeGps,
  addNotification
}) {
  const [mobileTab, setMobileTab] = useState('map'); // 'map', 'list'
  const [selectedOp, setSelectedOp] = useState(null);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // { distance: km, duration: mins }
  
  // Offline Simulation
  const [isOffline, setIsOffline] = useState(false);
  const [offlineCache, setOfflineCache] = useState(null);

  // External GPS launch simulator modal
  const [showGpsChooser, setShowGpsChooser] = useState(false);

  // GPS Movement Simulation
  const [isSimulatingMovement, setIsSimulatingMovement] = useState(false);
  const movementInterval = useRef(null);

  // Map elements
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const routeLayer = useRef(null);

  // Active employee object
  const activeEmployee = employees.find(e => e.id === activeEmployeeId);

  // Calculate distance between two GPS coordinates in km
  const getDistance = (gps1, gps2) => {
    if (!gps1 || !gps2) return 0;
    const R = 6371; // Earth radius in km
    const dLat = (gps2.lat - gps1.lat) * Math.PI / 180;
    const dLng = (gps2.lng - gps1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(gps1.lat * Math.PI / 180) * Math.cos(gps2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Generate intermediate route coordinates for authentic zigzag display
  const getRouteCoords = (start, end) => {
    const latDiff = end.lat - start.lat;
    const lngDiff = end.lng - start.lng;
    return [
      [start.lat, start.lng],
      [start.lat + latDiff * 0.3, start.lng + lngDiff * 0.1],
      [start.lat + latDiff * 0.6, start.lng + lngDiff * 0.75],
      [end.lat, end.lng]
    ];
  };

  // Connect active employee
  const handleLogin = (empId) => {
    setActiveEmployeeId(empId);
    addNotification({
      title: "Connexion réussie",
      body: `Connecté en tant que ${employees.find(e => e.id === empId).name}`
    });
  };

  const handleLogout = () => {
    stopMovementSimulation();
    setActiveEmployeeId(null);
    setSelectedOp(null);
    setRoutePolyline(null);
    setRouteInfo(null);
  };

  // Center map on technician position
  const handleCenterMap = () => {
    if (mapInstance.current && activeEmployee?.gps) {
      mapInstance.current.setView([activeEmployee.gps.lat, activeEmployee.gps.lng], 14);
    }
  };

  // Calculate route
  const handleCalculateRoute = (op) => {
    if (isOffline) {
      alert("Impossible de calculer un nouvel itinéraire en mode Hors-ligne. Affichage des coordonnées GPS du client en cache.");
      return;
    }

    const client = clients.find(c => c.id === op.clientId);
    if (!client || !activeEmployee) return;

    const start = activeEmployee.gps;
    const end = client.gps;

    // Calculate distance and approximate duration (avg speed 30km/h in city)
    const distance = getDistance(start, end);
    const duration = Math.round((distance / 30) * 60) + 2; // in minutes

    const routePoints = getRouteCoords(start, end);
    setRoutePolyline(routePoints);
    setRouteInfo({
      distance: distance.toFixed(1),
      duration: duration
    });

    addNotification({
      title: "Itinéraire calculé",
      body: `Trajet vers ${client.name} : ${distance.toFixed(1)} km, env. ${duration} min`
    });
  };

  // Trigger simulated external GPS navigation
  const handleLaunchExternalGps = () => {
    setShowGpsChooser(true);
  };

  // Change operation status
  const handleStatusChange = (opId, newStatus) => {
    updateOperationStatus(opId, newStatus);
    
    const op = operations.find(o => o.id === opId);
    const client = clients.find(c => c.id === op?.clientId);
    
    addNotification({
      title: `Statut mis à jour`,
      body: `L'opération chez ${client?.name || 'Client'} est désormais : ${newStatus}`
    });

    // If finished, clear route and selected job
    if (newStatus === 'terminée') {
      stopMovementSimulation();
      setSelectedOp(null);
      setRoutePolyline(null);
      setRouteInfo(null);
    }
  };

  // GPS Movement step-by-step simulator
  const startMovementSimulation = (clientGps) => {
    if (!activeEmployee) return;
    if (isSimulatingMovement) {
      stopMovementSimulation();
      return;
    }

    setIsSimulatingMovement(true);
    let step = 0;
    const stepsCount = 10;
    const startLat = activeEmployee.gps.lat;
    const startLng = activeEmployee.gps.lng;

    movementInterval.current = setInterval(() => {
      step++;
      const ratio = step / stepsCount;
      const curLat = startLat + (clientGps.lat - startLat) * ratio;
      const curLng = startLng + (clientGps.lng - startLng) * ratio;

      updateEmployeeGps(activeEmployee.id, { lat: curLat, lng: curLng });

      if (step >= stepsCount) {
        stopMovementSimulation();
        addNotification({
          title: "Arrivée à destination",
          body: `Vous êtes arrivé chez le client.`
        });
      }
    }, 1500);
  };

  const stopMovementSimulation = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
    setIsSimulatingMovement(false);
  };

  // Sync cache when going offline/online
  useEffect(() => {
    if (isOffline) {
      // Save current operations to offline cache
      const activeOps = operations.filter(
        op => op.employeeId === activeEmployeeId && (op.status === 'en cours' || op.status === 'planifiée')
      );
      const cachedData = activeOps.map(op => {
        const client = clients.find(c => c.id === op.clientId);
        return { ...op, clientName: client?.name, clientAddress: client?.address, clientGps: client?.gps };
      });
      setOfflineCache(cachedData);
    } else {
      setOfflineCache(null);
    }
  }, [isOffline, activeEmployeeId, operations, clients]);

  // Leaflet map initialization
  useEffect(() => {
    if (!activeEmployeeId || mobileTab !== 'map' || !mapRef.current) return;

    const L = window.L;
    if (!L) return;

    // Initialize Map centered on employee
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false, // Cleaner UI
      attributionControl: false // Minimalist phone UI
    }).setView([activeEmployee.gps.lat, activeEmployee.gps.lng], 13);

    // Dark styled map or standard OpenStreetMap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(mapInstance.current);

    markersGroup.current = L.layerGroup().addTo(mapInstance.current);
    routeLayer.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activeEmployeeId, mobileTab]);

  // Redraw Mobile Map markers and routes
  useEffect(() => {
    if (!activeEmployeeId || mobileTab !== 'map' || !mapInstance.current || !markersGroup.current) return;

    const L = window.L;
    if (!L) return;

    // Clear previous
    markersGroup.current.clearLayers();
    routeLayer.current.clearLayers();

    // 1. Current technician position marker
    const techMarkerHtml = `
      <div class="user-marker-icon">
        <div class="user-pulse"></div>
      </div>
    `;

    const techMarker = L.marker([activeEmployee.gps.lat, activeEmployee.gps.lng], {
      icon: L.divIcon({
        html: techMarkerHtml,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    });
    markersGroup.current.addLayer(techMarker);

    // 2. Client markers
    const assignedOps = operations.filter(
      op => op.employeeId === activeEmployeeId && (op.status === 'en cours' || op.status === 'planifiée')
    );

    assignedOps.forEach(op => {
      const client = clients.find(c => c.id === op.clientId);
      if (!client) return;

      const markerHtml = `
        <div style="
          background-color: ${op.status === 'en cours' ? '#10b981' : '#4f46e5'};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          border: 2px solid white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.15);
        ">
          ${client.type === 'entreprise' ? '🏢' : '👤'}
        </div>
      `;

      const clientMarker = L.marker([client.gps.lat, client.gps.lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      });

      clientMarker.on('click', () => {
        setSelectedOp(op);
      });

      markersGroup.current.addLayer(clientMarker);
    });

    // 3. Draw active route polyline
    if (routePolyline) {
      const poly = L.polyline(routePolyline, {
        color: '#6366f1',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(routeLayer.current);

      // Fit map to show both markers
      mapInstance.current.fitBounds(poly.getBounds(), { padding: [40, 40] });
    }

  }, [activeEmployeeId, mobileTab, operations, clients, routePolyline, activeEmployee?.gps]);

  // List of active interventions for list tab
  const activeJobs = operations.filter(
    op => op.employeeId === activeEmployeeId && (op.status === 'en cours' || op.status === 'planifiée')
  );

  return (
    <div className="mobile-pane">
      <div className="simulator-label">
        <Compass size={16} /> Simulateur Mobile Employé
      </div>

      <div className="smartphone-frame">
        {/* Notch & Status bar */}
        <div className="phone-notch"></div>
        <div className="phone-status-bar">
          <span>{new Date().toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' })}</span>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {isOffline ? <WifiOff size={12} style={{ color: '#ef4444' }} /> : '📶'}
            <span>100% 🔋</span>
          </div>
        </div>

        <div className="phone-screen">
          {isOffline && (
            <div className="offline-banner">
              <WifiOff size={14} /> Mode Hors-ligne actif (Données en cache)
            </div>
          )}

          {/* SCREEN CONTENT */}
          {!activeEmployeeId ? (
            /* 1. LOGIN SCREEN */
            <div className="mobile-login">
              <div className="mobile-login-logo">
                <Navigation size={48} />
              </div>
              <h3 className="mobile-login-title">YA Navigation</h3>
              <p className="mobile-login-subtitle">Portail de guidage employé</p>
              
              <div className="technician-selector-list">
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', textAlign: 'left' }}>
                  SÉLECTIONNEZ UN COMPTE EMPLOYÉ :
                </p>
                {employees.filter(e => e.role === 'employee').map(emp => (
                  <div 
                    key={emp.id} 
                    className="tech-select-card"
                    onClick={() => handleLogin(emp.id)}
                  >
                    <img src={emp.avatar} alt={emp.name} className="tech-avatar" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Technicien terrain</div>
                    </div>
                    <ChevronRight size={16} style={{ marginLeft: 'auto', color: '#cbd5e1' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 2. ACTIVE APPLICATION APP */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="mobile-app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img src={activeEmployee.avatar} alt={activeEmployee.name} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Bonjour,</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{activeEmployee.name.split(' ')[0]}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {mobileTab === 'map' && (
                    <button 
                      onClick={handleCenterMap}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                      title="Centrer GPS"
                    >
                      🎯
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>

              {/* MOBILE APP BODY */}
              <div className="mobile-app-body">
                {mobileTab === 'map' ? (
                  /* MAP TAB */
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                    {/* Bottom sheet for operation detail */}
                    {selectedOp && (
                      <div className={`mobile-bottom-sheet ${selectedOp ? 'open' : ''}`}>
                        <div className="sheet-drag-handle" onClick={() => setSelectedOp(null)}></div>
                        <div className="sheet-header">
                          <div className="sheet-client-name">
                            {clients.find(c => c.id === selectedOp.clientId)?.name || "Client"}
                          </div>
                          <span className={`badge badge-${selectedOp.status}`}>
                            {selectedOp.status}
                          </span>
                        </div>
                        <div className="sheet-address">
                          <MapPin size={12} />
                          {clients.find(c => c.id === selectedOp.clientId)?.address || ""}
                        </div>
                        <div className="sheet-job-desc">
                          {selectedOp.description}
                        </div>

                        {routeInfo && (
                          <div style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            backgroundColor: '#f8fafc', 
                            padding: '0.5rem 0.75rem', 
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            marginBottom: '0.75rem',
                            border: '1px dashed #cbd5e1'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Compass size={14} style={{ color: 'var(--primary)' }} />
                              <strong>{routeInfo.distance} km</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={14} style={{ color: 'var(--primary)' }} />
                              <strong>{routeInfo.duration} min</strong>
                            </div>
                          </div>
                        )}

                        <div className="sheet-actions">
                          {selectedOp.status === 'planifiée' && (
                            <button 
                              className="btn btn-primary" 
                              style={{ flex: 1, padding: '0.5rem' }}
                              onClick={() => handleStatusChange(selectedOp.id, 'en cours')}
                            >
                              Démarrer la mission
                            </button>
                          )}
                          {selectedOp.status === 'en cours' && (
                            <>
                              <button 
                                className="btn btn-secondary" 
                                style={{ flex: 1, padding: '0.5rem', backgroundColor: '#e2e8f0' }}
                                onClick={() => handleStatusChange(selectedOp.id, 'planifiée')}
                              >
                                En pause
                              </button>
                              <button 
                                className="btn" 
                                style={{ flex: 1.2, padding: '0.5rem', backgroundColor: 'var(--success)', color: 'white' }}
                                onClick={() => handleStatusChange(selectedOp.id, 'terminée')}
                              >
                                Terminer
                              </button>
                            </>
                          )}
                          {!routePolyline && selectedOp.status !== 'terminée' && (
                            <button 
                              className="btn btn-secondary"
                              style={{ padding: '0.5rem' }}
                              onClick={() => handleCalculateRoute(selectedOp)}
                            >
                              Itinéraire
                            </button>
                          )}
                          {routePolyline && (
                            <button 
                              className="btn btn-secondary"
                              style={{ padding: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                              onClick={handleLaunchExternalGps}
                            >
                              <ExternalLink size={14} /> GPS
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* LIST TAB */
                  <div className="mobile-job-list">
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      MISSIONS DU JOUR ({activeJobs.length})
                    </div>
                    {activeJobs.map(op => {
                      const client = clients.find(c => c.id === op.clientId);
                      const dist = getDistance(activeEmployee.gps, client?.gps);
                      
                      return (
                        <div 
                          key={op.id} 
                          className="mobile-job-card"
                          onClick={() => {
                            setSelectedOp(op);
                            setMobileTab('map');
                          }}
                        >
                          <div className="mobile-job-card-header">
                            <span className="mobile-job-card-title">{client?.name}</span>
                            <span className={`badge badge-${op.status}`}>
                              {op.status}
                            </span>
                          </div>
                          <p className="mobile-job-card-desc">{op.description}</p>
                          <div className="mobile-job-card-footer">
                            <span>📍 {client?.address.split(',')[0]}</span>
                            <span>📏 {dist.toFixed(1)} km</span>
                          </div>
                        </div>
                      );
                    })}
                    {activeJobs.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 1rem' }}>
                        🎉 Félicitations ! Toutes vos missions sont terminées pour aujourd'hui.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MOBILE APP BOTTOM NAV */}
              <div className="mobile-app-nav">
                <button 
                  className={`mobile-nav-item ${mobileTab === 'map' ? 'active' : ''}`}
                  onClick={() => setMobileTab('map')}
                >
                  <Map size={18} />
                  <span>Carte</span>
                </button>
                <button 
                  className={`mobile-nav-item ${mobileTab === 'list' ? 'active' : ''}`}
                  onClick={() => setMobileTab('list')}
                >
                  <List size={18} />
                  <span>Liste</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SIMULATOR CONTROL PANEL (OUTSIDE PHONE FRAME) */}
      {activeEmployeeId && (
        <div className="sim-controls-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              PANNEAU DE CONTRÔLE DE SIMULATION
            </span>
            <span style={{ fontSize: '0.7rem', color: isOffline ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
              {isOffline ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', backgroundColor: isOffline ? '#fee2e2' : '' }}
              onClick={() => {
                setIsOffline(!isOffline);
                addNotification({
                  title: isOffline ? "Connexion rétablie" : "Connexion perdue",
                  body: isOffline ? "Vous êtes à nouveau connecté au réseau." : "Mode dégradé activé. Accès limité aux données locales en cache."
                });
              }}
            >
              {isOffline ? "Activer Réseau" : "Simuler Hors-ligne"}
            </button>

            {selectedOp && selectedOp.status === 'en cours' && (
              <button 
                className="btn btn-primary" 
                style={{ flex: 1.2, padding: '0.5rem', fontSize: '0.75rem', backgroundColor: isSimulatingMovement ? 'var(--danger)' : 'var(--primary)' }}
                onClick={() => {
                  const client = clients.find(c => c.id === selectedOp.clientId);
                  if (client) startMovementSimulation(client.gps);
                }}
              >
                {isSimulatingMovement ? "Arrêter Déplacement" : "Simuler trajet GPS"}
              </button>
            )}
          </div>

          {/* Quick location teleporter for testing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Relocaliser :</span>
            <select 
              className="form-select" 
              style={{ padding: '0.25rem', fontSize: '0.75rem' }}
              onChange={(e) => {
                const coords = e.target.value.split(',').map(Number);
                updateEmployeeGps(activeEmployee.id, { lat: coords[0], lng: coords[1] });
                setRoutePolyline(null);
                setRouteInfo(null);
                addNotification({
                  title: "Position GPS mise à jour",
                  body: `Nouvelles coordonnées : Lat ${coords[0]}, Lng ${coords[1]}`
                });
              }}
            >
              <option value="5.3245,-4.0205">Plateau (Position Initiale)</option>
              <option value="5.3571,-3.9897">Cocody (St-Jean)</option>
              <option value="5.3955,-3.9710">Angré (CNPS)</option>
              <option value="5.3050,-3.9785">Marcory (Zone 4)</option>
              <option value="5.3450,-4.0750">Yopougon (Siporex)</option>
            </select>
          </div>
        </div>
      )}

      {/* EXTERNAL GPS APP SIMULATION CHOOSER MODAL */}
      {showGpsChooser && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '340px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', textAlign: 'center' }}>
              Ouvrir l'itinéraire avec :
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                onClick={() => {
                  setShowGpsChooser(false);
                  const client = clients.find(c => c.id === selectedOp.clientId);
                  alert(`Redirection vers Google Maps : navigation de (${activeEmployee.gps.lat.toFixed(4)}, ${activeEmployee.gps.lng.toFixed(4)}) vers (${client.gps.lat.toFixed(4)}, ${client.gps.lng.toFixed(4)})`);
                }}
              >
                🚗 Google Maps
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                onClick={() => {
                  setShowGpsChooser(false);
                  const client = clients.find(c => c.id === selectedOp.clientId);
                  alert(`Redirection vers Waze avec destination : ${client.name} (${client.address})`);
                }}
              >
                🚙 Waze
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                onClick={() => {
                  setShowGpsChooser(false);
                  const client = clients.find(c => c.id === selectedOp.clientId);
                  alert(`Redirection vers Apple Maps (iOS) avec destination : lat:${client.gps.lat}, lng:${client.gps.lng}`);
                }}
              >
                🗺️ Apple Plans
              </button>
            </div>
            
            <div className="modal-footer" style={{ marginTop: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-danger" style={{ padding: '0.4rem 1rem' }} onClick={() => setShowGpsChooser(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

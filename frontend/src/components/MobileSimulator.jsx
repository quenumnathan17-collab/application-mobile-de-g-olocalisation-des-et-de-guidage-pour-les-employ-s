import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { 
  LogOut, Map, List, Navigation, Clock, 
  WifiOff, Search, Compass, ChevronRight, 
  MapPin, CheckCircle2, Play, ExternalLink, RefreshCw,
  Settings, User, Camera, Lock, Phone, Mail, Save, Eye, EyeOff, CheckCheck, AlertCircle
} from 'lucide-react';

export default function MobileSimulator({ 
  clients, 
  employees, 
  operations, 
  activeEmployeeId, 
  setActiveEmployeeId,
  updateOperationStatus,
  updateEmployeeGps,
  addNotification,
  onProfileUpdated,
  layoutMode,
  theme,
  currentUser
}) {
  const getArrivalTime = (durationMinutes) => {
    const now = new Date();
    const mins = Math.round(parseFloat(durationMinutes) || 0);
    now.setMinutes(now.getMinutes() + mins);
    return now.toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' });
  };

  const [mobileTab, setMobileTab] = useState('map'); // 'map', 'list', 'settings'

  // ── Profile / Settings state ───────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [profileAvatar, setProfileAvatar] = useState(null);  // base64 preview
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError]     = useState('');
  const [pwdForm, setPwdForm]               = useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading]         = useState(false);
  const [pwdSuccess, setPwdSuccess]         = useState('');
  const [pwdError, setPwdError]             = useState('');
  const [showCurrent, setShowCurrent]       = useState(false);
  const [showNext, setShowNext]             = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const profileFileRef = useRef(null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // { distance: km, duration: mins }
  
  // Real-Time Clock for simulated smartphone
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // update clock every 15s
    return () => clearInterval(clockTimer);
  }, []);

  // Auto-calculate route if selected operation is in progress
  useEffect(() => {
    if (selectedOp && selectedOp.status === 'en cours' && !routeInfo) {
      handleCalculateRoute(selectedOp);
    }
  }, [selectedOp, routeInfo]);
  
  // Offline Simulation
  const [isOffline, setIsOffline] = useState(false);
  const [offlineCache, setOfflineCache] = useState(null);

  // External GPS launch simulator modal
  const [showGpsChooser, setShowGpsChooser] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterToday, setFilterToday] = useState(false);

  // Real GPS State
  const [realGps, setRealGps] = useState(null);

  // GPS Movement Simulation
  const [isSimulatingMovement, setIsSimulatingMovement] = useState(false);
  const movementInterval = useRef(null);

  // Map elements
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const routeLayer = useRef(null);
  const routingControl = useRef(null);

  // Active employee object
  const activeEmployee = employees.find(e => e.id === activeEmployeeId);

  // Sync profile form when active employee changes or settings tab opens
  useEffect(() => {
    if (activeEmployee && mobileTab === 'settings') {
      setProfileForm({ name: activeEmployee.name, email: activeEmployee.email, phone: activeEmployee.phone });
      setProfileAvatar(null);
      setProfileSuccess('');
      setProfileError('');
      setPwdForm({ current: '', next: '', confirm: '' });
      setPwdSuccess('');
      setPwdError('');
    }
  }, [mobileTab, activeEmployee?.id]);

  // Process photo file for profile
  const processProfileFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Choisissez une image (JPG, PNG, WebP…).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('La photo ne doit pas dépasser 5 Mo.');
      return;
    }
    setProfileError('');
    const reader = new FileReader();
    reader.onload = (ev) => setProfileAvatar(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  // Save profile info
  const handleSaveProfile = async () => {
    if (!activeEmployee) return;
    setProfileLoading(true); setProfileError(''); setProfileSuccess('');
    try {
      const token = localStorage.getItem('token');
      const body  = {
        name:   profileForm.name,
        email:  profileForm.email,
        phone:  profileForm.phone,
        avatar: profileAvatar !== null ? profileAvatar : undefined,
      };
      const res  = await fetch(`/api/employees/${activeEmployee.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de sauvegarde.');

      // Propagate to parent App so all components (header, map, lists) update immediately
      if (onProfileUpdated) onProfileUpdated(data);

      // Keep avatar preview in sync
      if (profileAvatar) setProfileAvatar(data.avatar || profileAvatar);

      setProfileSuccess('Profil mis à jour avec succès !');
      addNotification({ title: '✅ Profil mis à jour', body: 'Vos informations ont été enregistrées.' });
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!activeEmployee) return;
    if (pwdForm.next !== pwdForm.confirm) { setPwdError('Les mots de passe ne correspondent pas.'); return; }
    if (pwdForm.next.length < 6) { setPwdError('Le nouveau mot de passe doit contenir au moins 6 caractères.'); return; }
    setPwdLoading(true); setPwdError(''); setPwdSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res  = await fetch(`/api/employees/${activeEmployee.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur.');
      setPwdSuccess('Mot de passe modifié avec succès !');
      setPwdForm({ current: '', next: '', confirm: '' });
      addNotification({ title: '🔐 Mot de passe modifié', body: 'Votre nouveau mot de passe est actif.' });
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };


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

  // Real GPS tracking
  useEffect(() => {
    if (!activeEmployeeId) return;

    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setRealGps({ lat: latitude, lng: longitude });
          updateEmployeeGps(activeEmployeeId, { lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn("GPS Réel indisponible, fallback au GPS de test", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeEmployeeId]);

  const currentGps = realGps || activeEmployee?.gps;

  // Center map on technician position
  const handleCenterMap = () => {
    if (mapInstance.current && currentGps) {
      mapInstance.current.setView([currentGps.lat, currentGps.lng], 14);
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

    const start = currentGps;
    const end = client.gps;

    // Calculate real route using leaflet-routing-machine
    if (routingControl.current) {
      routingControl.current.setWaypoints([
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
      ]);
      
      routingControl.current.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        const distKm = (summary.totalDistance / 1000).toFixed(1);
        const timeMin = Math.round(summary.totalTime / 60);
        
        setRouteInfo({
          distance: distKm,
          duration: timeMin
        });
        
        addNotification({
          title: "Itinéraire calculé",
          body: `Trajet vers ${client.name} : ${distKm} km, env. ${timeMin} min`
        });
      });
      
      routingControl.current.on('routingerror', function(e) {
        console.error("Erreur de routage OSRM:", e);
        // Fallback to zigzag if network fails
        const distance = getDistance(start, end);
        const duration = Math.round((distance / 30) * 60) + 2;
        setRoutePolyline(getRouteCoords(start, end));
        setRouteInfo({ distance: distance.toFixed(1), duration });
        addNotification({
          title: "Itinéraire calculé (dégradé)",
          body: `Trajet vers ${client.name} : ${distance.toFixed(1)} km, env. ${duration} min`
        });
      });
    } else {
      // Fallback
      const distance = getDistance(start, end);
      const duration = Math.round((distance / 30) * 60) + 2;
      setRoutePolyline(getRouteCoords(start, end));
      setRouteInfo({ distance: distance.toFixed(1), duration });
      addNotification({
        title: "Itinéraire calculé",
        body: `Trajet vers ${client.name} : ${distance.toFixed(1)} km, env. ${duration} min`
      });
    }
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
      if (routingControl.current) {
        routingControl.current.setWaypoints([]);
      }
    } else if (newStatus === 'en cours' && op) {
      // Auto-calculate route on start
      setTimeout(() => {
        handleCalculateRoute(op);
      }, 300);
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
    if (!activeEmployeeId || !activeEmployee || mobileTab !== 'map' || !mapRef.current) return;

    // Initialize Map centered on employee
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false, // Cleaner UI
      attributionControl: false // Minimalist phone UI
    }).setView([currentGps.lat, currentGps.lng], 13);

    // Always use standard light voyager tile layer
    const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapInstance.current);

    markersGroup.current = L.layerGroup().addTo(mapInstance.current);
    routeLayer.current = L.layerGroup().addTo(mapInstance.current);

    // Initialize Routing Control
    routingControl.current = L.Routing.control({
      waypoints: [],
      routeWhileDragging: false,
      show: false, // hide the instructions panel
      addWaypoints: false,
      fitSelectedRoutes: true,
      createMarker: () => null, // don't add default start/end markers
      lineOptions: {
        styles: [{ color: '#4f46e5', weight: 6, opacity: 0.8 }]
      }
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activeEmployeeId, mobileTab, theme]);

  // Invalidate map size when mobileTab or layoutMode changes
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current.invalidateSize();
      }, 200);
    }
  }, [mobileTab, layoutMode]);

  // Redraw Mobile Map markers and routes
  useEffect(() => {
    if (!activeEmployeeId || !activeEmployee || mobileTab !== 'map' || !mapInstance.current || !markersGroup.current) return;

    // Clear previous
    markersGroup.current.clearLayers();
    routeLayer.current.clearLayers();

    // 1. Current technician position marker
    const techMarkerHtml = `
      <div class="user-marker-icon">
        <div class="user-pulse"></div>
      </div>
    `;

    const techMarker = L.marker([currentGps.lat, currentGps.lng], {
      icon: L.divIcon({
        html: techMarkerHtml,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    });
    markersGroup.current.addLayer(techMarker);

    // 2. Client markers
    const today = new Date().toISOString().split('T')[0];
    const assignedOps = operations.filter(
      op => op.employeeId === activeEmployeeId && (op.status === 'en cours' || op.status === 'planifiée')
    ).filter(op => {
      if (filterToday && op.date !== today) return false;
      const client = clients.find(c => c.id === op.clientId);
      if (searchQuery && client && !client.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

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
    } else if (assignedOps.length > 0) {
      const bounds = L.latLngBounds([currentGps.lat, currentGps.lng]);
      assignedOps.forEach(op => {
        const client = clients.find(c => c.id === op.clientId);
        if (client) {
          bounds.extend([client.gps.lat, client.gps.lng]);
        }
      });
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      mapInstance.current.setView([currentGps.lat, currentGps.lng], 13);
    }

  }, [activeEmployeeId, mobileTab, operations, clients, routePolyline, currentGps, searchQuery, filterToday]);

  // List of active interventions for list tab
  const activeJobs = operations.filter(
    op => op.employeeId === activeEmployeeId && (op.status === 'en cours' || op.status === 'planifiée')
  );

  if (activeEmployeeId && !activeEmployee) {
    return (
      <div className="mobile-pane">
        <div className="simulator-label">
          <Compass size={16} /> Simulateur Mobile Employé
        </div>
        <div className="smartphone-frame">
          <div className="phone-notch"></div>
          <div className="phone-status-bar">
            <span>{currentTime.toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' })}</span>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <span>100% 🔋</span>
            </div>
          </div>
          <div className="phone-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#f8fafc' }}>
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #cbd5e1',
                borderTopColor: '#4f46e5',
                borderRadius: '50%',
                margin: '0 auto 0.8rem auto',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Chargement du profil...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  QUI ÊTES-VOUS AUJOURD'HUI ?
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minHeight: 0 }}>
              <div className="mobile-app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={activeEmployee.avatar} alt={activeEmployee.name} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid white' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>Vos missions du jour</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{activeEmployee.name}</div>
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
                  <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0 }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                    {/* Search and Filters Overlay */}
                    <div style={{ position: 'absolute', top: 10, left: 10, right: 50, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="mobile-search-container">
                        <Search size={16} className="mobile-search-icon" />
                        <input 
                          type="text" 
                          placeholder="Où devez-vous aller ?" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="mobile-search-input"
                        />
                      </div>

                      {/* Dropdown de recherche (Résultats) */}
                      {searchQuery && (
                        <div className="mobile-search-dropdown">
                          {(() => {
                            const results = activeJobs.filter(op => {
                              const client = clients.find(c => c.id === op.clientId);
                              return client && client.name.toLowerCase().includes(searchQuery.toLowerCase());
                            });

                            if (results.length === 0) {
                              return <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>Aucun client trouvé</div>;
                            }

                            return results.map(op => {
                              const client = clients.find(c => c.id === op.clientId);
                              return (
                                <div 
                                  key={op.id}
                                  className="mobile-search-dropdown-item"
                                  onClick={() => {
                                    setSelectedOp(op);
                                    setSearchQuery(''); // Clear search to hide dropdown
                                    if (mapInstance.current && client) {
                                      mapInstance.current.setView([client.gps.lat, client.gps.lng], 15);
                                    }
                                  }}
                                >
                                  <div className="mobile-search-dropdown-item-title">{client?.name}</div>
                                  <div className="mobile-search-dropdown-item-desc">
                                    {op.description}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      <div className="mobile-filter-container">
                        <input 
                          type="checkbox" 
                          id="filterToday"
                          checked={filterToday}
                          onChange={e => setFilterToday(e.target.checked)}
                          className="mobile-filter-checkbox"
                        />
                        <label htmlFor="filterToday" className="mobile-filter-label">
                          Aujourd'hui
                        </label>
                      </div>
                    </div>

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

                        {/* Infos client additionnelles pour le technicien terrain */}
                        {(() => {
                          const client = clients.find(c => c.id === selectedOp.clientId);
                          if (!client) return null;
                          return (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              background: '#f8fafc',
                              padding: '0.75rem',
                              borderRadius: '10px',
                              marginBottom: '0.875rem',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.8rem'
                            }}>
                              {client.contactName && (
                                <div style={{ color: '#334155' }}>
                                  👤 Contact : <strong>{client.contactName}</strong>
                                </div>
                              )}
                              {client.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  📞 Tél :{' '}
                                  <a 
                                    href={`tel:${client.phone}`}
                                    style={{
                                      color: '#3b5edb',
                                      textDecoration: 'none',
                                      fontWeight: 'bold',
                                      backgroundColor: '#e0e7ff',
                                      padding: '0.1rem 0.5rem',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem'
                                    }}
                                  >
                                    {client.phone}
                                  </a>
                                </div>
                              )}
                              {client.notes && (
                                <div style={{ 
                                  marginTop: '0.25rem',
                                  paddingTop: '0.4rem',
                                  borderTop: '1px dashed #cbd5e1',
                                  color: '#475569',
                                  fontSize: '0.75rem',
                                  fontStyle: 'italic',
                                  lineHeight: 1.3
                                }}>
                                  💡 <strong>Guidage :</strong> {client.notes}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="sheet-job-desc">
                          {selectedOp.description}
                        </div>

                        {routeInfo && (
                          <div className="sheet-route-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%', marginBottom: '1rem', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '0.85rem', backgroundColor: 'var(--bg-app)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div className="sheet-route-info-item">
                                <Compass size={14} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Distance : <strong style={{ color: 'var(--text-main)' }}>{routeInfo.distance} km</strong></span>
                              </div>
                              <div className="sheet-route-info-item">
                                <Clock size={14} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Temps restant : <strong style={{ color: 'var(--text-main)' }}>{routeInfo.duration} min</strong></span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '0.625rem' }}>
                              <div className="sheet-route-info-item">
                                <span style={{ marginRight: '6px', fontSize: '1rem' }}>🏁</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Arrivée estimée : <strong style={{ color: '#10b981', fontSize: '0.875rem' }}>{getArrivalTime(routeInfo.duration)}</strong></span>
                              </div>
                              <div className="sheet-route-info-item">
                                <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
                                  Trafic fluide
                                </span>
                              </div>
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
                              className="btn btn-primary"
                              style={{ padding: '0.5rem', backgroundColor: '#3b82f6' }}
                              onClick={() => setShowGpsChooser(true)}
                            >
                              <ExternalLink size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> Naviguer
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

                    {/* GPS Chooser Modal */}
                    {showGpsChooser && selectedOp && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ backgroundColor: 'white', width: '100%', padding: '1.5rem', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                          <h4 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Lancer la navigation avec :</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button 
                              className="btn" 
                              style={{ backgroundColor: '#e2e8f0', color: '#0f172a', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '0.75rem 1rem' }}
                              onClick={() => {
                                const client = clients.find(c => c.id === selectedOp.clientId);
                                if (client) {
                                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${client.gps.lat},${client.gps.lng}`, '_blank');
                                }
                                setShowGpsChooser(false);
                              }}
                            >
                              📍 Google Maps
                            </button>
                            <button 
                              className="btn" 
                              style={{ backgroundColor: '#e2e8f0', color: '#0f172a', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '0.75rem 1rem' }}
                              onClick={() => {
                                const client = clients.find(c => c.id === selectedOp.clientId);
                                if (client) {
                                  window.open(`https://waze.com/ul?ll=${client.gps.lat},${client.gps.lng}&navigate=yes`, '_blank');
                                }
                                setShowGpsChooser(false);
                              }}
                            >
                              🚗 Waze
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ marginTop: '0.5rem' }}
                              onClick={() => setShowGpsChooser(false)}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                ) : mobileTab === 'list' ? (
                  /* LIST TAB */
                  <div className="mobile-job-list">
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem', padding: '0 0.5rem' }}>
                      MES INTERVENTIONS ({activeJobs.length})
                    </div>
                    {activeJobs.map(op => {
                      const client = clients.find(c => c.id === op.clientId);
                      const dist = getDistance(activeEmployee.gps, client?.gps);
                      
                      return (
                        <div 
                          key={op.id} 
                          className="mobile-job-card"
                          style={{ position: 'relative' }}
                          onClick={() => {
                            setSelectedOp(op);
                            if (op.status === 'planifiée') {
                              handleStatusChange(op.id, 'en cours');
                            }
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
                            <span><MapPin size={12} style={{display:'inline', verticalAlign:'middle'}}/> {client?.address.split(',')[0]}</span>
                            <span><Navigation size={12} style={{display:'inline', verticalAlign:'middle'}}/> {dist.toFixed(1)} km</span>
                          </div>
                          <button 
                            style={{ position: 'absolute', right: '1rem', bottom: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOp(op);
                              setMobileTab('map');
                            }}
                          >
                            <Navigation size={14} />
                          </button>
                        </div>
                      );
                    })}
                    {activeJobs.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 1rem' }}>
                        🎉 Félicitations ! Toutes vos missions sont terminées pour aujourd'hui.
                      </div>
                    )}
                  </div>
                ) : (
                  /* SETTINGS / PROFILE TAB */
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    background: '#f4f6fb',
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    {/* ── Avatar section ── */}
                    <div style={{ background: 'linear-gradient(135deg,#1a2244,#3b5edb)', padding: '1.5rem 1rem 2.5rem', textAlign: 'center', position: 'relative' }}>
                      <div
                        style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                        onClick={() => profileFileRef.current?.click()}
                      >
                        <img
                          src={profileAvatar || activeEmployee.avatar}
                          alt={activeEmployee.name}
                          style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid white', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute', bottom: 0, right: 0,
                          background: '#3b5edb', borderRadius: '50%',
                          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid white', cursor: 'pointer'
                        }}>
                          <Camera size={13} color="white" />
                        </div>
                      </div>
                      <input ref={profileFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => processProfileFile(e.target.files[0])} />
                      <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', marginTop: '0.5rem' }}>{activeEmployee.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>{activeEmployee.email}</div>
                      {profileAvatar && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={() => setProfileAvatar(null)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '20px', cursor: 'pointer' }}>✕ Annuler</button>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '-1rem' }}>

                      {/* ── Personal info card ── */}
                      <div style={{ background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem', color: '#1a2744', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <User size={14} color="#3b5edb" /> Informations personnelles
                        </div>

                        {profileError && (
                          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#dc2626', fontSize: '0.78rem' }}>
                            <AlertCircle size={14} />{profileError}
                          </div>
                        )}
                        {profileSuccess && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#16a34a', fontSize: '0.78rem' }}>
                            <CheckCheck size={14} />{profileSuccess}
                          </div>
                        )}

                        {/* Name */}
                        <div style={{ marginBottom: '0.625rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                            <User size={12} /> Nom complet
                          </label>
                          <input
                            value={profileForm.name}
                            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                            placeholder={activeEmployee.name}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#3b5edb'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                          />
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: '0.625rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                            <Mail size={12} /> Adresse email
                          </label>
                          <input
                            type="email"
                            value={profileForm.email}
                            onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                            placeholder={activeEmployee.email}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#3b5edb'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                          />
                        </div>

                        {/* Phone */}
                        <div style={{ marginBottom: '0.875rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                            <Phone size={12} /> Téléphone
                          </label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder={activeEmployee.phone}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#3b5edb'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                          />
                        </div>

                        <button
                          onClick={handleSaveProfile}
                          disabled={profileLoading}
                          style={{
                            width: '100%', padding: '0.65rem', borderRadius: '12px', border: 'none',
                            background: profileLoading ? '#93c5fd' : 'linear-gradient(135deg,#2d3a6d,#3b5edb)',
                            color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: profileLoading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,94,219,0.3)'
                          }}
                        >
                          {profileLoading ? (
                            <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Enregistrement…</>
                          ) : (
                            <><Save size={15} /> Sauvegarder le profil</>
                          )}
                        </button>
                      </div>

                      {/* ── Password card ── */}
                      <div style={{ background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem', color: '#1a2744', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <Lock size={14} color="#3b5edb" /> Changer le mot de passe
                        </div>

                        {pwdError && (
                          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#dc2626', fontSize: '0.78rem' }}>
                            <AlertCircle size={14} />{pwdError}
                          </div>
                        )}
                        {pwdSuccess && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#16a34a', fontSize: '0.78rem' }}>
                            <CheckCheck size={14} />{pwdSuccess}
                          </div>
                        )}

                        {[{ label: 'Mot de passe actuel', key: 'current', show: showCurrent, toggle: () => setShowCurrent(p => !p) },
                          { label: 'Nouveau mot de passe', key: 'next', show: showNext, toggle: () => setShowNext(p => !p) },
                          { label: 'Confirmer le nouveau', key: 'confirm', show: showConfirm, toggle: () => setShowConfirm(p => !p) }]
                          .map(({ label, key, show, toggle }) => (
                            <div key={key} style={{ marginBottom: '0.625rem', position: 'relative' }}>
                              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type={show ? 'text' : 'password'}
                                  value={pwdForm[key]}
                                  onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                                  style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                  onFocus={e => e.target.style.borderColor = '#3b5edb'}
                                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                                <button
                                  type="button"
                                  onClick={toggle}
                                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex' }}
                                >
                                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>
                          ))
                        }

                        <button
                          onClick={handleChangePassword}
                          disabled={pwdLoading || !pwdForm.current || !pwdForm.next || !pwdForm.confirm}
                          style={{
                            width: '100%', padding: '0.65rem', borderRadius: '12px', border: 'none',
                            background: (pwdLoading || !pwdForm.current || !pwdForm.next || !pwdForm.confirm) ? '#cbd5e1' : 'linear-gradient(135deg,#0f172a,#1d4ed8)',
                            color: 'white', fontWeight: 700, fontSize: '0.85rem',
                            cursor: (pwdLoading || !pwdForm.current || !pwdForm.next || !pwdForm.confirm) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          {pwdLoading ? (
                            <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> En cours…</>
                          ) : (
                            <><Lock size={15} /> Modifier le mot de passe</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MOBILE APP BOTTOM NAV */}
              <div className="mobile-app-nav">
                <button 
                  className={`mobile-nav-item ${mobileTab === 'map' ? 'active' : ''}`}
                  onClick={() => setMobileTab('map')}
                >
                  <Map size={16} />
                  <span>Carte</span>
                </button>
                <button 
                  className={`mobile-nav-item ${mobileTab === 'list' ? 'active' : ''}`}
                  onClick={() => setMobileTab('list')}
                >
                  <List size={16} />
                  <span>Liste</span>
                </button>
                <button 
                  className={`mobile-nav-item ${mobileTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setMobileTab('settings')}
                >
                  <Settings size={16} />
                  <span>Profil</span>
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
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                
                if (val === 'CUSTOM') {
                  const addressInput = prompt("Entrez un nom de lieu ou de quartier à Abidjan\nExemple : Riviera 3, Yopougon Maroc, Plateau");
                  if (!addressInput) return;
                  
                  // Geocoding query to OpenStreetMap Nominatim
                  const query = `${addressInput}, Abidjan, Côte d'Ivoire`;
                  fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
                    .then(res => res.json())
                    .then(data => {
                      if (data && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        
                        updateEmployeeGps(activeEmployee.id, { lat, lng });
                        setRoutePolyline(null);
                        setRouteInfo(null);
                        addNotification({
                          title: "Relocalisation réussie",
                          body: `Positionné à : ${data[0].display_name.split(',')[0]} (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`
                        });
                      } else {
                        alert("Lieu introuvable à Abidjan. Essayez d'être plus précis (ex: Cocody Mermoz).");
                      }
                    })
                    .catch(err => {
                      console.error("Geocoding error", err);
                      alert("Erreur lors de la recherche de l'adresse.");
                    });
                  return;
                }

                const coords = val.split(',').map(Number);
                updateEmployeeGps(activeEmployee.id, { lat: coords[0], lng: coords[1] });
                setRoutePolyline(null);
                setRouteInfo(null);
                addNotification({
                  title: "Position GPS mise à jour",
                  body: `Nouvelles coordonnées : Lat ${coords[0]}, Lng ${coords[1]}`
                });
              }}
            >
              <option value="" disabled>Choisir position...</option>
              <option value="5.3245,-4.0205">Plateau (Position Initiale)</option>
              <option value="5.3571,-3.9897">Cocody (St-Jean)</option>
              <option value="5.3955,-3.9710">Angré (CNPS)</option>
              <option value="5.3050,-3.9785">Marcory (Zone 4)</option>
              <option value="5.3450,-4.0750">Yopougon (Siporex)</option>
              <option value="CUSTOM">📍 Position personnalisée...</option>
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

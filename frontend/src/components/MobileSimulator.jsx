import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import {
  LogOut,
  Map,
  List,
  Navigation,
  Clock,
  WifiOff,
  Compass,
  ChevronRight,
  MapPin,
  ExternalLink,
  Settings,
  User,
  Camera,
  Lock,
  Phone,
  Mail,
  Save,
  Eye,
  EyeOff,
  CheckCheck,
  AlertCircle,
  Monitor,
  Sun,
  Moon,
  X,
  Menu,
  History,
  AlertTriangle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

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
  currentUser,
  isMobileScreen = false,
  portalLogout,
  toggleTheme,
  setLayoutMode,
  activeNotification,
}) {
  const getArrivalTime = (durationMinutes) => {
    const now = new Date();
    const mins = Math.round(parseFloat(durationMinutes) || 0);
    now.setMinutes(now.getMinutes() + mins);
    return now.toLocaleTimeString("fr-CI", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const geocodeAndRelocalize = async (addressInput) => {
    if (!addressInput || !addressInput.trim()) return;

    const queries = [
      addressInput + ", Abidjan, Côte d'Ivoire",
      addressInput + ", Côte d'Ivoire",
      addressInput,
    ];

    const tryGeocode = async (index) => {
      if (index >= queries.length) return null;
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?q=` +
          `${encodeURIComponent(queries[index])}` +
          `&countrycodes=ci&format=json&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) {
          return data[0];
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Relocation geocode ${index} failed:`, err);
      }
      return tryGeocode(index + 1);
    };

    const foundData = await tryGeocode(0);

    if (foundData) {
      const lat = parseFloat(foundData.lat);
      const lng = parseFloat(foundData.lon);
      updateEmployeeGps(activeEmployeeId, { lat, lng });
      setRoutePolyline(null);
      setRouteInfo(null);
      addNotification({
        title: "Relocalisation réussie",
        body:
          `Positionné à : ${foundData.display_name.split(",")[0]} ` +
          `(Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`,
      });
      setShowCustomRelocation(false);
      setCustomRelocationText("");
    } else {
      addNotification({
        title: "Lieu introuvable",
        body:
          "Impossible de situer ce lieu à Abidjan. " +
          "Vérifiez l'orthographe.",
      });
    }
  };

  const [mobileTab, setMobileTab] = useState("map"); // 'map', 'list', 'settings'

  // ── Profile / Settings state ───────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [profileAvatar, setProfileAvatar] = useState(null); // base64 preview
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [pwdForm, setPwdForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const profileFileRef = useRef(null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [liveLocationSharing, setLiveLocationSharing] = useState(true);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCustomRelocation, setShowCustomRelocation] = useState(false);
  const [customRelocationText, setCustomRelocationText] = useState("");
  const [routePolyline, setRoutePolyline] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // distance en km et duree en minutes

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
    if (selectedOp && selectedOp.status === "en cours" && !routeInfo) {
      handleCalculateRoute(selectedOp);
    }
  }, [selectedOp, routeInfo]);

  // Offline Simulation
  const [isOffline, setIsOffline] = useState(false);
  const [offlineCache, setOfflineCache] = useState(null);

  // External GPS launch simulator modal
  const [showGpsChooser, setShowGpsChooser] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
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
  const activeEmployee = employees.find((e) => e.id === activeEmployeeId);

  // Sync profile form when active employee changes or settings tab opens
  useEffect(() => {
    if (activeEmployee && mobileTab === "settings") {
      setProfileForm({
        name: activeEmployee.name,
        email: activeEmployee.email,
        phone: activeEmployee.phone,
      });
      setProfileAvatar(null);
      setProfileSuccess("");
      setProfileError("");
      setPwdForm({ current: "", next: "", confirm: "" });
      setPwdSuccess("");
      setPwdError("");
    }
  }, [mobileTab, activeEmployee?.id]);

  // Process photo file for profile
  const processProfileFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Choisissez une image (JPG, PNG, WebP…).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("La photo ne doit pas dépasser 5 Mo.");
      return;
    }
    setProfileError("");
    const reader = new FileReader();
    reader.onload = (ev) => setProfileAvatar(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  // Save profile info
  const handleSaveProfile = async () => {
    if (!activeEmployee) return;
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const token = localStorage.getItem("token");
      const body = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        avatar: profileAvatar !== null ? profileAvatar : undefined,
      };
      const res = await fetch(
        `${API_URL}/api/employees/${activeEmployee.id}/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de sauvegarde.");

      // Propagate to parent App so all components (header, map, lists) update immediately
      if (onProfileUpdated) onProfileUpdated(data);

      // Keep avatar preview in sync
      if (profileAvatar) setProfileAvatar(data.avatar || profileAvatar);

      setProfileSuccess("Profil mis à jour avec succès !");
      addNotification({
        title: " Profil mis à jour",
        body: "Vos informations ont été enregistrées.",
      });
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!activeEmployee) return;
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (pwdForm.next.length < 6) {
      setPwdError(
        "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }
    setPwdLoading(true);
    setPwdError("");
    setPwdSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/employees/${activeEmployee.id}/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: pwdForm.current,
            newPassword: pwdForm.next,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur.");
      setPwdSuccess("Mot de passe modifié avec succès !");
      setPwdForm({ current: "", next: "", confirm: "" });
      addNotification({
        title: " Mot de passe modifié",
        body: "Votre nouveau mot de passe est actif.",
      });
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
    const dLat = ((gps2.lat - gps1.lat) * Math.PI) / 180;
    const dLng = ((gps2.lng - gps1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((gps1.lat * Math.PI) / 180) *
        Math.cos((gps2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
      [end.lat, end.lng],
    ];
  };

  // Connect active employee
  const handleLogin = (empId) => {
    setActiveEmployeeId(empId);
    addNotification({
      title: "Connexion réussie",
      body: `Connecté en tant que ${employees.find((e) => e.id === empId).name}`,
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

    if (currentUser && currentUser.role === "admin") {
      return;
    }

    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setRealGps({ lat: latitude, lng: longitude });
          updateEmployeeGps(activeEmployeeId, {
            lat: latitude,
            lng: longitude,
          });
        },
        (error) => {
          console.warn("GPS Réel indisponible, fallback au GPS de test", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 },
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeEmployeeId, currentUser]);

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
      addNotification({
        title: "Mode Hors-ligne",
        body:
          "Calcul d'itinéraire impossible hors-ligne. Affichage des " +
          "coordonnées en cache.",
      });
      return;
    }

    const client = clients.find((c) => c.id === op.clientId);
    if (!client || !activeEmployee) return;

    const start = currentGps;
    const end = client.gps;

    // Calculate real route using leaflet-routing-machine
    if (routingControl.current) {
      routingControl.current.setWaypoints([
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng),
      ]);

      routingControl.current.on("routesfound", function (e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        const distKm = (summary.totalDistance / 1000).toFixed(1);
        const timeMin = Math.round(summary.totalTime / 60);

        setRouteInfo({
          distance: distKm,
          duration: timeMin,
        });

        // Set route polyline so the line is drawn on the map and action buttons appear
        if (routes[0] && routes[0].coordinates) {
          const coords = routes[0].coordinates.map((c) => [c.lat, c.lng]);
          setRoutePolyline(coords);
        }

        addNotification({
          title: "Itinéraire calculé",
          body: `Trajet vers ${client.name} : ${distKm} km, env. ${timeMin} min`,
        });
      });

      routingControl.current.on("routingerror", function (e) {
        console.error("Erreur de routage OSRM:", e);
        // Fallback to zigzag if network fails
        const distance = getDistance(start, end);
        const duration = Math.round((distance / 30) * 60) + 2;
        setRoutePolyline(getRouteCoords(start, end));
        setRouteInfo({ distance: distance.toFixed(1), duration });
        addNotification({
          title: "Itinéraire calculé (dégradé)",
          body: `Trajet vers ${client.name} : ${distance.toFixed(1)} km, env. ${duration} min`,
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
        body: `Trajet vers ${client.name} : ${distance.toFixed(1)} km, env. ${duration} min`,
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

    const op = operations.find((o) => o.id === opId);
    const client = clients.find((c) => c.id === op?.clientId);

    addNotification({
      title: `Statut mis à jour`,
      body: `L'opération chez ${client?.name || "Client"} est désormais : ${newStatus}`,
    });

    // If finished, clear route and selected job
    if (newStatus === "terminée") {
      stopMovementSimulation();
      setSelectedOp(null);
      setRoutePolyline(null);
      setRouteInfo(null);
      if (routingControl.current) {
        routingControl.current.setWaypoints([]);
      }
    } else if (newStatus === "en cours" && op) {
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
          body: `Vous êtes arrivé chez le client.`,
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
        (op) =>
          op.employeeId === activeEmployeeId &&
          (op.status === "en cours" || op.status === "planifiée"),
      );
      const cachedData = activeOps.map((op) => {
        const client = clients.find((c) => c.id === op.clientId);
        return {
          ...op,
          clientName: client?.name,
          clientAddress: client?.address,
          clientGps: client?.gps,
        };
      });
      setOfflineCache(cachedData);
    } else {
      setOfflineCache(null);
    }
  }, [isOffline, activeEmployeeId, operations, clients]);

  // Leaflet map initialization
  useEffect(() => {
    if (
      !activeEmployeeId ||
      !activeEmployee ||
      mobileTab !== "map" ||
      !mapRef.current
    )
      return;

    // Initialize Map centered on employee
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false, // Cleaner UI
      attributionControl: false, // Minimalist phone UI
    }).setView([currentGps.lat, currentGps.lng], 13);

    // Always use standard light voyager tile layer
    const tileUrl =
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
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
        styles: [{ color: "#4f46e5", weight: 6, opacity: 0.8 }],
      },
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

  // Sync selectedOp with latest operations data from props to avoid stale status buttons
  useEffect(() => {
    if (selectedOp) {
      const freshOp = operations.find((o) => o.id === selectedOp.id);
      if (freshOp) {
        if (
          freshOp.status !== selectedOp.status ||
          freshOp.employeeId !== selectedOp.employeeId
        ) {
          setSelectedOp(freshOp);
        }
      } else {
        setSelectedOp(null);
      }
    }
  }, [operations]);

  // Redraw Mobile Map markers and routes
  useEffect(() => {
    if (
      !activeEmployeeId ||
      !activeEmployee ||
      mobileTab !== "map" ||
      !mapInstance.current ||
      !markersGroup.current
    )
      return;

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
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    });
    markersGroup.current.addLayer(techMarker);

    // 2. Client markers
    const today = new Date().toISOString().split("T")[0];
    const assignedOps = operations
      .filter(
        (op) =>
          op.employeeId === activeEmployeeId &&
          (op.status === "en cours" || op.status === "planifiée"),
      )
      .filter((op) => {
        if (filterToday && op.date !== today) return false;
        const client = clients.find((c) => c.id === op.clientId);
        if (
          searchQuery &&
          client &&
          !client.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      });

    assignedOps.forEach((op) => {
      const client = clients.find((c) => c.id === op.clientId);
      if (!client) return;

      const pinColor = op.status === "en cours" ? "#0f9d58" : "#1a73e8";
      const markerEmoji = client.type === "entreprise" ? "" : "";
      const markerHtml = `
        <div style="position: relative; width: 34px; height: 42px;
                    display: flex; align-items: center;
                    justify-content: center;">
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none"
               xmlns="http://www.w3.org/2000/svg"
               style="filter: drop-shadow(0px 3px 4px rgba(0, 0, 0, 0.25));">
            <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 42 17 42C17 42
                     34 29.75 34 17C34 7.61 26.39 0 17 0Z"
                  fill="${pinColor}"/>
            <circle cx="17" cy="17" r="11" fill="white"/>
          </svg>
          <span style="position: absolute; top: 7px; left: 50%;
                       transform: translateX(-50%); font-size: 14px;
                       pointer-events: none;">${markerEmoji}</span>
        </div>
      `;

      const clientMarker = L.marker([client.gps.lat, client.gps.lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: "",
          iconSize: [34, 42],
          iconAnchor: [17, 42],
        }),
      });

      clientMarker.on("click", () => {
        setSelectedOp(op);
      });

      markersGroup.current.addLayer(clientMarker);
    });

    // 3. Draw active route polyline
    if (routePolyline) {
      const poly = L.polyline(routePolyline, {
        color: "#6366f1",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(routeLayer.current);

      // Fit map to show both markers
      mapInstance.current.fitBounds(poly.getBounds(), { padding: [40, 40] });
    } else if (assignedOps.length > 0) {
      const bounds = L.latLngBounds([currentGps.lat, currentGps.lng]);
      assignedOps.forEach((op) => {
        const client = clients.find((c) => c.id === op.clientId);
        if (client) {
          bounds.extend([client.gps.lat, client.gps.lng]);
        }
      });
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      mapInstance.current.setView([currentGps.lat, currentGps.lng], 13);
    }
  }, [
    activeEmployeeId,
    mobileTab,
    operations,
    clients,
    routePolyline,
    currentGps,
    searchQuery,
    filterToday,
  ]);

  // List of active interventions for list tab
  const activeJobs = operations.filter(
    (op) =>
      op.employeeId === activeEmployeeId &&
      (op.status === "en cours" || op.status === "planifiée"),
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
            <span>
              {currentTime.toLocaleTimeString("fr-CI", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div
              style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}
            >
              <span>100% </span>
            </div>
          </div>
          <div
            className="phone-screen"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ textAlign: "center", color: "#64748b" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: "3px solid #cbd5e1",
                  borderTopColor: "#4f46e5",
                  borderRadius: "50%",
                  margin: "0 auto 0.8rem auto",
                  animation: "spin 1s linear infinite",
                }}
              ></div>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                Chargement du profil...
              </div>
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

      <div className="simulator-workspace-layout">
        <div className="smartphone-frame">
          {/* Notch & Status bar */}
          <div className="phone-notch"></div>
          <div className="phone-status-bar">
            <span>
              {new Date().toLocaleTimeString("fr-CI", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div
              style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}
            >
              {isOffline ? (
                <WifiOff size={12} style={{ color: "#ef4444" }} />
              ) : (
                ""
              )}
              <span>100% </span>
            </div>
          </div>

          {/* SIDE DRAWER MENU (Google Maps Style) */}
          <div
            className={`mobile-drawer-overlay ${isDrawerOpen ? "open" : ""}`}
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          <div className={`mobile-drawer ${isDrawerOpen ? "open" : ""}`}>
            <div className="drawer-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <img
                  src={activeEmployee?.avatar}
                  alt="avatar"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "2px solid white",
                    objectFit: "cover",
                  }}
                />
                <div className="drawer-user-info">
                  <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                    {activeEmployee?.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>
                    {activeEmployee?.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-menu-list">
              {/* Live Location Sharing */}
              <div
                className="drawer-menu-item"
                style={{ cursor: "default", justifyContent: "space-between" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <Navigation
                    size={18}
                    style={{
                      color: liveLocationSharing ? "#10b981" : "#94a3b8",
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Partage de position</div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {liveLocationSharing ? "Actif" : "Désactivé"}
                    </div>
                  </div>
                </div>
                <label className="mobile-switch">
                  <input
                    type="checkbox"
                    checked={liveLocationSharing}
                    onChange={() => {
                      setLiveLocationSharing(!liveLocationSharing);
                      addNotification({
                        title: !liveLocationSharing
                          ? "Partage de position activé"
                          : "Partage de position suspendu",
                        body: !liveLocationSharing
                          ? "Les administrateurs peuvent suivre votre position."
                          : "Votre position GPS n'est plus partagée.",
                      });
                    }}
                  />
                  <span className="mobile-switch-slider"></span>
                </label>
              </div>

              {/* Trip History */}
              <button
                className="drawer-menu-item"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setShowHistoryModal(true);
                }}
              >
                <History size={18} style={{ color: "#3b5edb" }} />
                <span>Historique des trajets</span>
              </button>

              {/* Report Address Issue */}
              <button
                className="drawer-menu-item"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setShowReportIssueModal(true);
                }}
              >
                <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
                <span>Signaler une erreur d'adresse</span>
              </button>

              {/* Change Profile Settings */}
              <button
                className="drawer-menu-item"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setMobileTab("settings");
                }}
              >
                <Settings size={18} style={{ color: "#64748b" }} />
                <span>Paramètres du profil</span>
              </button>

              {/* Logout */}
              <button
                className="drawer-menu-item danger"
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (currentUser?.role === "employee" && portalLogout) {
                    portalLogout();
                  } else {
                    handleLogout();
                  }
                }}
              >
                <LogOut size={18} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>

          <div className="phone-screen">
            {isOffline && (
              <div className="offline-banner">
                <WifiOff size={14} /> Mode Hors-ligne actif (Données en cache)
              </div>
            )}

            {activeNotification && (
              <div
                className="notif-toast"
                style={{
                  position: "absolute",
                  top: isOffline ? "42px" : "10px",
                  left: "10px",
                  right: "10px",
                  zIndex: 1100,
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    color: "#818cf8",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  ●
                </div>
                <div className="notif-content">
                  <div
                    className="notif-title"
                    style={{ color: "white", fontWeight: "bold" }}
                  >
                    {activeNotification.title}
                  </div>
                  <div className="notif-body">{activeNotification.body}</div>
                </div>
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
                <p className="mobile-login-subtitle">
                  Portail de guidage employé
                </p>

                <div className="technician-selector-list">
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#64748b",
                      marginBottom: "0.25rem",
                      textAlign: "left",
                    }}
                  >
                    QUI ÊTES-VOUS AUJOURD'HUI ?
                  </p>
                  {employees
                    .filter((e) => e.role === "employee")
                    .map((emp) => (
                      <div
                        key={emp.id}
                        className="tech-select-card"
                        onClick={() => handleLogin(emp.id)}
                      >
                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className="tech-avatar"
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                            {emp.name}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "#64748b" }}
                          >
                            Technicien terrain
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          style={{ marginLeft: "auto", color: "#cbd5e1" }}
                        />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* 2. ACTIVE APPLICATION APP */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  overflow: "hidden",
                  minHeight: 0,
                }}
              >
                {mobileTab !== "map" && (
                  <div className="mobile-app-header">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <img
                        src={activeEmployee.avatar}
                        alt={activeEmployee.name}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          border: "2px solid white",
                        }}
                      />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800 }}>
                          Vos missions du jour
                        </div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                          {activeEmployee.name}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        alignItems: "center",
                      }}
                    >
                      {isMobileScreen && toggleTheme && (
                        <button
                          onClick={toggleTheme}
                          style={{
                            background: "none",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                          }}
                          title="Changer le thème"
                        >
                          {theme === "light" ? (
                            <Moon size={18} />
                          ) : (
                            <Sun size={18} />
                          )}
                        </button>
                      )}
                      {currentUser?.role === "admin" && setLayoutMode && (
                        <button
                          onClick={() => setLayoutMode("admin")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                          }}
                          title="Retour au portail d'administration"
                        >
                          <Monitor size={18} />
                        </button>
                      )}
                      <button
                        onClick={
                          currentUser?.role === "employee" && portalLogout
                            ? portalLogout
                            : handleLogout
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          display: "flex",
                        }}
                        title="Se déconnecter"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* MOBILE APP BODY */}
                <div className="mobile-app-body">
                  {mobileTab === "map" ? (
                    /* MAP TAB */
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        flex: 1,
                        minHeight: 0,
                      }}
                    >
                      <div
                        ref={mapRef}
                        style={{ width: "100%", height: "100%" }}
                      />

                      {/* Search and Filters Overlay (Google Maps Style) */}
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          right: 12,
                          zIndex: 1000,
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.625rem",
                        }}
                      >
                        <div className="mobile-search-container">
                          <div
                            onClick={() => setIsDrawerOpen(true)}
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              marginRight: "0.6rem",
                              color: "var(--text-muted)",
                            }}
                            title="Menu principal"
                          >
                            <Menu size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="Où devez-vous aller ?"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="mobile-search-input"
                          />
                          {activeEmployee?.avatar && (
                            <div
                              onClick={() => setMobileTab("settings")}
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                marginLeft: "0.5rem",
                              }}
                              title="Mon Profil"
                            >
                              <img
                                src={activeEmployee.avatar}
                                alt="avatar"
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  border: "1.5px solid #1a73e8",
                                  objectFit: "cover",
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Dropdown de recherche (Résultats) */}
                        {searchQuery && (
                          <div className="mobile-search-dropdown">
                            {(() => {
                              const results = activeJobs.filter((op) => {
                                const client = clients.find(
                                  (c) => c.id === op.clientId,
                                );
                                return (
                                  client &&
                                  client.name
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase())
                                );
                              });

                              if (results.length === 0) {
                                return (
                                  <div
                                    style={{
                                      padding: "0.75rem",
                                      fontSize: "0.8rem",
                                      color: "#64748b",
                                      textAlign: "center",
                                    }}
                                  >
                                    Aucun client trouvé
                                  </div>
                                );
                              }

                              return results.map((op) => {
                                const client = clients.find(
                                  (c) => c.id === op.clientId,
                                );
                                return (
                                  <div
                                    key={op.id}
                                    className="mobile-search-dropdown-item"
                                    onClick={() => {
                                      setSelectedOp(op);
                                      setSearchQuery(""); // Clear search to hide dropdown
                                      if (mapInstance.current && client) {
                                        mapInstance.current.setView(
                                          [client.gps.lat, client.gps.lng],
                                          15,
                                        );
                                      }
                                    }}
                                  >
                                    <div className="mobile-search-dropdown-item-title">
                                      {client?.name}
                                    </div>
                                    <div className="mobile-search-dropdown-item-desc">
                                      {op.description}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}

                        {/* Horizontal filter chips row */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            className={`mobile-filter-pill ${filterToday ? "active" : ""}`}
                            onClick={() => setFilterToday((t) => !t)}
                          >
                            Aujourd'hui
                          </button>
                          <div className="mobile-status-pill">
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: isOffline
                                  ? "#ef4444"
                                  : "#10b981",
                                display: "inline-block",
                                boxShadow: isOffline
                                  ? "0 0 6px #ef4444"
                                  : "0 0 6px #10b981",
                              }}
                            />
                            <span
                              style={{
                                color: isOffline ? "#ef4444" : "#10b981",
                              }}
                            >
                              {isOffline ? "Hors-ligne" : "En ligne"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Floating circular map controls (Google Maps style) */}
                      <div
                        style={{
                          position: "absolute",
                          top: 130,
                          right: 12,
                          zIndex: 1000,
                        }}
                      >
                        <button
                          onClick={handleCenterMap}
                          className="mobile-floating-btn"
                          style={{
                            color: "var(--primary)",
                            width: "38px",
                            height: "38px",
                          }}
                          title="Centrer sur ma position"
                        >
                          <Navigation
                            size={16}
                            style={{
                              transform: "rotate(45deg)",
                              fill: "currentColor",
                            }}
                          />
                        </button>
                      </div>

                      {/* Bottom sheet for operation detail */}
                      {selectedOp && (
                        <div
                          className={
                            `mobile-bottom-sheet ` +
                            `${selectedOp ? "open" : ""} ` +
                            `${sheetExpanded ? "expanded" : ""}`
                          }
                        >
                          <div
                            className="sheet-drag-handle"
                            onClick={() => setSheetExpanded(!sheetExpanded)}
                            style={{ cursor: "pointer" }}
                            title={sheetExpanded ? "Réduire" : "Dérouler"}
                          ></div>
                          <div
                            className="sheet-scrollable-content"
                            style={{
                              overflowY: "auto",
                              flex: 1,
                              marginBottom: "0.75rem",
                              paddingRight: "4px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                            }}
                          >
                            <div
                              className="sheet-header"
                              style={{ marginBottom: 0 }}
                            >
                              <div className="sheet-client-name">
                                {clients.find(
                                  (c) => c.id === selectedOp.clientId,
                                )?.name || "Client"}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span
                                  className={`badge badge-${selectedOp.status}`}
                                >
                                  {selectedOp.status}
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedOp(null);
                                    setSheetExpanded(false);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    padding: "0.2rem",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Fermer"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                            <div
                              className="sheet-address"
                              style={{ marginBottom: 0 }}
                            >
                              <MapPin size={12} />
                              {clients.find((c) => c.id === selectedOp.clientId)
                                ?.address || ""}
                            </div>

                            {/* Infos client additionnelles pour le technicien terrain */}
                            {(() => {
                              const client = clients.find(
                                (c) => c.id === selectedOp.clientId,
                              );
                              if (!client) return null;
                              return (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.4rem",
                                    background: "var(--bg-app)",
                                    padding: "0.75rem",
                                    borderRadius: "0px",
                                    border: "1px solid var(--border-color)",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  {client.contactName && (
                                    <div style={{ color: "var(--text-main)" }}>
                                      Contact :{" "}
                                      <strong>{client.contactName}</strong>
                                    </div>
                                  )}
                                  {client.phone && (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                      }}
                                    >
                                      Tél :{" "}
                                      <a
                                        href={`tel:${client.phone}`}
                                        style={{
                                          color: "#3b5edb",
                                          textDecoration: "none",
                                          fontWeight: "bold",
                                          backgroundColor: "#e0e7ff",
                                          padding: "0.1rem 0.5rem",
                                          borderRadius: "0px",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.2rem",
                                        }}
                                      >
                                        {client.phone}
                                      </a>
                                    </div>
                                  )}
                                  {client.notes && (
                                    <div
                                      style={{
                                        marginTop: "0.25rem",
                                        paddingTop: "0.4rem",
                                        borderTop:
                                          "1px dashed var(--border-color)",
                                        color: "var(--text-muted)",
                                        fontSize: "0.75rem",
                                        fontStyle: "italic",
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      <strong>Guidage :</strong> {client.notes}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <div
                              className="sheet-job-desc"
                              style={{ marginBottom: 0 }}
                            >
                              {selectedOp.description}
                            </div>

                            {routeInfo && (
                              <div
                                className="sheet-route-info"
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.625rem",
                                  width: "100%",
                                  border: "1px dashed var(--border-color)",
                                  borderRadius: "0px",
                                  padding: "0.85rem",
                                  backgroundColor: "var(--bg-app)",
                                  marginBottom: 0,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                  }}
                                >
                                  <div className="sheet-route-info-item">
                                    <Compass
                                      size={14}
                                      style={{ color: "var(--primary)" }}
                                    />
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      Distance :{" "}
                                      <strong
                                        style={{ color: "var(--text-main)" }}
                                      >
                                        {routeInfo.distance} km
                                      </strong>
                                    </span>
                                  </div>
                                  <div className="sheet-route-info-item">
                                    <Clock
                                      size={14}
                                      style={{ color: "var(--primary)" }}
                                    />
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      Temps restant :{" "}
                                      <strong
                                        style={{ color: "var(--text-main)" }}
                                      >
                                        {routeInfo.duration} min
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                    borderTop: "1px solid var(--border-color)",
                                    paddingTop: "0.625rem",
                                  }}
                                >
                                  <div className="sheet-route-info-item">
                                    <span
                                      style={{
                                        marginRight: "6px",
                                        fontSize: "1rem",
                                      }}
                                    ></span>
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      Arrivée estimée :{" "}
                                      <strong
                                        style={{
                                          color: "#10b981",
                                          fontSize: "0.875rem",
                                        }}
                                      >
                                        {getArrivalTime(routeInfo.duration)}
                                      </strong>
                                    </span>
                                  </div>
                                  <div className="sheet-route-info-item">
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "#10b981",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: "8px",
                                          height: "8px",
                                          borderRadius: "50%",
                                          backgroundColor: "#10b981",
                                          display: "inline-block",
                                          boxShadow: "0 0 8px #10b981",
                                        }}
                                      ></span>
                                      Trafic fluide
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="sheet-actions">
                            {selectedOp.status === "planifiée" && (
                              <button
                                className="btn btn-primary"
                                style={{ flex: 1, padding: "0.5rem" }}
                                onClick={() =>
                                  handleStatusChange(selectedOp.id, "en cours")
                                }
                              >
                                Démarrer la mission
                              </button>
                            )}
                            {selectedOp.status === "en cours" && (
                              <>
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    flex: 1,
                                    padding: "0.5rem",
                                    backgroundColor: "#e2e8f0",
                                    color: "#0f172a",
                                  }}
                                  onClick={() =>
                                    handleStatusChange(
                                      selectedOp.id,
                                      "planifiée",
                                    )
                                  }
                                >
                                  En pause
                                </button>
                                <button
                                  className="btn"
                                  style={{
                                    flex: 1.2,
                                    padding: "0.5rem",
                                    backgroundColor: "var(--success)",
                                    color: "white",
                                  }}
                                  onClick={() =>
                                    handleStatusChange(
                                      selectedOp.id,
                                      "terminée",
                                    )
                                  }
                                >
                                  Terminer
                                </button>
                              </>
                            )}
                            {!routePolyline &&
                              selectedOp.status !== "terminée" && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "0.5rem" }}
                                  onClick={() =>
                                    handleCalculateRoute(selectedOp)
                                  }
                                >
                                  Itinéraire
                                </button>
                              )}
                            {routePolyline && (
                              <button
                                className="btn btn-primary"
                                style={{
                                  padding: "0.5rem",
                                  backgroundColor: "#3b82f6",
                                }}
                                onClick={() => setShowGpsChooser(true)}
                              >
                                <ExternalLink
                                  size={16}
                                  style={{
                                    display: "inline",
                                    marginRight: 4,
                                    verticalAlign: "text-bottom",
                                  }}
                                />{" "}
                                Naviguer
                              </button>
                            )}
                            {routePolyline && (
                              <button
                                className="btn btn-secondary"
                                style={{
                                  padding: "0.5rem",
                                  color: "var(--primary)",
                                  borderColor: "var(--primary)",
                                }}
                                onClick={handleLaunchExternalGps}
                              >
                                <ExternalLink size={14} /> GPS
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* GPS Chooser Modal — handled by outer modal below */}
                    </div>
                  ) : mobileTab === "list" ? (
                    /* LIST TAB */
                    <div className="mobile-job-list">
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#64748b",
                          marginBottom: "0.25rem",
                          padding: "0 0.5rem",
                        }}
                      >
                        MES INTERVENTIONS ({activeJobs.length})
                      </div>
                      {activeJobs.map((op) => {
                        const client = clients.find(
                          (c) => c.id === op.clientId,
                        );
                        const dist = getDistance(
                          activeEmployee.gps,
                          client?.gps,
                        );

                        return (
                          <div
                            key={op.id}
                            className="mobile-job-card"
                            style={{ position: "relative" }}
                            onClick={() => {
                              setSelectedOp(op);
                              if (op.status === "planifiée") {
                                handleStatusChange(op.id, "en cours");
                              }
                              setMobileTab("map");
                            }}
                          >
                            <div className="mobile-job-card-header">
                              <span className="mobile-job-card-title">
                                {client?.name}
                              </span>
                              <span className={`badge badge-${op.status}`}>
                                {op.status}
                              </span>
                            </div>
                            <p className="mobile-job-card-desc">
                              {op.description}
                            </p>
                            <div className="mobile-job-card-footer">
                              <span>
                                <MapPin
                                  size={12}
                                  style={{
                                    display: "inline",
                                    verticalAlign: "middle",
                                  }}
                                />{" "}
                                {client?.address.split(",")[0]}
                              </span>
                              <span>
                                <Navigation
                                  size={12}
                                  style={{
                                    display: "inline",
                                    verticalAlign: "middle",
                                  }}
                                />{" "}
                                {dist.toFixed(1)} km
                              </span>
                            </div>
                            <button
                              style={{
                                position: "absolute",
                                right: "1rem",
                                bottom: "1rem",
                                background: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOp(op);
                                setMobileTab("map");
                              }}
                            >
                              <Navigation size={14} />
                            </button>
                          </div>
                        );
                      })}
                      {activeJobs.length === 0 && (
                        <div
                          style={{
                            textAlign: "center",
                            color: "#64748b",
                            padding: "3rem 1rem",
                          }}
                        >
                          Félicitations ! Toutes vos missions sont terminées
                          pour aujourd'hui.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* SETTINGS / PROFILE TAB */
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        background: "#f4f6fb",
                        scrollBehavior: "smooth",
                        WebkitOverflowScrolling: "touch",
                      }}
                    >
                      {/* ── Avatar section ── */}
                      <div
                        style={{
                          background: "linear-gradient(135deg,#1a2244,#3b5edb)",
                          padding: "1.5rem 1rem 2.5rem",
                          textAlign: "center",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            display: "inline-block",
                            cursor: "pointer",
                          }}
                          onClick={() => profileFileRef.current?.click()}
                        >
                          <img
                            src={profileAvatar || activeEmployee.avatar}
                            alt={activeEmployee.name}
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: "50%",
                              border: "3px solid white",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              right: 0,
                              background: "#3b5edb",
                              borderRadius: "50%",
                              width: 26,
                              height: 26,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid white",
                              cursor: "pointer",
                            }}
                          >
                            <Camera size={13} color="white" />
                          </div>
                        </div>
                        <input
                          ref={profileFileRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) =>
                            processProfileFile(e.target.files[0])
                          }
                        />
                        <div
                          style={{
                            color: "white",
                            fontWeight: 800,
                            fontSize: "1rem",
                            marginTop: "0.5rem",
                          }}
                        >
                          {activeEmployee.name}
                        </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {activeEmployee.email}
                        </div>
                        {profileAvatar && (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              display: "flex",
                              gap: "0.5rem",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={() => setProfileAvatar(null)}
                              style={{
                                fontSize: "0.7rem",
                                padding: "0.2rem 0.6rem",
                                background: "rgba(255,255,255,0.15)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                color: "white",
                                borderRadius: "0px",
                                cursor: "pointer",
                              }}
                            >
                              {" "}
                              Annuler
                            </button>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                          marginTop: "-1rem",
                        }}
                      >
                        {/* ── Personal info card ── */}
                        <div
                          style={{
                            background: "white",
                            borderRadius: "0px",
                            padding: "1rem",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.875rem",
                              color: "#1a2744",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            <User size={14} color="#3b5edb" /> Informations
                            personnelles
                          </div>

                          {profileError && (
                            <div
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fca5a5",
                                borderRadius: "0px",
                                padding: "0.6rem 0.75rem",
                                marginBottom: "0.75rem",
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "center",
                                color: "#dc2626",
                                fontSize: "0.78rem",
                              }}
                            >
                              <AlertCircle size={14} />
                              {profileError}
                            </div>
                          )}
                          {profileSuccess && (
                            <div
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #86efac",
                                borderRadius: "0px",
                                padding: "0.6rem 0.75rem",
                                marginBottom: "0.75rem",
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "center",
                                color: "#16a34a",
                                fontSize: "0.78rem",
                              }}
                            >
                              <CheckCheck size={14} />
                              {profileSuccess}
                            </div>
                          )}

                          {/* Name */}
                          <div style={{ marginBottom: "0.625rem" }}>
                            <label
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <User size={12} /> Nom complet
                            </label>
                            <input
                              value={profileForm.name}
                              onChange={(e) =>
                                setProfileForm((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                              placeholder={activeEmployee.name}
                              style={{
                                width: "100%",
                                padding: "0.55rem 0.75rem",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "0px",
                                fontSize: "0.85rem",
                                outline: "none",
                                boxSizing: "border-box",
                                transition: "border-color 0.2s",
                              }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "#3b5edb")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor = "#e2e8f0")
                              }
                            />
                          </div>

                          {/* Email */}
                          <div style={{ marginBottom: "0.625rem" }}>
                            <label
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <Mail size={12} /> Adresse email
                            </label>
                            <input
                              type="email"
                              value={profileForm.email}
                              onChange={(e) =>
                                setProfileForm((f) => ({
                                  ...f,
                                  email: e.target.value,
                                }))
                              }
                              placeholder={activeEmployee.email}
                              style={{
                                width: "100%",
                                padding: "0.55rem 0.75rem",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "0px",
                                fontSize: "0.85rem",
                                outline: "none",
                                boxSizing: "border-box",
                                transition: "border-color 0.2s",
                              }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "#3b5edb")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor = "#e2e8f0")
                              }
                            />
                          </div>

                          {/* Phone */}
                          <div style={{ marginBottom: "0.875rem" }}>
                            <label
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <Phone size={12} /> Téléphone
                            </label>
                            <input
                              type="tel"
                              value={profileForm.phone}
                              onChange={(e) =>
                                setProfileForm((f) => ({
                                  ...f,
                                  phone: e.target.value,
                                }))
                              }
                              placeholder={activeEmployee.phone}
                              style={{
                                width: "100%",
                                padding: "0.55rem 0.75rem",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "0px",
                                fontSize: "0.85rem",
                                outline: "none",
                                boxSizing: "border-box",
                                transition: "border-color 0.2s",
                              }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = "#3b5edb")
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor = "#e2e8f0")
                              }
                            />
                          </div>

                          <button
                            onClick={handleSaveProfile}
                            disabled={profileLoading}
                            style={{
                              width: "100%",
                              padding: "0.65rem",
                              borderRadius: "0px",
                              border: "none",
                              background: profileLoading
                                ? "#93c5fd"
                                : "linear-gradient(135deg,#2d3a6d,#3b5edb)",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: profileLoading
                                ? "not-allowed"
                                : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.5rem",
                              transition: "all 0.2s",
                              boxShadow: "0 4px 12px rgba(59,94,219,0.3)",
                            }}
                          >
                            {profileLoading ? (
                              <>
                                <div
                                  style={{
                                    width: 14,
                                    height: 14,
                                    border: "2px solid rgba(255,255,255,0.4)",
                                    borderTopColor: "white",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                  }}
                                />{" "}
                                Enregistrement…
                              </>
                            ) : (
                              <>
                                <Save size={15} /> Sauvegarder le profil
                              </>
                            )}
                          </button>
                        </div>

                        {/* ── Password card ── */}
                        <div
                          style={{
                            background: "white",
                            borderRadius: "0px",
                            padding: "1rem",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                            marginBottom: "1.5rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.875rem",
                              color: "#1a2744",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            <Lock size={14} color="#3b5edb" /> Changer le mot de
                            passe
                          </div>

                          {pwdError && (
                            <div
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fca5a5",
                                borderRadius: "0px",
                                padding: "0.6rem 0.75rem",
                                marginBottom: "0.75rem",
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "center",
                                color: "#dc2626",
                                fontSize: "0.78rem",
                              }}
                            >
                              <AlertCircle size={14} />
                              {pwdError}
                            </div>
                          )}
                          {pwdSuccess && (
                            <div
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #86efac",
                                borderRadius: "0px",
                                padding: "0.6rem 0.75rem",
                                marginBottom: "0.75rem",
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "center",
                                color: "#16a34a",
                                fontSize: "0.78rem",
                              }}
                            >
                              <CheckCheck size={14} />
                              {pwdSuccess}
                            </div>
                          )}

                          {[
                            {
                              label: "Mot de passe actuel",
                              key: "current",
                              show: showCurrent,
                              toggle: () => setShowCurrent((p) => !p),
                            },
                            {
                              label: "Nouveau mot de passe",
                              key: "next",
                              show: showNext,
                              toggle: () => setShowNext((p) => !p),
                            },
                            {
                              label: "Confirmer le nouveau",
                              key: "confirm",
                              show: showConfirm,
                              toggle: () => setShowConfirm((p) => !p),
                            },
                          ].map(({ label, key, show, toggle }) => (
                            <div
                              key={key}
                              style={{
                                marginBottom: "0.625rem",
                                position: "relative",
                              }}
                            >
                              <label
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: "#64748b",
                                  display: "block",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                {label}
                              </label>
                              <div style={{ position: "relative" }}>
                                <input
                                  type={show ? "text" : "password"}
                                  value={pwdForm[key]}
                                  onChange={(e) =>
                                    setPwdForm((f) => ({
                                      ...f,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.55rem 2.2rem 0.55rem 0.75rem",
                                    border: "1.5px solid #e2e8f0",
                                    borderRadius: "0px",
                                    fontSize: "0.85rem",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    transition: "border-color 0.2s",
                                  }}
                                  onFocus={(e) =>
                                    (e.target.style.borderColor = "#3b5edb")
                                  }
                                  onBlur={(e) =>
                                    (e.target.style.borderColor = "#e2e8f0")
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={toggle}
                                  style={{
                                    position: "absolute",
                                    right: "0.6rem",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#64748b",
                                    padding: 0,
                                    display: "flex",
                                  }}
                                >
                                  {show ? (
                                    <EyeOff size={15} />
                                  ) : (
                                    <Eye size={15} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={handleChangePassword}
                            disabled={
                              pwdLoading ||
                              !pwdForm.current ||
                              !pwdForm.next ||
                              !pwdForm.confirm
                            }
                            style={{
                              width: "100%",
                              padding: "0.65rem",
                              borderRadius: "0px",
                              border: "none",
                              background:
                                pwdLoading ||
                                !pwdForm.current ||
                                !pwdForm.next ||
                                !pwdForm.confirm
                                  ? "#cbd5e1"
                                  : "linear-gradient(135deg,#0f172a,#1d4ed8)",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor:
                                pwdLoading ||
                                !pwdForm.current ||
                                !pwdForm.next ||
                                !pwdForm.confirm
                                  ? "not-allowed"
                                  : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.5rem",
                              transition: "all 0.2s",
                            }}
                          >
                            {pwdLoading ? (
                              <>
                                <div
                                  style={{
                                    width: 14,
                                    height: 14,
                                    border: "2px solid rgba(255,255,255,0.4)",
                                    borderTopColor: "white",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                  }}
                                />{" "}
                                En cours…
                              </>
                            ) : (
                              <>
                                <Lock size={15} /> Modifier le mot de passe
                              </>
                            )}
                          </button>
                        </div>

                        {/* Simulation control panel (Mobile Screen only) */}
                        {isMobileScreen && currentUser?.role === "admin" && (
                          <div
                            style={{
                              background: "white",
                              borderRadius: "0px",
                              padding: "1rem",
                              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                              marginBottom: "1.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "0.875rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  color: "#1a2744",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Contrôle Simulation
                              </span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: isOffline ? "#ef4444" : "#10b981",
                                  fontWeight: "bold",
                                }}
                              >
                                {isOffline ? "OFFLINE" : "ONLINE"}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                marginBottom: "0.75rem",
                              }}
                            >
                              <button
                                className="btn btn-secondary"
                                style={{
                                  flex: 1,
                                  padding: "0.5rem",
                                  fontSize: "0.75rem",
                                  backgroundColor: isOffline ? "#fee2e2" : "",
                                }}
                                onClick={() => {
                                  setIsOffline(!isOffline);
                                  addNotification({
                                    title: isOffline
                                      ? "Connexion rétablie"
                                      : "Connexion perdue",
                                    body: isOffline
                                      ? "Vous êtes à nouveau connecté au réseau."
                                      : "Mode dégradé activé. Accès limité aux données locales en cache.",
                                  });
                                }}
                              >
                                {isOffline
                                  ? "Activer Réseau"
                                  : "Simuler Hors-ligne"}
                              </button>

                              {selectedOp &&
                                selectedOp.status === "en cours" && (
                                  <button
                                    className="btn btn-primary"
                                    style={{
                                      flex: 1.2,
                                      padding: "0.5rem",
                                      fontSize: "0.75rem",
                                      backgroundColor: isSimulatingMovement
                                        ? "var(--danger)"
                                        : "var(--primary)",
                                    }}
                                    onClick={() => {
                                      const client = clients.find(
                                        (c) => c.id === selectedOp.clientId,
                                      );
                                      if (client)
                                        startMovementSimulation(client.gps);
                                    }}
                                  >
                                    {isSimulatingMovement
                                      ? "Arrêter"
                                      : "Simuler trajet"}
                                  </button>
                                )}
                            </div>

                            {/* Quick location teleporter for testing */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Relocaliser :
                              </span>
                              <select
                                className="form-select"
                                style={{
                                  padding: "0.25rem",
                                  fontSize: "0.75rem",
                                  width: "100%",
                                }}
                                value=""
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) return;

                                  if (val === "CUSTOM") {
                                    setShowCustomRelocation(true);
                                    return;
                                  }

                                  const coords = val.split(",").map(Number);
                                  updateEmployeeGps(activeEmployee.id, {
                                    lat: coords[0],
                                    lng: coords[1],
                                  });
                                  setRoutePolyline(null);
                                  setRouteInfo(null);
                                  addNotification({
                                    title: "Position GPS mise à jour",
                                    body: `Nouvelles coordonnées : Lat ${coords[0]}, Lng ${coords[1]}`,
                                  });
                                }}
                              >
                                <option value="" disabled>
                                  Choisir position...
                                </option>
                                <option value="5.3245,-4.0205">
                                  Plateau (Position Initiale)
                                </option>
                                <option value="5.3571,-3.9897">
                                  Cocody (St-Jean)
                                </option>
                                <option value="5.3955,-3.9710">
                                  Angré (CNPS)
                                </option>
                                <option value="5.3050,-3.9785">
                                  Marcory (Zone 4)
                                </option>
                                <option value="5.3450,-4.0750">
                                  Yopougon (Siporex)
                                </option>
                                <option value="CUSTOM">
                                  {" "}
                                  Position personnalisée...
                                </option>
                              </select>
                              {showCustomRelocation && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.25rem",
                                    marginTop: "0.5rem",
                                    width: "100%",
                                  }}
                                >
                                  <input
                                    type="text"
                                    placeholder=" Riviera 3, Abidjan..."
                                    value={customRelocationText}
                                    onChange={(e) =>
                                      setCustomRelocationText(e.target.value)
                                    }
                                    style={{
                                      flex: 1,
                                      padding: "0.25rem",
                                      fontSize: "0.75rem",
                                      border: "1px solid #cbd5e1",
                                    }}
                                  />
                                  <button
                                    onClick={() =>
                                      geocodeAndRelocalize(customRelocationText)
                                    }
                                    style={{
                                      padding: "0.25rem 0.5rem",
                                      fontSize: "0.75rem",
                                      backgroundColor: "var(--primary)",
                                      color: "white",
                                      border: "none",
                                    }}
                                  >
                                    OK
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowCustomRelocation(false);
                                      setCustomRelocationText("");
                                    }}
                                    style={{
                                      padding: "0.25rem 0.5rem",
                                      fontSize: "0.75rem",
                                      backgroundColor: "#e2e8f0",
                                      color: "#475569",
                                      border: "none",
                                    }}
                                  >
                                    X
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Bouton de déconnexion et de retour admin dans le Profil */}
                        <div
                          style={{
                            padding: "0 1rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                            marginBottom: "1.5rem",
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                        >
                          {currentUser?.role === "admin" && setLayoutMode && (
                            <button
                              onClick={() => setLayoutMode("admin")}
                              style={{
                                width: "100%",
                                padding: "0.65rem",
                                borderRadius: "0px",
                                border: "1px solid var(--border-color)",
                                background: "var(--bg-card)",
                                color: "var(--text-main)",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem",
                                transition: "all 0.2s",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                              }}
                            >
                              <Monitor size={15} /> Portail Administration
                            </button>
                          )}
                          <button
                            onClick={
                              currentUser?.role === "employee" && portalLogout
                                ? portalLogout
                                : handleLogout
                            }
                            style={{
                              width: "100%",
                              padding: "0.65rem",
                              borderRadius: "0px",
                              border: "1px solid #fee2e2",
                              background: "#fff5f5",
                              color: "#ef4444",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.5rem",
                              transition: "all 0.2s",
                              boxShadow: "0 2px 6px rgba(239,68,68,0.08)",
                            }}
                          >
                            <LogOut size={15} /> Se déconnecter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* MOBILE APP BOTTOM NAV */}
                <div className="mobile-app-nav">
                  <button
                    className={`mobile-nav-item ${mobileTab === "map" ? "active" : ""}`}
                    onClick={() => setMobileTab("map")}
                  >
                    <Map size={16} />
                    <span>Carte</span>
                  </button>
                  <button
                    className={`mobile-nav-item ${mobileTab === "list" ? "active" : ""}`}
                    onClick={() => setMobileTab("list")}
                  >
                    <List size={16} />
                    <span>Liste</span>
                  </button>
                  <button
                    className={`mobile-nav-item ${mobileTab === "settings" ? "active" : ""}`}
                    onClick={() => setMobileTab("settings")}
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
        {!isMobileScreen && activeEmployeeId && (
          <div className="sim-controls-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                }}
              >
                PANNEAU DE CONTRÔLE DE SIMULATION
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: isOffline ? "#ef4444" : "#10b981",
                  fontWeight: "bold",
                }}
              >
                {isOffline ? "OFFLINE" : "ONLINE"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  fontSize: "0.75rem",
                  backgroundColor: isOffline ? "#fee2e2" : "",
                }}
                onClick={() => {
                  setIsOffline(!isOffline);
                  addNotification({
                    title: isOffline
                      ? "Connexion rétablie"
                      : "Connexion perdue",
                    body: isOffline
                      ? "Vous êtes à nouveau connecté au réseau."
                      : "Mode dégradé activé. Accès limité aux données locales en cache.",
                  });
                }}
              >
                {isOffline ? "Activer Réseau" : "Simuler Hors-ligne"}
              </button>

              {selectedOp && selectedOp.status === "en cours" && (
                <button
                  className="btn btn-primary"
                  style={{
                    flex: 1.2,
                    padding: "0.5rem",
                    fontSize: "0.75rem",
                    backgroundColor: isSimulatingMovement
                      ? "var(--danger)"
                      : "var(--primary)",
                  }}
                  onClick={() => {
                    const client = clients.find(
                      (c) => c.id === selectedOp.clientId,
                    );
                    if (client) startMovementSimulation(client.gps);
                  }}
                >
                  {isSimulatingMovement
                    ? "Arrêter Déplacement"
                    : "Simuler trajet GPS"}
                </button>
              )}
            </div>

            {/* Quick location teleporter for testing */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                Relocaliser :
              </span>
              <select
                className="form-select"
                style={{ padding: "0.25rem", fontSize: "0.75rem" }}
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;

                  if (val === "CUSTOM") {
                    setShowCustomRelocation(true);
                    return;
                  }

                  const coords = val.split(",").map(Number);
                  updateEmployeeGps(activeEmployee.id, {
                    lat: coords[0],
                    lng: coords[1],
                  });
                  setRoutePolyline(null);
                  setRouteInfo(null);
                  addNotification({
                    title: "Position GPS mise à jour",
                    body: `Nouvelles coordonnées : Lat ${coords[0]}, Lng ${coords[1]}`,
                  });
                }}
              >
                <option value="" disabled>
                  Choisir position...
                </option>
                <option value="5.3245,-4.0205">
                  Plateau (Position Initiale)
                </option>
                <option value="5.3571,-3.9897">Cocody (St-Jean)</option>
                <option value="5.3955,-3.9710">Angré (CNPS)</option>
                <option value="5.3050,-3.9785">Marcory (Zone 4)</option>
                <option value="5.3450,-4.0750">Yopougon (Siporex)</option>
                <option value="CUSTOM"> Position personnalisée...</option>
              </select>
              {showCustomRelocation && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.25rem",
                    marginTop: "0.5rem",
                    width: "100%",
                  }}
                >
                  <input
                    type="text"
                    placeholder=" Riviera 3, Abidjan..."
                    value={customRelocationText}
                    onChange={(e) => setCustomRelocationText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "0.25rem",
                      fontSize: "0.75rem",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <button
                    onClick={() => geocodeAndRelocalize(customRelocationText)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      backgroundColor: "var(--primary)",
                      color: "white",
                      border: "none",
                    }}
                  >
                    OK
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomRelocation(false);
                      setCustomRelocationText("");
                    }}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      backgroundColor: "#e2e8f0",
                      color: "#475569",
                      border: "none",
                    }}
                  >
                    X
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EXTERNAL GPS APP CHOOSER MODAL */}
      {showGpsChooser && selectedOp && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "340px",
              padding: "1.75rem",
              borderRadius: "0px",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                marginBottom: "1.25rem",
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              Ouvrir l'itinéraire avec :
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {/* Google Maps — named destination with address text */}
              <button
                className="btn btn-secondary"
                style={{
                  justifyContent: "flex-start",
                  padding: "0.875rem 1rem",
                  gap: "0.5rem",
                  fontSize: "0.95rem",
                  borderRadius: "0px",
                }}
                onClick={() => {
                  const client = clients.find(
                    (c) => c.id === selectedOp.clientId,
                  );
                  if (client) {
                    // Use address text so Google Maps shows the proper place name
                    const destination = encodeURIComponent(
                      `${client.name}, ${client.address}`,
                    );
                    const origin = activeEmployee?.gps
                      ? `${activeEmployee.gps.lat},${activeEmployee.gps.lng}`
                      : "";
                    const url = origin
                      ? `https://www.google.com/maps/dir/?api=1` +
                        `&origin=${origin}` +
                        `&destination=${destination}&travelmode=driving`
                      : `https://www.google.com/maps/search/?api=1` +
                        `&query=${destination}`;
                    window.open(url, "_blank");
                  }
                  setShowGpsChooser(false);
                }}
              >
                Google Maps
              </button>

              {/* Waze — address query for named place */}
              <button
                className="btn btn-secondary"
                style={{
                  justifyContent: "flex-start",
                  padding: "0.875rem 1rem",
                  gap: "0.5rem",
                  fontSize: "0.95rem",
                  borderRadius: "0px",
                }}
                onClick={() => {
                  const client = clients.find(
                    (c) => c.id === selectedOp.clientId,
                  );
                  if (client) {
                    // Waze supports both `q` (named search) and `ll` (coordinates) — use name + coords
                    const q = encodeURIComponent(
                      `${client.name}, ${client.address}`,
                    );
                    const ll = client.gps
                      ? `${client.gps.lat},${client.gps.lng}`
                      : "";
                    const url = ll
                      ? `https://waze.com/ul?ll=${ll}&navigate=yes&zoom=17&q=${q}`
                      : `https://waze.com/ul?q=${q}&navigate=yes`;
                    window.open(url, "_blank");
                  }
                  setShowGpsChooser(false);
                }}
              >
                Waze
              </button>

              {/* OpenStreetMap — excellente couverture Afrique de l'Ouest, gratuit */}
              <button
                className="btn btn-secondary"
                style={{
                  justifyContent: "flex-start",
                  padding: "0.875rem 1rem",
                  gap: "0.5rem",
                  fontSize: "0.95rem",
                  borderRadius: "0px",
                }}
                onClick={() => {
                  const client = clients.find(
                    (c) => c.id === selectedOp.clientId,
                  );
                  if (client?.gps) {
                    const orig = activeEmployee?.gps
                      ? `${activeEmployee.gps.lat},${activeEmployee.gps.lng}`
                      : "";
                    const dest = `${client.gps.lat},${client.gps.lng}`;
                    const url = orig
                      ? `https://www.openstreetmap.org/directions?route=${orig};${dest}&engine=fossgis_osrm_car`
                      : `https://www.openstreetmap.org/?mlat=${dest.split(",")[0]}&mlon=${dest.split(",")[1]}&zoom=16`;
                    window.open(url, "_blank");
                  }
                  setShowGpsChooser(false);
                }}
              >
                OpenStreetMap
              </button>
            </div>

            <div
              className="modal-footer"
              style={{ marginTop: "1.25rem", justifyContent: "center" }}
            >
              <button
                className="btn btn-secondary"
                style={{
                  padding: "0.5rem 1.5rem",
                  borderRadius: "0px",
                  fontSize: "0.9rem",
                }}
                onClick={() => setShowGpsChooser(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT ADDRESS ISSUE MODAL */}
      {showReportIssueModal && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "360px",
              padding: "1.5rem",
              borderRadius: "0px",
            }}
          >
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: "1rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertTriangle size={20} color="#f59e0b" /> Signaler une erreur
              d'adresse
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "1rem",
                textAlign: "left",
              }}
            >
              Vous rencontrez des difficultés à localiser un client sur la carte
              ? Décrivez le problème ci-dessous (ex: mauvaise rue, coordonnées
              GPS inexactes, mauvaise commune).
            </p>
            <textarea
              placeholder={
                "Exemple : L'adresse de SIB est en fait sur " +
                "l'Avenue Chardy et non sur le Boulevard de la " +
                "République..."
              }
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              style={{
                width: "100%",
                height: "100px",
                padding: "0.5rem",
                borderRadius: "0px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "1rem",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: "0.5rem", borderRadius: "0px" }}
                onClick={() => {
                  setShowReportIssueModal(false);
                  setReportText("");
                }}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "0px",
                  backgroundColor: "#f59e0b",
                  border: "none",
                }}
                onClick={async () => {
                  if (!reportText.trim()) return;
                  try {
                    const token = localStorage.getItem("token");
                    const res = await fetch(`${API_URL}/api/address-reports`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ message: reportText }),
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      throw new Error(
                        data.error || "Impossible d'envoyer le rapport.",
                      );
                    }
                    addNotification({
                      title: "Signalement envoyé",
                      body: "Merci ! Votre signalement a été envoyé aux administrateurs pour correction.",
                    });
                  } catch (err) {
                    addNotification({
                      title: "Erreur lors de l'envoi",
                      body: err.message,
                    });
                  } finally {
                    setShowReportIssueModal(false);
                    setReportText("");
                  }
                }}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIP HISTORY MODAL */}
      {showHistoryModal && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "360px",
              padding: "1.5rem",
              borderRadius: "0px",
            }}
          >
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: "1rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <History size={20} color="#3b5edb" /> Trajets de la journée
            </h3>

            <div
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                marginBottom: "1.25rem",
                paddingRight: "4px",
              }}
            >
              {(() => {
                const completedToday = operations.filter(
                  (op) =>
                    op.employeeId === activeEmployee?.id &&
                    op.status === "terminée",
                );

                if (completedToday.length === 0) {
                  return (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        textAlign: "center",
                        padding: "1.5rem 0",
                      }}
                    >
                      Aucun trajet terminé aujourd'hui.
                    </div>
                  );
                }

                return completedToday.map((op) => {
                  const client = clients.find((c) => c.id === op.clientId);
                  return (
                    <div
                      key={op.id}
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0px",
                        padding: "0.75rem",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "#0f172a",
                        }}
                      >
                        {client?.name || "Client"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748b",
                          marginTop: "0.125rem",
                        }}
                      >
                        {client?.address}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "0.5rem",
                        }}
                      >
                        <span
                          className="badge badge-terminée"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Terminé
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          Mission accomplie
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0px" }}
              onClick={() => setShowHistoryModal(false)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

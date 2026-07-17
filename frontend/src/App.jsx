import { useState, useEffect } from "react";
import AdminDashboard from "./components/AdminDashboard";
import MobileSimulator from "./components/MobileSimulator";
import Login from "./components/Login";
import BrandLogo from "./components/BrandLogo";
import InstallPrompt from "./components/InstallPrompt";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "./utils/pushSubscription";
import {
  addClient,
  updateClient,
  addOperation,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  updateOperationStatus,
  updateEmployeeGps,
} from "./utils/apiHandlers";
import {
  Sun,
  Moon,
  LayoutGrid,
  Monitor,
  Smartphone,
  LogOut,
} from "lucide-react";
import { Snackbar, Alert } from "@mui/material";

export default function App() {
  // 1. Centralized States
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [operations, setOperations] = useState([]);
  const [activeEmployeeId, setActiveEmployeeId] = useState(null);

  // Mobile screen detection
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth <= 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("ya_theme");
    return saved || "light";
  });

  // Layout Mode State: 'split' | 'admin' | 'mobile'
  const [layoutMode, setLayoutMode] = useState("split");

  // Mobile push notifications queue
  const [activeNotification, setActiveNotification] = useState(null);
  const [snackbarMessage, setSnackbarMessage] = useState(null);

  // Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [currentOrg, setCurrentOrg] = useState(() => {
    const saved = localStorage.getItem("organization");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = () => {
    unsubscribeFromPushNotifications(apiFetch).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("organization");
    setCurrentUser(null);
    setCurrentOrg(null);
  };

  const handleLoginSuccess = (user, organization) => {
    setCurrentUser(user);
    setCurrentOrg(organization);
  };

  const API_URL = import.meta.env.VITE_API_URL || "";

  const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      ...options.headers,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
    const res = await fetch(fullUrl, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error(
        "Session expirée ou accès refusé. Veuillez vous reconnecter.",
      );
    }
    return res;
  };

  // Trigger push subscription on startup / login
  useEffect(() => {
    if (currentUser) {
      // Small timeout to let PWA service worker fully register first
      const t = setTimeout(() => {
        subscribeToPushNotifications(apiFetch);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [currentUser]);

  // Fetch initial data from backend API
  useEffect(() => {
    if (!currentUser) return;

    // SSE connection for Real-Time notifications
    const sseUrl = `${API_URL}/api/events`;
    const eventSource = new EventSource(sseUrl);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "OPERATION_STATUS_CHANGED") {
        setSnackbarMessage(data.message);

        // Also trigger mobile push notification if this is the employee app
        setActiveNotification({
          title: "Mise à jour de statut",
          body: data.message,
        });
        setTimeout(() => setActiveNotification(null), 5000);

        // Refresh operations list
        fetchOperations();
      } else if (data.type === "OPERATION_ASSIGNED") {
        // Trigger mobile push notification
        setActiveNotification({
          title: "Nouvelle Assignation",
          body: data.message,
        });
        setTimeout(() => setActiveNotification(null), 8000);

        fetchOperations();
      } else if (data.type === "ADDRESS_REPORT_CREATED") {
        setSnackbarMessage(data.message);
      }
    };

    const fetchOperations = async () => {
      try {
        const res = await apiFetch("/api/operations");
        const data = await res.json();
        setOperations(data);
        localStorage.setItem("offline_operations", JSON.stringify(data));
      } catch (err) {
        console.error("Erreur lors de la mise à jour des opérations :", err);
        const cached = localStorage.getItem("offline_operations");
        if (cached) setOperations(JSON.parse(cached));
      }
    };

    const fetchData = async () => {
      try {
        const [clientsRes, empsRes, opsRes] = await Promise.all([
          apiFetch("/api/clients"),
          apiFetch("/api/employees"),
          apiFetch("/api/operations"),
        ]);
        const clientsData = await clientsRes.json();
        const empsData = await empsRes.json();
        const opsData = await opsRes.json();

        setClients(clientsData);
        setEmployees(empsData);
        setOperations(opsData);

        // Cache data for offline degraded mode (Section 4.4)
        localStorage.setItem("offline_clients", JSON.stringify(clientsData));
        localStorage.setItem("offline_employees", JSON.stringify(empsData));
        localStorage.setItem("offline_operations", JSON.stringify(opsData));
      } catch (err) {
        console.error(
          "Erreur réseau, passage en mode hors ligne (dégradé) :",
          err,
        );
        setSnackbarMessage(
          "Mode hors ligne actif. Données en cache affichées.",
        );

        const cachedClients = localStorage.getItem("offline_clients");
        const cachedEmps = localStorage.getItem("offline_employees");
        const cachedOps = localStorage.getItem("offline_operations");

        if (cachedClients) setClients(JSON.parse(cachedClients));
        if (cachedEmps) setEmployees(JSON.parse(cachedEmps));
        if (cachedOps) setOperations(JSON.parse(cachedOps));
      }
    };
    fetchData();

    return () => {
      eventSource.close();
    };
  }, [currentUser]);

  // Theme effect
  useEffect(() => {
    localStorage.setItem("ya_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Actions connecting to the backend
  const handleAddClient = async (clientData) => {
    return addClient(apiFetch, clientData, setClients);
  };

  const handleUpdateClient = async (updatedClient) => {
    return updateClient(apiFetch, updatedClient, setClients);
  };

  const handleAddOperation = async (newOp) => {
    return addOperation({
      apiFetch,
      newOp,
      setOperations,
      clients,
      triggerNotification,
    });
  };

  const handleAddEmployee = async (empData) => {
    return addEmployee(apiFetch, empData, setEmployees);
  };

  const handleUpdateEmployee = async (empData) => {
    return updateEmployee(apiFetch, empData, setEmployees);
  };

  const handleDeleteEmployee = async (empId) => {
    return deleteEmployee(apiFetch, empId, setEmployees);
  };

  const handleUpdateOperationStatus = async (opId, status) => {
    return updateOperationStatus(apiFetch, opId, status, setOperations);
  };

  const handleUpdateEmployeeGps = async (empId, gps) => {
    return updateEmployeeGps(apiFetch, empId, gps, setEmployees);
  };

  // Trigger push notification inside Mobile Simulator
  const triggerNotification = (notif) => {
    setActiveNotification(notif);
    // Auto-clear after 4 seconds
    setTimeout(() => {
      setActiveNotification(null);
    }, 4000);
  };

  // Called by MobileSimulator when an employee saves their profile
  const onProfileUpdated = (updatedEmployee) => {
    // Update employees list so avatar/name refresh everywhere (map markers, lists, etc.)
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === updatedEmployee.id ? { ...e, ...updatedEmployee } : e,
      ),
    );
    // If it's the currently logged-in user, update their session too
    if (currentUser && currentUser.id === updatedEmployee.id) {
      const refreshed = { ...currentUser, ...updatedEmployee };
      setCurrentUser(refreshed);
      localStorage.setItem("user", JSON.stringify(refreshed));
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} apiUrl={API_URL} />;
  }

  // Force layout based on role or screen size
  const effectiveLayoutMode =
    currentUser.role === "employee"
      ? "mobile"
      : isMobileScreen && layoutMode === "split"
        ? "admin"
        : layoutMode;

  // Hide global header on mobile screen if we are in mobile simulator view
  const showHeader = !isMobileScreen || effectiveLayoutMode !== "mobile";

  return (
    <div className="app-container">
      {/* 1. Global Header */}
      {showHeader && (
        <header className="app-header">
          <div
            className="header-logo"
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            {currentOrg?.logo ? (
              <img
                src={currentOrg.logo}
                alt="Logo"
                style={{ height: "32px", width: "auto", objectFit: "contain" }}
              />
            ) : (
              <BrandLogo width={36} showText={false} color="#4f46e5" />
            )}
            <span>
              {currentOrg?.name || "YA Consulting"}{" "}
              <span>— Portail Terrain</span>
            </span>
          </div>

          {/* Layout Switcher Buttons (Only visible for Admins) */}
          {currentUser.role === "admin" && (
            <div className="layout-switch-group">
              <button
                onClick={() => setLayoutMode("split")}
                className={`layout-switch-btn ${layoutMode === "split" ? "active" : ""}`}
                title="Double Vue"
              >
                <LayoutGrid size={15} />
                <span className="layout-btn-text">Double Vue</span>
              </button>
              <button
                onClick={() => setLayoutMode("admin")}
                className={`layout-switch-btn ${layoutMode === "admin" ? "active" : ""}`}
                title="Administration Plein Écran"
              >
                <Monitor size={15} />
                <span className="layout-btn-text">Portail Admin</span>
              </button>
              <button
                onClick={() => setLayoutMode("mobile")}
                className={`layout-switch-btn ${layoutMode === "mobile" ? "active" : ""}`}
                title="Simulateur Mobile"
              >
                <Smartphone size={15} />
                <span className="layout-btn-text">Mobile</span>
              </button>
            </div>
          )}

          <div className="header-actions">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Bonjour, {currentUser.name}
            </div>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title="Changer le thème"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              className="icon-btn"
              onClick={handleLogout}
              title="Se déconnecter"
              style={{ color: "var(--danger)" }}
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
      )}

      {/* 2. Main split screens layout */}
      <main className={`main-content layout-${effectiveLayoutMode}`}>
        {/* Left Side: Admin Dashboard */}
        {effectiveLayoutMode !== "mobile" && (
          <AdminDashboard
            clients={clients}
            employees={employees}
            operations={operations}
            addClient={handleAddClient}
            updateClient={handleUpdateClient}
            addOperation={handleAddOperation}
            updateOperationStatus={handleUpdateOperationStatus}
            addEmployee={handleAddEmployee}
            updateEmployee={handleUpdateEmployee}
            deleteEmployee={handleDeleteEmployee}
            layoutMode={effectiveLayoutMode}
            currentOrg={currentOrg}
            setCurrentOrg={setCurrentOrg}
          />
        )}

        {/* Right Side: Smartphone Simulator for Technicians */}
        <div
          style={{
            display: effectiveLayoutMode === "admin" ? "none" : "block",
            position: "relative",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <MobileSimulator
            clients={clients}
            employees={employees}
            operations={operations}
            activeEmployeeId={
              activeEmployeeId ||
              (currentUser?.role === "employee" ? currentUser.id : null)
            }
            setActiveEmployeeId={setActiveEmployeeId}
            updateOperationStatus={handleUpdateOperationStatus}
            updateEmployeeGps={handleUpdateEmployeeGps}
            addNotification={triggerNotification}
            onProfileUpdated={onProfileUpdated}
            layoutMode={effectiveLayoutMode}
            currentUser={currentUser}
            theme={theme}
            isMobileScreen={isMobileScreen}
            portalLogout={handleLogout}
            toggleTheme={toggleTheme}
            setLayoutMode={setLayoutMode}
            activeNotification={activeNotification}
          />
        </div>
      </main>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarMessage(null)}
          severity="info"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* PWA Install Banner */}
      <InstallPrompt />
    </div>
  );
}

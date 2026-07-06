import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import MobileSimulator from './components/MobileSimulator';
import Login from './components/Login';
import BrandLogo from './components/BrandLogo';
import InstallPrompt from './components/InstallPrompt';
import { Sun, Moon, Bell, Info, LayoutGrid, Monitor, Smartphone, LogOut } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';

export default function App() {
  // 1. Centralized States
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [operations, setOperations] = useState([]);
  const [activeEmployeeId, setActiveEmployeeId] = useState(null);
  
  // Mobile screen detection
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ya_theme');
    return saved || 'light';
  });

  // Layout Mode State: 'split' | 'admin' | 'mobile'
  const [layoutMode, setLayoutMode] = useState('split');

  // Mobile push notifications queue
  const [activeNotification, setActiveNotification] = useState(null);
  const [snackbarMessage, setSnackbarMessage] = useState(null);

  // Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentOrg, setCurrentOrg] = useState(() => {
    const saved = localStorage.getItem('organization');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = () => {
    unsubscribeFromPushNotifications().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
    setCurrentUser(null);
    setCurrentOrg(null);
  };

  const handleLoginSuccess = (user, organization) => {
    setCurrentUser(user);
    setCurrentOrg(organization);
  };

  const API_URL = import.meta.env.VITE_API_URL || '';

  const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const res = await fetch(fullUrl, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error("Session expirée ou accès refusé. Veuillez vous reconnecter.");
    }
    return res;
  };

  const subscribeToPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log("Les notifications Push ne sont pas supportées par ce navigateur.");
      return;
    }

    try {
      const keyRes = await apiFetch('/api/push/key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) return;

      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log("Permission de notifications refusée.");
        return;
      }

      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      };

      const subscription = await registration.pushManager.subscribe(subscribeOptions);

      await apiFetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      console.log("Abonnement aux notifications Push réussi !");
    } catch (err) {
      console.error("Erreur lors de l'abonnement aux notifications Push :", err);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiFetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        }).catch(() => {});
        
        await subscription.unsubscribe();
        console.log("Désabonnement des notifications Push réussi.");
      }
    } catch (err) {
      console.error("Erreur lors du désabonnement Push:", err);
    }
  };

  // Trigger push subscription on startup / login
  useEffect(() => {
    if (currentUser) {
      // Small timeout to let PWA service worker fully register first
      const t = setTimeout(() => {
        subscribeToPushNotifications();
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
      if (data.type === 'OPERATION_STATUS_CHANGED') {
        setSnackbarMessage(data.message);
        
        // Also trigger mobile push notification if this is the employee app
        setActiveNotification({
          title: "Mise à jour de statut",
          body: data.message
        });
        setTimeout(() => setActiveNotification(null), 5000);

        // Refresh operations list
        fetchOperations();
      } else if (data.type === 'OPERATION_ASSIGNED') {
        // Trigger mobile push notification
        setActiveNotification({
          title: "Nouvelle Assignation",
          body: data.message
        });
        setTimeout(() => setActiveNotification(null), 8000);

        fetchOperations();
      } else if (data.type === 'ADDRESS_REPORT_CREATED') {
        setSnackbarMessage(data.message);
      }
    };

    const fetchOperations = async () => {
      try {
        const res = await apiFetch('/api/operations');
        const data = await res.json();
        setOperations(data);
        localStorage.setItem('offline_operations', JSON.stringify(data));
      } catch (err) {
        console.error("Erreur lors de la mise à jour des opérations :", err);
        const cached = localStorage.getItem('offline_operations');
        if (cached) setOperations(JSON.parse(cached));
      }
    };

    const fetchData = async () => {
      try {
        const [clientsRes, empsRes, opsRes] = await Promise.all([
          apiFetch('/api/clients'),
          apiFetch('/api/employees'),
          apiFetch('/api/operations')
        ]);
        const clientsData = await clientsRes.json();
        const empsData = await empsRes.json();
        const opsData = await opsRes.json();
        
        setClients(clientsData);
        setEmployees(empsData);
        setOperations(opsData);
        
        // Cache data for offline degraded mode (Section 4.4)
        localStorage.setItem('offline_clients', JSON.stringify(clientsData));
        localStorage.setItem('offline_employees', JSON.stringify(empsData));
        localStorage.setItem('offline_operations', JSON.stringify(opsData));
      } catch (err) {
        console.error("Erreur réseau, passage en mode hors ligne (dégradé) :", err);
        setSnackbarMessage("Mode hors ligne actif. Données en cache affichées.");
        
        const cachedClients = localStorage.getItem('offline_clients');
        const cachedEmps = localStorage.getItem('offline_employees');
        const cachedOps = localStorage.getItem('offline_operations');
        
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
    localStorage.setItem('ya_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Actions connecting to the backend
  const addClient = async (clientData) => {
    const res = await apiFetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erreur lors du géocodage du client.");
    }
    
    const savedClient = await res.json();
    setClients(prev => [...prev, savedClient]);
    return savedClient;
  };

  const updateClient = async (updatedClient) => {
    try {
      const res = await apiFetch(`/api/clients/${updatedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClient)
      });
      const saved = await res.json();
      setClients(prev => prev.map(c => c.id === saved.id ? saved : c));
    } catch (err) {
      console.error("Erreur lors de la mise à jour du client :", err);
    }
  };

  const addOperation = async (newOp) => {
    try {
      const res = await apiFetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOp)
      });
      
      const savedOp = await res.json();
      setOperations(prev => [...prev, savedOp]);
      
      // Auto-notify the assigned employee if connected
      if (savedOp.employeeId) {
        triggerNotification({
          title: "Nouvelle mission assignée",
          body: `Nouvelle intervention planifiée chez ${clients.find(c => c.id === savedOp.clientId)?.name || 'Client'}.`
        });
      }
    } catch (err) {
      console.error("Erreur lors de la création de l'opération :", err);
    }
  };

  const addEmployee = async (empData) => {
    const res = await apiFetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empData)
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erreur lors de la création de l'employé.");
    }
    
    const savedEmp = await res.json();
    setEmployees(prev => [...prev, savedEmp]);
    return savedEmp;
  };

  const updateEmployee = async (empData) => {
    try {
      const res = await apiFetch(`/api/employees/${empData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empData)
      });
      const saved = await res.json();
      setEmployees(prev => prev.map(e => e.id === saved.id ? saved : e));
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'employé :", err);
    }
  };

  const deleteEmployee = async (empId) => {
    try {
      await apiFetch(`/api/employees/${empId}`, {
        method: 'DELETE'
      });
      setEmployees(prev => prev.filter(e => e.id !== empId));
    } catch (err) {
      console.error("Erreur lors de la suppression de l'employé :", err);
    }
  };

  const updateOperationStatus = async (opId, status) => {
    try {
      const res = await apiFetch(`/api/operations/${opId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      const saved = await res.json();
      setOperations(prev => prev.map(o => o.id === opId ? saved : o));
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut d'intervention :", err);
    }
  };

  const updateEmployeeGps = async (empId, gps) => {
    // Optimistic state update for super smooth map animations on frontend
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, gps } : e));
    
    try {
      await apiFetch(`/api/employees/${empId}/gps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gps)
      });
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la position GPS :", err);
    }
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
    setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? { ...e, ...updatedEmployee } : e));
    // If it's the currently logged-in user, update their session too
    if (currentUser && currentUser.id === updatedEmployee.id) {
      const refreshed = { ...currentUser, ...updatedEmployee };
      setCurrentUser(refreshed);
      localStorage.setItem('user', JSON.stringify(refreshed));
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} apiUrl={API_URL} />;
  }

  // Force layout based on role or screen size
  const effectiveLayoutMode = currentUser.role === 'employee' 
    ? 'mobile' 
    : (isMobileScreen && layoutMode === 'split' ? 'admin' : layoutMode);

  // Hide global header on mobile screen if we are in mobile simulator view
  const showHeader = !isMobileScreen || effectiveLayoutMode !== 'mobile';

  return (
    <div className="app-container">
      {/* 1. Global Header */}
      {showHeader && (
        <header className="app-header">
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentOrg?.logo ? (
            <img src={currentOrg.logo} alt="Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          ) : (
            <BrandLogo width={36} showText={false} color="#4f46e5" />
          )}
          <span>{currentOrg?.name || 'YA Consulting'} <span>— Portail Terrain</span></span>
        </div>

        {/* Layout Switcher Buttons (Only visible for Admins) */}
        {currentUser.role === 'admin' && (
          <div className="layout-switch-group">
            <button 
              onClick={() => setLayoutMode('split')}
              className={`layout-switch-btn ${layoutMode === 'split' ? 'active' : ''}`}
              title="Double Vue"
            >
              <LayoutGrid size={15} />
              <span className="layout-btn-text">Double Vue</span>
            </button>
            <button 
              onClick={() => setLayoutMode('admin')}
              className={`layout-switch-btn ${layoutMode === 'admin' ? 'active' : ''}`}
              title="Administration Plein Écran"
            >
              <Monitor size={15} />
              <span className="layout-btn-text">Portail Admin</span>
            </button>
            <button 
              onClick={() => setLayoutMode('mobile')}
              className={`layout-switch-btn ${layoutMode === 'mobile' ? 'active' : ''}`}
              title="Simulateur Mobile"
            >
              <Smartphone size={15} />
              <span className="layout-btn-text">Mobile</span>
            </button>
          </div>
        )}

        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Bonjour, {currentUser.name}
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="Changer le thème">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="icon-btn" onClick={handleLogout} title="Se déconnecter" style={{ color: 'var(--danger)' }}>
            <LogOut size={20} />
          </button>
        </div>
      </header>
      )}

      {/* 2. Main split screens layout */}
      <main className={`main-content layout-${effectiveLayoutMode}`}>
        {/* Left Side: Admin Dashboard */}
        {effectiveLayoutMode !== 'mobile' && (
          <AdminDashboard 
            clients={clients}
            employees={employees}
            operations={operations}
            addClient={addClient}
            updateClient={updateClient}
            addOperation={addOperation}
            updateOperationStatus={updateOperationStatus}
            addEmployee={addEmployee}
            updateEmployee={updateEmployee}
            deleteEmployee={deleteEmployee}
            layoutMode={effectiveLayoutMode}
            currentOrg={currentOrg}
            setCurrentOrg={setCurrentOrg}
          />
        )}

        {/* Right Side: Smartphone Simulator for Technicians */}
        <div style={{ display: effectiveLayoutMode === 'admin' ? 'none' : 'block', position: 'relative', height: '100%', overflow: 'hidden' }}>
          <MobileSimulator 
            clients={clients}
            employees={employees}
            operations={operations}
            activeEmployeeId={activeEmployeeId || (currentUser?.role === 'employee' ? currentUser.id : null)}
            setActiveEmployeeId={setActiveEmployeeId}
            updateOperationStatus={updateOperationStatus}
            updateEmployeeGps={updateEmployeeGps}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMessage(null)} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* PWA Install Banner */}
      <InstallPrompt />
    </div>
  );
}

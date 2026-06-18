import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import MobileSimulator from './components/MobileSimulator';
import { Sun, Moon, Bell, Navigation, Info } from 'lucide-react';

export default function App() {
  // 1. Centralized States
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [operations, setOperations] = useState([]);
  const [activeEmployeeId, setActiveEmployeeId] = useState(null);
  
  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ya_theme');
    return saved || 'light';
  });

  // Mobile push notifications queue
  const [activeNotification, setActiveNotification] = useState(null);

  // Fetch initial data from backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, empsRes, opsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/employees'),
          fetch('/api/operations')
        ]);
        const clientsData = await clientsRes.json();
        const empsData = await empsRes.json();
        const opsData = await opsRes.json();
        
        setClients(clientsData);
        setEmployees(empsData);
        setOperations(opsData);
      } catch (err) {
        console.error("Erreur lors du chargement des données depuis l'API backend :", err);
      }
    };
    fetchData();
  }, []);

  // Theme effect
  useEffect(() => {
    localStorage.setItem('ya_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Actions connecting to the backend
  const addClient = async (clientData) => {
    const res = await fetch('/api/clients', {
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
      const res = await fetch(`/api/clients/${updatedClient.id}`, {
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
      const res = await fetch('/api/operations', {
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

  const updateOperationStatus = async (opId, status) => {
    try {
      const res = await fetch(`/api/operations/${opId}/status`, {
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
      await fetch(`/api/employees/${empId}/gps`, {
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app-container">
      {/* 1. Global Header */}
      <header className="app-header">
        <div className="header-logo">
          <Navigation size={28} style={{ transform: 'rotate(45deg)' }} />
          YA CONSULTING <span>Portail Interventions</span>
        </div>
        <div className="header-actions">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Info size={14} />
            <span>Serveur Backend d'API actif ! Actions synchronisées en temps réel.</span>
          </div>
          <button className="theme-switch-btn" onClick={toggleTheme} title="Changer de thème">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* 2. Main split screens layout */}
      <main className="main-content">
        {/* Left Side: Admin Dashboard */}
        <AdminDashboard 
          clients={clients}
          employees={employees}
          operations={operations}
          addClient={addClient}
          updateClient={updateClient}
          addOperation={addOperation}
          updateOperationStatus={updateOperationStatus}
        />

        {/* Right Side: Smartphone Simulator for Technicians */}
        <div style={{ position: 'relative', height: '100%' }}>
          {/* Simulated Toast Notification in phone */}
          {activeNotification && activeEmployeeId && (
            <div className="notif-toast" style={{ position: 'absolute', top: '70px', right: '40px', width: '300px', zIndex: 1000 }}>
              <div style={{ fontSize: '18px' }}>🔔</div>
              <div className="notif-content">
                <div className="notif-title">{activeNotification.title}</div>
                <div className="notif-body">{activeNotification.body}</div>
              </div>
            </div>
          )}
          
          <MobileSimulator 
            clients={clients}
            employees={employees}
            operations={operations}
            activeEmployeeId={activeEmployeeId}
            setActiveEmployeeId={setActiveEmployeeId}
            updateOperationStatus={updateOperationStatus}
            updateEmployeeGps={updateEmployeeGps}
            addNotification={triggerNotification}
          />
        </div>
      </main>
    </div>
  );
}

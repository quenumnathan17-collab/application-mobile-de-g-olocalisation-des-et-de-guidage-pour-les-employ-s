import React, { useState, useEffect } from 'react';
import { initialClients, initialEmployees, initialOperations } from './mockData';
import AdminDashboard from './components/AdminDashboard';
import MobileSimulator from './components/MobileSimulator';
import { Sun, Moon, Bell, Navigation, Info } from 'lucide-react';

export default function App() {
  // 1. Centralized State with localStorage persistence
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('ya_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('ya_employees');
    return saved ? JSON.parse(saved) : initialEmployees;
  });

  const [operations, setOperations] = useState(() => {
    const saved = localStorage.getItem('ya_operations');
    return saved ? JSON.parse(saved) : initialOperations;
  });

  const [activeEmployeeId, setActiveEmployeeId] = useState(null);
  
  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ya_theme');
    return saved || 'light';
  });

  // Mobile push notifications queue
  const [activeNotification, setActiveNotification] = useState(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('ya_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('ya_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('ya_operations', JSON.stringify(operations));
  }, [operations]);

  useEffect(() => {
    localStorage.setItem('ya_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Actions
  const addClient = (newClient) => {
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (updatedClient) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const addOperation = (newOp) => {
    setOperations(prev => [...prev, newOp]);
    
    // Auto-notify the assigned employee if connected
    if (newOp.employeeId) {
      triggerNotification({
        title: "Nouvelle mission assignée",
        body: `Nouvelle intervention planifiée chez ${clients.find(c => c.id === newOp.clientId)?.name || 'Client'}.`
      });
    }
  };

  const updateOperationStatus = (opId, status) => {
    setOperations(prev => prev.map(o => o.id === opId ? { ...o, status } : o));
  };

  const updateEmployeeGps = (empId, gps) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, gps } : e));
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
            <span>Chaque action à gauche se répercute instantanément à droite !</span>
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

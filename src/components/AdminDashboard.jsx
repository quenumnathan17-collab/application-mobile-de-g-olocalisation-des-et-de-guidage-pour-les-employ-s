import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Briefcase, Map, Plus, Search, 
  MapPin, Archive, Trash2, Calendar, 
  Check, AlertCircle, Edit3, ShieldAlert
} from 'lucide-react';

export default function AdminDashboard({ 
  clients, 
  employees, 
  operations, 
  addClient, 
  updateClient,
  addOperation,
  updateOperationStatus
}) {
  const [activeTab, setActiveTab] = useState('supervision'); // 'clients', 'operations', 'supervision'
  const [searchQuery, setSearchQuery] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('all');
  
  // Modals state
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddOp, setShowAddOp] = useState(false);
  
  // Form state - Client
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState('entreprise');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [geocodingAlert, setGeocodingAlert] = useState(null); // { type: 'success'|'error', text: '' }

  // Form state - Operation
  const [newOpClient, setNewOpClient] = useState('');
  const [newOpDesc, setNewOpDesc] = useState('');
  const [newOpDate, setNewOpDate] = useState('');
  const [newOpEmp, setNewOpEmp] = useState('');

  // Map Ref
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);

  // Address Geocoding simulator
  const simulateGeocode = (address) => {
    if (!address.trim()) return null;
    
    // Simulate lookup based on keywords or random coordinates near Abidjan center
    // Let's generate a coordinate near Abidjan center (5.3600, -4.0083)
    const seed = address.length;
    const latOffset = (Math.sin(seed) * 0.04);
    const lngOffset = (Math.cos(seed) * 0.05);
    
    // If the address seems completely fake/short, fail it to show error handling
    if (address.trim().length < 8) {
      return null;
    }
    
    return {
      lat: 5.3600 + latOffset,
      lng: -4.0083 + lngOffset
    };
  };

  const handleAddClientSubmit = (e) => {
    e.preventDefault();
    setGeocodingAlert(null);

    const gpsCoords = simulateGeocode(newClientAddress);

    if (!gpsCoords) {
      setGeocodingAlert({
        type: 'error',
        text: "Échec du géocodage. L'adresse n'a pas pu être convertie en coordonnées GPS. Veuillez préciser l'adresse (ex: Rue, Code Postal, Ville)."
      });
      return;
    }

    const client = {
      id: "client_" + (clients.length + 1),
      name: newClientName,
      type: newClientType,
      address: newClientAddress,
      gps: gpsCoords,
      archived: false
    };

    addClient(client);
    
    // Show success message briefly before closing
    setGeocodingAlert({
      type: 'success',
      text: `Géocodage réussi ! Coordonnées trouvées : Lat ${gpsCoords.lat.toFixed(4)}, Lng ${gpsCoords.lng.toFixed(4)}`
    });

    setTimeout(() => {
      setShowAddClient(false);
      setNewClientName('');
      setNewClientAddress('');
      setGeocodingAlert(null);
    }, 1500);
  };

  const handleAddOpSubmit = (e) => {
    e.preventDefault();
    if (!newOpClient || !newOpEmp || !newOpDate || !newOpDesc.trim()) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    const newOp = {
      id: "op_" + (operations.length + 1),
      clientId: newOpClient,
      description: newOpDesc,
      date: newOpDate,
      employeeId: newOpEmp,
      status: "planifiée",
      createdAt: new Date().toISOString()
    };

    addOperation(newOp);
    setShowAddOp(false);
    setNewOpClient('');
    setNewOpDesc('');
    setNewOpDate('');
    setNewOpEmp('');
  };

  // Initialize Map
  useEffect(() => {
    if (activeTab !== 'supervision' || !mapRef.current) return;

    const L = window.L;
    if (!L) return;

    // Center map on Abidjan
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([5.3600, -4.0083], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    markersGroup.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activeTab]);

  // Update Map Markers
  useEffect(() => {
    if (activeTab !== 'supervision' || !mapInstance.current || !markersGroup.current) return;
    
    const L = window.L;
    if (!L) return;

    // Clear previous markers
    markersGroup.current.clearLayers();

    // 1. Plot clients with active operations (planified or in progress)
    clients.forEach(client => {
      if (client.archived) return;

      const clientOps = operations.filter(op => op.clientId === client.id && (op.status === 'en cours' || op.status === 'planifiée'));
      if (clientOps.length === 0) return;

      const latestOp = clientOps[0];

      // Custom HTML Marker icon for client
      const markerHtml = `
        <div style="
          background-color: ${client.type === 'entreprise' ? '#4f46e5' : '#86198f'};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
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
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      });

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 200px;">
          <h4 style="margin: 0 0 4px 0; color: #1e293b;">${client.name}</h4>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b;">📍 ${client.address}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 8px 0;" />
          <div style="margin-top: 6px;">
            <strong style="font-size: 11px; color: #475569;">Opération :</strong>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #0f172a;">${latestOp.description}</p>
            <span style="
              display: inline-block;
              margin-top: 6px;
              font-size: 10px;
              padding: 2px 8px;
              border-radius: 9999px;
              font-weight: bold;
              text-transform: uppercase;
              background-color: ${latestOp.status === 'en cours' ? '#fef3c7' : '#e0e7ff'};
              color: ${latestOp.status === 'en cours' ? '#b45309' : '#4f46e5'};
            ">
              ${latestOp.status}
            </span>
          </div>
        </div>
      `;

      clientMarker.bindPopup(popupContent);
      markersGroup.current.addLayer(clientMarker);
    });

    // 2. Plot employees (technicians)
    employees.forEach(emp => {
      if (emp.role === 'admin') return;

      const activeOps = operations.filter(op => op.employeeId === emp.id && op.status === 'en cours');
      const hasActiveOp = activeOps.length > 0;

      // Custom HTML Marker icon for employee
      const markerHtml = `
        <div style="position: relative;">
          <div class="user-pulse" style="
            background-color: ${hasActiveOp ? '#10b981' : '#64748b'};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2.5px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          ">
            🛠️
          </div>
          <div style="
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #0f172a;
            color: white;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">
            ${emp.name.split(' ')[0]}
          </div>
        </div>
      `;

      const empMarker = L.marker([emp.gps.lat, emp.gps.lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      });

      const opDetails = activeOps.length > 0 
        ? `<p style="margin: 4px 0 0 0; color: #059669; font-weight: 600;">⚡ En route/En cours chez : ${clients.find(c => c.id === activeOps[0].clientId)?.name || 'Inconnu'}</p>`
        : '<p style="margin: 4px 0 0 0; color: #64748b; font-style: italic;">Disponible (pas de mission en cours)</p>';

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 180px;">
          <h4 style="margin: 0 0 4px 0;">${emp.name}</h4>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">📞 ${emp.phone}</p>
          <div style="font-size: 12px; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            <strong>Statut actuel :</strong>
            ${opDetails}
          </div>
        </div>
      `;

      empMarker.bindPopup(popupContent);
      markersGroup.current.addLayer(empMarker);
    });

  }, [activeTab, clients, employees, operations]);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = clientTypeFilter === 'all' ? true : c.type === clientTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="admin-pane">
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'supervision' ? 'active' : ''}`}
          onClick={() => setActiveTab('supervision')}
        >
          <Map size={18} /> Supervision Carte
        </button>
        <button 
          className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <Users size={18} /> Clients
        </button>
        <button 
          className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActiveTab('operations')}
        >
          <Briefcase size={18} /> Planification & Missions
        </button>
      </div>

      <div className="admin-body">
        {/* TAB 1: SUPERVISION MAP */}
        {activeTab === 'supervision' && (
          <div>
            <div className="toolbar">
              <div>
                <h2>Carte de supervision globale</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Suivi des techniciens en temps réel et des interventions planifiées ou en cours.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>
                  🏢 Client Entreprise
                </span>
                <span className="badge" style={{ backgroundColor: '#fae8ff', color: '#86198f', border: '1px solid #f5d0fe' }}>
                  👤 Client Particulier
                </span>
                <span className="badge" style={{ backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                  🛠️ Technicien actif
                </span>
              </div>
            </div>

            <div className="card" style={{ padding: '0.5rem', overflow: 'hidden' }}>
              <div ref={mapRef} className="map-container" style={{ height: '540px' }} />
            </div>
          </div>
        )}

        {/* TAB 2: CLIENTS MANAGEMENT */}
        {activeTab === 'clients' && (
          <div>
            <div className="toolbar">
              <div>
                <h2>Fiches Clients</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Créez, modifiez ou archivez vos clients. L'adresse est géocodée automatiquement.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddClient(true)}>
                <Plus size={16} /> Nouveau Client
              </button>
            </div>

            <div className="card">
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Rechercher par nom, adresse..." 
                    className="form-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="form-select" 
                  style={{ width: '180px' }}
                  value={clientTypeFilter}
                  onChange={(e) => setClientTypeFilter(e.target.value)}
                >
                  <option value="all">Tous les types</option>
                  <option value="entreprise">Entreprises</option>
                  <option value="particulier">Particuliers</option>
                  <option value="archived">Archivés</option>
                </select>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom / Raison Sociale</th>
                      <th>Type</th>
                      <th>Adresse Postale Complexe</th>
                      <th>GPS (Coordonnées)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id} style={{ opacity: client.archived ? 0.6 : 1 }}>
                        <td style={{ fontWeight: 600 }}>{client.name}</td>
                        <td>
                          <span className={`badge badge-${client.type}`}>
                            {client.type === 'entreprise' ? '🏢 Entreprise' : '👤 Particulier'}
                          </span>
                        </td>
                        <td>{client.address}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {client.gps.lat.toFixed(5)}, {client.gps.lng.toFixed(5)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary btn-icon"
                              title={client.archived ? "Restaurer" : "Archiver"}
                              onClick={() => updateClient({ ...client, archived: !client.archived })}
                            >
                              <Archive size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredClients.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          Aucun client trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OPERATIONS / ASSIGNMENTS */}
        {activeTab === 'operations' && (
          <div>
            <div className="toolbar">
              <div>
                <h2>Planification des interventions</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Assignation des missions et suivi du statut des interventions.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddOp(true)}>
                <Plus size={16} /> Créer une Opération
              </button>
            </div>

            <div className="card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Description de la Mission</th>
                      <th>Date Prévue</th>
                      <th>Technicien Assigné</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((op) => {
                      const client = clients.find(c => c.id === op.clientId);
                      const employee = employees.find(e => e.id === op.employeeId);
                      
                      return (
                        <tr key={op.id}>
                          <td style={{ fontWeight: 600 }}>
                            {client ? client.name : "Inconnu"}
                            <br />
                            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                              {client ? client.address : ""}
                            </span>
                          </td>
                          <td style={{ maxWidth: '300px' }}>{op.description}</td>
                          <td>
                            <div style={{ display: 'flex', alignItem: 'center', gap: '0.25rem' }}>
                              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                              {new Date(op.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td>
                            {employee ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <img src={employee.avatar} alt={employee.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                <span>{employee.name}</span>
                              </div>
                            ) : "Non assigné"}
                          </td>
                          <td>
                            <span className={`badge badge-${op.status.replace(' ', '-')}`}>
                              {op.status}
                            </span>
                          </td>
                          <td>
                            <select 
                              className="form-select" 
                              style={{ width: '130px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              value={op.status}
                              onChange={(e) => updateOperationStatus(op.id, e.target.value)}
                            >
                              <option value="planifiée">Planifiée</option>
                              <option value="en cours">En cours</option>
                              <option value="terminée">Terminée</option>
                              <option value="annulée">Annulée</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD CLIENT */}
      {showAddClient && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Ajouter un nouveau client</h3>
            <form onSubmit={handleAddClientSubmit}>
              <div className="form-group">
                <label className="form-label">Nom ou Raison Sociale</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Ex: Orange CI, M. Bamba Bakary"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type de Client</label>
                <select 
                  className="form-select" 
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value)}
                >
                  <option value="entreprise">🏢 Entreprise</option>
                  <option value="particulier">👤 Particulier</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Adresse Postale Complète</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Ex: Boulevard Giscard d'Estaing, Marcory, Abidjan"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  💡 L'adresse sera géocodée automatiquement par notre moteur cartographique.
                </span>
              </div>

              {geocodingAlert && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  backgroundColor: geocodingAlert.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                  color: geocodingAlert.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                  border: `1px solid ${geocodingAlert.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                }}>
                  {geocodingAlert.type === 'success' ? <Check size={16} style={{ marginTop: '2px' }} /> : <ShieldAlert size={16} style={{ marginTop: '2px' }} />}
                  <span>{geocodingAlert.text}</span>
                </div>
              )}

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowAddClient(false); setGeocodingAlert(null); }}
                  disabled={geocodingAlert?.type === 'success'}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={geocodingAlert?.type === 'success'}
                >
                  Enregistrer & Géocoder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD OPERATION */}
      {showAddOp && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Créer et assigner une opération</h3>
            <form onSubmit={handleAddOpSubmit}>
              <div className="form-group">
                <label className="form-label">Client</label>
                <select 
                  className="form-select" 
                  required
                  value={newOpClient}
                  onChange={(e) => setNewOpClient(e.target.value)}
                >
                  <option value="">-- Sélectionner un client --</option>
                  {clients.filter(c => !c.archived).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description de la mission</label>
                <textarea 
                  className="form-textarea" 
                  rows="3"
                  required
                  placeholder="Détails techniques de l'intervention..."
                  value={newOpDesc}
                  onChange={(e) => setNewOpDesc(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date prévue</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required
                    value={newOpDate}
                    onChange={(e) => setNewOpDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Technicien assigné</label>
                  <select 
                    className="form-select" 
                    required
                    value={newOpEmp}
                    onChange={(e) => setNewOpEmp(e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    {employees.filter(e => e.role === 'employee').map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddOp(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Créer l'intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

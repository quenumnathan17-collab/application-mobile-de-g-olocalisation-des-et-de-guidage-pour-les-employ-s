import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  Badge,
  InputAdornment,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  IconButton
} from '@mui/material';
import {
  Map as MapIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  Add as AddIcon,
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  CalendarToday as CalendarTodayIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Build as BuildIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Place as PlaceIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export default function AdminDashboard({ 
  clients, 
  employees, 
  operations, 
  addClient, 
  updateClient,
  addOperation,
  updateOperationStatus,
  layoutMode
}) {
  const [activeTab, setActiveTab] = useState(0); // 0: supervision, 1: clients, 2: operations
  const [searchQuery, setSearchQuery] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('all');
  
  // Modals state
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddOp, setShowAddOp] = useState(false);
  
  // Detail dialogs
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [selectedEmpDetail, setSelectedEmpDetail] = useState(null);

  // Legend filter for supervision map
  const [legendFilter, setLegendFilter] = useState('all'); // 'all' | 'entreprise' | 'particulier' | 'technicien'

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

  // Helper: navigate to client tab and highlight a client
  const navigateToClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setActiveTab(1);
      setSearchQuery(client.name);
    }
  };

  // Helper: center map on GPS coordinates
  const centerMapOnGps = (lat, lng) => {
    if (activeTab !== 0) setActiveTab(0);
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 15, { animate: true });
      }
    }, 300);
  };

  // Sync theme with index.css theme attribute on HTML tag
  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const active = document.documentElement.getAttribute('data-theme') || 'light';
      setCurrentTheme(active);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // Material UI theme configured to match YA Consulting colors
  const muiTheme = React.useMemo(() => {
    const isDark = currentTheme === 'dark';
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: '#4f46e5', // Indigo
          dark: '#3730a3',
          light: '#e0e7ff',
          contrastText: '#ffffff'
        },
        secondary: {
          main: '#0ea5e9', // Sky
          light: '#e0f2fe',
          dark: '#0369a1'
        },
        background: {
          default: isDark ? '#0b0f19' : '#f8fafc',
          paper: isDark ? '#151c2c' : '#ffffff',
        },
        text: {
          primary: isDark ? '#f8fafc' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#64748b',
        },
        divider: isDark ? '#2e3b4e' : '#e2e8f0',
      },
      typography: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        h1: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
        h2: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
        h3: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
        h4: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
        h5: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
        h6: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
      },
      shape: {
        borderRadius: 12,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              padding: '8px 16px',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
      },
    });
  }, [currentTheme]);

  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    setGeocodingAlert(null);

    try {
      const savedClient = await addClient({
        name: newClientName,
        type: newClientType,
        address: newClientAddress
      });

      // Show success message briefly before closing
      setGeocodingAlert({
        type: 'success',
        text: `Géocodage réussi ! Coordonnées trouvées : Lat ${savedClient.gps.lat.toFixed(4)}, Lng ${savedClient.gps.lng.toFixed(4)}`
      });

      setTimeout(() => {
        setShowAddClient(false);
        setNewClientName('');
        setNewClientAddress('');
        setGeocodingAlert(null);
      }, 1500);
    } catch (err) {
      setGeocodingAlert({
        type: 'error',
        text: err.message || "Échec du géocodage. Veuillez préciser l'adresse (ex: Commune, Quartier, Abidjan)."
      });
    }
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
    if (activeTab !== 0 || !mapRef.current) return;

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

  // Invalidate map size when tab or layoutMode changes
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current.invalidateSize();
      }, 200);
    }
  }, [activeTab, layoutMode]);

  // Update Map Markers
  useEffect(() => {
    if (activeTab !== 0 || !mapInstance.current || !markersGroup.current) return;
    
    // Clear previous markers
    markersGroup.current.clearLayers();

    // 1. Plot clients with active operations (planified or in progress)
    clients.forEach(client => {
      if (client.archived) return;
      if (legendFilter === 'technicien') return; // hide clients when filtering technicians only
      if (legendFilter === 'entreprise' && client.type !== 'entreprise') return;
      if (legendFilter === 'particulier' && client.type !== 'particulier') return;

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
      if (legendFilter === 'entreprise' || legendFilter === 'particulier') return; // hide techs when filtering clients only

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

  }, [activeTab, clients, employees, operations, legendFilter]);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (clientTypeFilter === 'archived') {
      return matchesSearch && c.archived;
    }
    if (clientTypeFilter === 'all') {
      return matchesSearch; // show both archived and active to match original view
    }
    return matchesSearch && !c.archived && c.type === clientTypeFilter;
  });

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'planifiée':
        return 'primary';
      case 'en cours':
        return 'warning';
      case 'terminée':
        return 'success';
      case 'annulée':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ display: layoutMode === 'mobile' ? 'none' : 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.default', overflow: 'hidden' }}>
        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            aria-label="admin dashboard navigation"
          >
            <Tab icon={<MapIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Supervision Carte" sx={{ fontWeight: 600, minHeight: 64 }} />
            <Tab icon={<PeopleIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Clients" sx={{ fontWeight: 600, minHeight: 64 }} />
            <Tab icon={<WorkIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Planification & Missions" sx={{ fontWeight: 600, minHeight: 64 }} />
          </Tabs>
        </Box>

        {/* Dashboard Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {/* TAB 0: SUPERVISION MAP */}
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Carte de supervision globale
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Suivi des techniciens en temps réel et des interventions planifiées ou en cours à Abidjan. Cliquez sur un filtre pour isoler un type de marqueur.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<BusinessIcon fontSize="small" />} 
                    label="🏢 Client Entreprise" 
                    size="small" 
                    variant={legendFilter === 'entreprise' ? 'filled' : 'outlined'} 
                    color={legendFilter === 'entreprise' ? 'primary' : 'default'}
                    onClick={() => setLegendFilter(legendFilter === 'entreprise' ? 'all' : 'entreprise')} 
                    sx={{ fontWeight: 600, cursor: 'pointer' }} 
                  />
                  <Chip 
                    icon={<PersonIcon fontSize="small" />} 
                    label="👤 Client Particulier" 
                    size="small" 
                    variant={legendFilter === 'particulier' ? 'filled' : 'outlined'} 
                    color={legendFilter === 'particulier' ? 'secondary' : 'default'}
                    onClick={() => setLegendFilter(legendFilter === 'particulier' ? 'all' : 'particulier')} 
                    sx={{ fontWeight: 600, cursor: 'pointer' }} 
                  />
                  <Chip 
                    icon={<BuildIcon fontSize="small" />} 
                    label="🛠️ Technicien actif" 
                    size="small" 
                    variant={legendFilter === 'technicien' ? 'filled' : 'outlined'} 
                    color={legendFilter === 'technicien' ? 'success' : 'default'}
                    onClick={() => setLegendFilter(legendFilter === 'technicien' ? 'all' : 'technicien')} 
                    sx={{ fontWeight: 600, cursor: 'pointer' }} 
                  />
                </Box>
              </Box>

              <Paper elevation={1} sx={{ p: 1, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box ref={mapRef} className="map-container" sx={{ height: '540px', width: '100%', borderRadius: '8px', zIndex: 1 }} />
              </Paper>
            </Box>
          )}

          {/* TAB 1: CLIENTS MANAGEMENT */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Fiches Clients
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Créez, modifiez ou archivez vos clients. L'adresse est géocodée automatiquement.
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />} 
                  onClick={() => setShowAddClient(true)}
                  sx={{ boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}
                >
                  Nouveau Client
                </Button>
              </Box>

              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <TextField 
                    placeholder="Rechercher par nom, adresse..." 
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ flexGrow: 1, maxWidth: 320 }}
                  />
                  <FormControl size="small" sx={{ width: 200 }}>
                    <Select
                      value={clientTypeFilter}
                      onChange={(e) => setClientTypeFilter(e.target.value)}
                      displayEmpty
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            zIndex: 9999,
                            borderRadius: 2,
                            mt: 0.5,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            '& .MuiMenuItem-root': {
                              py: 1.2,
                              px: 2,
                              borderRadius: 1,
                              mx: 0.5,
                              mb: 0.3,
                              transition: 'all 0.15s',
                              '&:hover': {
                                bgcolor: 'primary.main',
                                color: 'white',
                                transform: 'translateX(4px)',
                                '& .MuiListItemIcon-root': { color: 'white' }
                              },
                              '&.Mui-selected': {
                                bgcolor: 'primary.light',
                                fontWeight: 700,
                                '&:hover': { bgcolor: 'primary.main' }
                              }
                            }
                          }
                        },
                        disablePortal: false
                      }}
                      sx={{ 
                        borderRadius: 2,
                        fontWeight: 600,
                        '& .MuiSelect-select': { display: 'flex', alignItems: 'center', gap: 1 }
                      }}
                    >
                      <MenuItem value="all">
                        <ListItemIcon sx={{ minWidth: 28 }}><PeopleIcon fontSize="small" /></ListItemIcon>
                        Tous les types
                      </MenuItem>
                      <MenuItem value="entreprise">
                        <ListItemIcon sx={{ minWidth: 28 }}><BusinessIcon fontSize="small" color="primary" /></ListItemIcon>
                        Entreprises
                      </MenuItem>
                      <MenuItem value="particulier">
                        <ListItemIcon sx={{ minWidth: 28 }}><PersonIcon fontSize="small" color="secondary" /></ListItemIcon>
                        Particuliers
                      </MenuItem>
                      <MenuItem value="archived">
                        <ListItemIcon sx={{ minWidth: 28 }}><ArchiveIcon fontSize="small" color="action" /></ListItemIcon>
                        Archivés
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Nom / Raison Sociale</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Adresse Postale</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>GPS (Coordonnées)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow 
                          key={client.id} 
                          hover 
                          onClick={() => setSelectedClientDetail(client)}
                          sx={{ 
                            opacity: client.archived ? 0.55 : 1,
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            '&:last-child td, &:last-child th': { border: 0 }
                          }}
                        >
                          <TableCell component="th" scope="row" sx={{ fontWeight: 600, color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}>
                            {client.name}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              icon={client.type === 'entreprise' ? <BusinessIcon sx={{ fontSize: '14px !important' }} /> : <PersonIcon sx={{ fontSize: '14px !important' }} />}
                              label={client.type === 'entreprise' ? 'Entreprise' : 'Particulier'} 
                              size="small"
                              variant={client.type === 'entreprise' ? 'filled' : 'outlined'}
                              color={client.type === 'entreprise' ? 'default' : 'secondary'}
                              onClick={(e) => { e.stopPropagation(); setClientTypeFilter(client.type); }}
                              sx={{ fontWeight: 600, cursor: 'pointer' }}
                            />
                          </TableCell>
                          <TableCell sx={{ '&:hover': { color: 'primary.main' } }}>{client.address}</TableCell>
                          <TableCell 
                            onClick={(e) => { e.stopPropagation(); centerMapOnGps(client.gps.lat, client.gps.lng); }}
                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'secondary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}
                            title="Cliquez pour centrer la carte sur ce client"
                          >
                            📍 {client.gps.lat.toFixed(5)}, {client.gps.lng.toFixed(5)}
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outlined"
                              size="small"
                              color={client.archived ? 'primary' : 'inherit'}
                              onClick={() => updateClient({ ...client, archived: !client.archived })}
                              startIcon={client.archived ? <UnarchiveIcon sx={{ fontSize: 16 }} /> : <ArchiveIcon sx={{ fontSize: 16 }} />}
                              sx={{ py: 0.5, borderRadius: '8px' }}
                            >
                              {client.archived ? 'Restaurer' : 'Archiver'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredClients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            Aucun client trouvé.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {/* TAB 2: OPERATIONS / ASSIGNMENTS */}
          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Planification des interventions
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Assignation des missions et suivi du statut des interventions.
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />} 
                  onClick={() => setShowAddOp(true)}
                  sx={{ boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}
                >
                  Créer une Opération
                </Button>
              </Box>

              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Description de la Mission</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date Prévue</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Technicien Assigné</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Statut</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Changer le statut</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operations.map((op) => {
                        const client = clients.find(c => c.id === op.clientId);
                        const employee = employees.find(e => e.id === op.employeeId);
                        
                        return (
                          <TableRow key={op.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: 'default' }}>
                            <TableCell sx={{ fontWeight: 600 }}>
                              <Typography 
                                component="span" 
                                sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                onClick={() => client && navigateToClient(client.id)}
                              >
                                {client ? client.name : "Inconnu"}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                display="block" 
                                sx={{ color: 'text.secondary', fontWeight: 'normal', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                                onClick={() => client && centerMapOnGps(client.gps.lat, client.gps.lng)}
                                title="Voir sur la carte"
                              >
                                📍 {client ? client.address : ""}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ maxWidth: '280px', wordBreak: 'break-word' }}>{op.description}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {new Date(op.date).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {employee ? (
                                <Box 
                                  sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                                  onClick={() => setSelectedEmpDetail(employee)}
                                  title="Voir le profil du technicien"
                                >
                                  <Avatar src={employee.avatar} alt={employee.name} sx={{ width: 28, height: 28, border: '2px solid', borderColor: 'primary.light', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.15)' } }} />
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}>{employee.name}</Typography>
                                </Box>
                              ) : "Non assigné"}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={op.status} 
                                size="small" 
                                color={getStatusChipColor(op.status)}
                                onClick={() => {}}
                                sx={{ fontWeight: 600, textTransform: 'capitalize', cursor: 'default' }}
                              />
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ width: 160 }}>
                                <Select 
                                  value={op.status}
                                  onChange={(e) => updateOperationStatus(op.id, e.target.value)}
                                  MenuProps={{
                                    PaperProps: {
                                      sx: {
                                        zIndex: 9999,
                                        borderRadius: 2,
                                        mt: 0.5,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        '& .MuiMenuItem-root': {
                                          py: 1,
                                          px: 2,
                                          borderRadius: 1,
                                          mx: 0.5,
                                          mb: 0.3,
                                          transition: 'all 0.15s',
                                          '&:hover': {
                                            transform: 'translateX(4px)',
                                          }
                                        }
                                      }
                                    }
                                  }}
                                  sx={{ fontSize: '0.8125rem', borderRadius: 2, fontWeight: 600 }}
                                >
                                  <MenuItem value="planifiée">📋 Planifiée</MenuItem>
                                  <MenuItem value="en cours">⚡ En cours</MenuItem>
                                  <MenuItem value="terminée">✅ Terminée</MenuItem>
                                  <MenuItem value="annulée">❌ Annulée</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {operations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            Aucune opération planifiée.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}
        </Box>

        {/* MODAL: ADD CLIENT */}
        <Dialog open={showAddClient} onClose={() => { setShowAddClient(false); setGeocodingAlert(null); }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Ajouter un nouveau client</DialogTitle>
          <form onSubmit={handleAddClientSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <TextField
                label="Nom ou Raison Sociale"
                required
                fullWidth
                placeholder="Ex: Orange CI, M. Bamba Bakary"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />

              <FormControl fullWidth>
                <InputLabel id="client-type-label">Type de Client</InputLabel>
                <Select
                  labelId="client-type-label"
                  label="Type de Client"
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value)}
                >
                  <MenuItem value="entreprise">🏢 Entreprise</MenuItem>
                  <MenuItem value="particulier">👤 Particulier</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Adresse Postale Complète"
                required
                fullWidth
                placeholder="Ex: Boulevard Giscard d'Estaing, Marcory, Abidjan"
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                helperText="💡 L'adresse sera géocodée automatiquement par notre moteur cartographique à Abidjan."
              />

              {geocodingAlert && (
                <Alert 
                  severity={geocodingAlert.type} 
                  icon={geocodingAlert.type === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                >
                  {geocodingAlert.text}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
              <Button 
                onClick={() => { setShowAddClient(false); setGeocodingAlert(null); }}
                disabled={geocodingAlert?.type === 'success'}
                color="inherit"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                variant="contained"
                disabled={geocodingAlert?.type === 'success'}
              >
                Enregistrer & Géocoder
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* MODAL: ADD OPERATION */}
        <Dialog open={showAddOp} onClose={() => setShowAddOp(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Créer et assigner une opération</DialogTitle>
          <form onSubmit={handleAddOpSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel id="operation-client-label">Client</InputLabel>
                <Select
                  labelId="operation-client-label"
                  label="Client"
                  value={newOpClient}
                  onChange={(e) => setNewOpClient(e.target.value)}
                >
                  {clients.filter(c => !c.archived).map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Description de la mission"
                required
                fullWidth
                multiline
                rows={3}
                placeholder="Détails techniques de l'intervention..."
                value={newOpDesc}
                onChange={(e) => setNewOpDesc(e.target.value)}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date prévue"
                    type="date"
                    required
                    fullWidth
                    value={newOpDate}
                    onChange={(e) => setNewOpDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="operation-tech-label">Technicien assigné</InputLabel>
                    <Select
                      labelId="operation-tech-label"
                      label="Technicien assigné"
                      value={newOpEmp}
                      onChange={(e) => setNewOpEmp(e.target.value)}
                    >
                      {employees.filter(e => e.role === 'employee').map(e => (
                        <MenuItem key={e.id} value={e.id}>
                          {e.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
              <Button onClick={() => setShowAddOp(false)} color="inherit">
                Annuler
              </Button>
              <Button type="submit" variant="contained">
                Créer l'intervention
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* DIALOG: CLIENT DETAIL */}
        <Dialog 
          open={!!selectedClientDetail} 
          onClose={() => setSelectedClientDetail(null)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {selectedClientDetail && (() => {
            const client = selectedClientDetail;
            const clientOps = operations.filter(op => op.clientId === client.id);
            return (
              <>
                <DialogTitle sx={{ fontWeight: 700, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: client.type === 'entreprise' ? 'primary.main' : 'secondary.main', width: 40, height: 40 }}>
                      {client.type === 'entreprise' ? <BusinessIcon /> : <PersonIcon />}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{client.name}</Typography>
                      <Chip 
                        label={client.type === 'entreprise' ? 'Entreprise' : 'Particulier'} 
                        size="small" 
                        color={client.type === 'entreprise' ? 'primary' : 'secondary'}
                        sx={{ fontWeight: 600, mt: 0.3 }}
                      />
                    </Box>
                  </Box>
                  <IconButton onClick={() => setSelectedClientDetail(null)}>
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                  <List dense disablePadding>
                    <ListItem 
                      sx={{ px: 0, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                      onClick={() => { centerMapOnGps(client.gps.lat, client.gps.lng); setSelectedClientDetail(null); }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}><PlaceIcon color="error" /></ListItemIcon>
                      <ListItemText 
                        primary={client.address} 
                        secondary={`GPS: ${client.gps.lat.toFixed(5)}, ${client.gps.lng.toFixed(5)} — Cliquer pour voir sur la carte`}
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    Opérations ({clientOps.length})
                  </Typography>

                  {clientOps.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                      Aucune opération pour ce client.
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {clientOps.map(op => {
                        const emp = employees.find(e => e.id === op.employeeId);
                        return (
                          <ListItem 
                            key={op.id} 
                            sx={{ px: 1, py: 1, mb: 0.5, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                            onClick={() => { setSelectedClientDetail(null); setActiveTab(2); }}
                          >
                            <ListItemText 
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{op.description}</Typography>
                                  <Chip label={op.status} size="small" color={getStatusChipColor(op.status)} sx={{ fontWeight: 600, textTransform: 'capitalize', ml: 1 }} />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CalendarTodayIcon sx={{ fontSize: 12 }} /> {new Date(op.date).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </Typography>
                                  {emp && (
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <BuildIcon sx={{ fontSize: 12 }} /> {emp.name}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    color={client.archived ? 'primary' : 'inherit'}
                    onClick={() => { updateClient({ ...client, archived: !client.archived }); setSelectedClientDetail(null); }}
                    startIcon={client.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                  >
                    {client.archived ? 'Restaurer' : 'Archiver'}
                  </Button>
                  <Button variant="contained" onClick={() => setSelectedClientDetail(null)}>Fermer</Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

        {/* DIALOG: EMPLOYEE DETAIL */}
        <Dialog 
          open={!!selectedEmpDetail} 
          onClose={() => setSelectedEmpDetail(null)} 
          maxWidth="xs" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {selectedEmpDetail && (() => {
            const emp = selectedEmpDetail;
            const empOps = operations.filter(op => op.employeeId === emp.id);
            const activeOps = empOps.filter(op => op.status === 'en cours');
            const completedOps = empOps.filter(op => op.status === 'terminée');
            return (
              <>
                <DialogTitle sx={{ pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Badge 
                      badgeContent={activeOps.length > 0 ? '●' : ''} 
                      color="success" 
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                      <Avatar src={emp.avatar} alt={emp.name} sx={{ width: 56, height: 56, border: '3px solid', borderColor: 'primary.light' }} />
                    </Badge>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{emp.name}</Typography>
                      <Chip 
                        label={emp.role === 'admin' ? 'Administrateur' : 'Technicien'} 
                        size="small" 
                        color={emp.role === 'admin' ? 'warning' : 'info'}
                        sx={{ fontWeight: 600, mt: 0.3 }}
                      />
                    </Box>
                  </Box>
                  <IconButton onClick={() => setSelectedEmpDetail(null)}>
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                  <List dense disablePadding>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}><PhoneIcon color="primary" fontSize="small" /></ListItemIcon>
                      <ListItemText primary={emp.phone} secondary="Téléphone" />
                    </ListItem>
                    <ListItem 
                      sx={{ px: 0, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                      onClick={() => { centerMapOnGps(emp.gps.lat, emp.gps.lng); setSelectedEmpDetail(null); }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}><PlaceIcon color="error" fontSize="small" /></ListItemIcon>
                      <ListItemText primary={`${emp.gps.lat.toFixed(5)}, ${emp.gps.lng.toFixed(5)}`} secondary="Voir la position actuelle sur la carte" />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', py: 1 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>{empOps.length}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total missions</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.main' }}>{activeOps.length}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>En cours</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main' }}>{completedOps.length}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Terminées</Typography>
                    </Box>
                  </Box>

                  {activeOps.length > 0 && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>Missions en cours</Typography>
                      {activeOps.map(op => {
                        const opClient = clients.find(c => c.id === op.clientId);
                        return (
                          <Box key={op.id} sx={{ p: 1.5, mb: 0.5, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { borderColor: 'warning.main' } }} onClick={() => { setSelectedEmpDetail(null); setActiveTab(2); }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{op.description}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>📍 {opClient?.name || 'Inconnu'} — {opClient?.address || ''}</Typography>
                          </Box>
                        );
                      })}
                    </>
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1 }}>
                  <Button variant="contained" onClick={() => setSelectedEmpDetail(null)}>Fermer</Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

      </Box>
    </ThemeProvider>
  );
}

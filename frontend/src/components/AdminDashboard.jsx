import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  IconButton,
  Autocomplete
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
  OpenInNew as OpenInNewIcon,
  BarChart as BarChartIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
];

export default function AdminDashboard({ 
  clients, 
  employees, 
  operations, 
  addClient, 
  updateClient,
  addOperation,
  updateOperationStatus,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  layoutMode
}) {
  const [activeTab, setActiveTab] = useState(0); // 0: supervision, 1: clients, 2: operations, 3: rapports
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
  const [newClientCommune, setNewClientCommune] = useState(''); // Commune d'Abidjan
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientContactName, setNewClientContactName] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [geocodingAlert, setGeocodingAlert] = useState(null); // { type: 'success'|'error', text: '' }
  // Manual GPS override
  const [showManualGps, setShowManualGps] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const autocompleteTimer = useRef(null);

  const [showEditClient, setShowEditClient] = useState(false);
  const [editClientData, setEditClientData] = useState(null);

  // Form state - Operation
  const [newOpClient, setNewOpClient] = useState('');
  const [newOpDesc, setNewOpDesc] = useState('');
  const [newOpDate, setNewOpDate] = useState('');
  const [newOpEmp, setNewOpEmp] = useState('');

  // Form state - Employee
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('employee');
  const [newEmpAvatar, setNewEmpAvatar] = useState(AVATAR_PRESETS[0]);

  const handleAddEmpSubmit = async (e) => {
    e.preventDefault();
    try {
      await addEmployee({ 
        name: newEmpName, 
        email: newEmpEmail, 
        phone: newEmpPhone, 
        role: newEmpRole, 
        avatar: newEmpAvatar 
      });
      setShowAddEmp(false);
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpPhone('');
      setNewEmpRole('employee');
      setNewEmpAvatar(AVATAR_PRESETS[0]);
    } catch(err) {
      alert(err.message);
    }
  };

  const toggleEmployeeStatus = async (emp) => {
    const newStatus = emp.status === 'active' ? 'inactif' : 'active';
    try {
      await updateEmployee({ ...emp, status: newStatus });
    } catch(err) {
      alert("Erreur lors de la modification du statut.");
    }
  };

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

  // Global Geocoding Search
  const handleGlobalSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&countrycodes=ci&format=json&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          
          setActiveTab(0);
          
          setTimeout(() => {
            if (mapInstance.current) {
              mapInstance.current.setView([lat, lon], 16, { animate: true });
              
              const tempMarker = L.marker([lat, lon]).addTo(mapInstance.current)
                .bindPopup(`<b>Résultat de recherche :</b><br>${data[0].display_name}`)
                .openPopup();
                
              setTimeout(() => {
                if (mapInstance.current && tempMarker) {
                  mapInstance.current.removeLayer(tempMarker);
                }
              }, 10000); // Remove after 10s
            }
          }, 300);
        } else {
          alert("Adresse introuvable en Côte d'Ivoire. Essayez d'être plus précis (ex: Cocody, Abidjan).");
        }
      } catch (err) {
        console.error("Geocoding error", err);
      }
    }
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

  // ── Geocoding cascade: try progressively simpler queries until one succeeds ──
  const geocodeWithCascade = async (address, commune, clientName) => {
    const communeSuffix = commune ? `, ${commune}, Abidjan, Côte d'Ivoire` : ', Abidjan, Côte d\'Ivoire';
    const queries = [
      address + communeSuffix,                          // 1. Full address + commune + city
      address + ', Abidjan, Côte d\'Ivoire',            // 2. Full address + city only
      (commune || 'Abidjan') + ', Côte d\'Ivoire',      // 3. Commune / neighborhood only
      clientName + ', ' + (commune || 'Abidjan'),        // 4. Business name + commune
    ];
    for (let i = 0; i < queries.length; i++) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queries[i])}&countrycodes=ci&format=json&limit=1`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            strategy: i,  // 0=exact, 1=city, 2=commune, 3=name
            displayName: data[0].display_name
          };
        }
      } catch (_) { /* continue to next strategy */ }
    }
    return null;
  };

  // ── Address autocomplete (debounced 450ms) ──
  const handleAddressAutocomplete = (value) => {
    setNewClientAddress(value);
    setShowSuggestions(false);
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    if (value.length < 3) { setAddressSuggestions([]); return; }
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const commune = newClientCommune ? `, ${newClientCommune}, Abidjan` : ', Abidjan';
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value + commune)}&countrycodes=ci&format=json&limit=5`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        setAddressSuggestions(data || []);
        setShowSuggestions(data && data.length > 0);
      } catch (_) { setAddressSuggestions([]); }
    }, 450);
  };

  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    setGeocodingAlert(null);
    setGeocodingLoading(true);

    try {
      let location;

      // ── Mode GPS manuel ──
      if (showManualGps && manualLat && manualLng) {
        const lat = parseFloat(manualLat.replace(',', '.'));
        const lng = parseFloat(manualLng.replace(',', '.'));
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          setGeocodingAlert({ type: 'error', text: 'Coordonnées GPS invalides. Vérifiez la latitude (ex: 5.3211) et la longitude (ex: -4.0180).' });
          setGeocodingLoading(false);
          return;
        }
        location = { lat, lng, strategy: -1 };
      } else {
        // ── Géocodage en cascade ──
        location = await geocodeWithCascade(newClientAddress, newClientCommune, newClientName);
        if (!location) {
          setGeocodingAlert({
            type: 'error',
            text: `Adresse introuvable après plusieurs tentatives. Astuce : essayez un nom de rue connu, ou activez la saisie GPS manuelle pour entrer les coordonnées directement.`
          });
          setGeocodingLoading(false);
          return;
        }
      }

      const fullAddress = newClientCommune
        ? `${newClientAddress}, ${newClientCommune}, Abidjan`
        : newClientAddress;

      const savedClient = await addClient({
        name: newClientName,
        type: newClientType,
        address: fullAddress,
        lat: location.lat,
        lng: location.lng,
        phone: newClientPhone,
        email: newClientEmail,
        contactName: newClientContactName,
        notes: newClientNotes
      });

      setNewOpClient(savedClient.id);

      const strategyLabels = ['adresse exacte', 'ville', 'commune/quartier', 'nom du client'];
      const strategyMsg = location.strategy >= 0
        ? ` (via ${strategyLabels[location.strategy]})`
        : ' (GPS manuel)';

      setGeocodingAlert({
        type: location.strategy > 0 ? 'warning' : 'success',
        text: `✅ Géocodage réussi${strategyMsg} — Lat ${savedClient.gps.lat.toFixed(4)}, Lng ${savedClient.gps.lng.toFixed(4)}`
      });

      setTimeout(() => {
        setShowAddClient(false);
        setNewClientName(''); setNewClientAddress(''); setNewClientCommune('');
        setNewClientPhone(''); setNewClientEmail('');
        setNewClientContactName(''); setNewClientNotes('');
        setShowManualGps(false); setManualLat(''); setManualLng('');
        setAddressSuggestions([]); setGeocodingAlert(null);
      }, 1800);
    } catch (err) {
      setGeocodingAlert({ type: 'error', text: err.message });
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleEditClientSubmit = async (e) => {
    e.preventDefault();
    setGeocodingAlert(null);
    setGeocodingLoading(true);

    try {
      let location;

      if (editClientData.manualLat && editClientData.manualLng) {
        const lat = parseFloat(String(editClientData.manualLat).replace(',', '.'));
        const lng = parseFloat(String(editClientData.manualLng).replace(',', '.'));
        if (!isNaN(lat) && !isNaN(lng)) {
          location = { lat, lng, strategy: -1 };
        }
      }

      if (!location) {
        location = await geocodeWithCascade(
          editClientData.address,
          editClientData.commune || '',
          editClientData.name
        );
      }

      if (!location) {
        setGeocodingAlert({
          type: 'error',
          text: `Adresse introuvable. Utilisez la saisie GPS manuelle pour entrer les coordonnées.`
        });
        setGeocodingLoading(false);
        return;
      }

      const fullAddress = editClientData.commune
        ? `${editClientData.address}, ${editClientData.commune}, Abidjan`
        : editClientData.address;

      await updateClient({
        ...editClientData,
        address: fullAddress,
        lat: location.lat,
        lng: location.lng
      });

      setGeocodingAlert({ type: 'success', text: `✅ Mise à jour et géocodage réussis !` });

      setTimeout(() => {
        setShowEditClient(false);
        setEditClientData(null);
        setGeocodingAlert(null);
      }, 1500);
    } catch (err) {
      setGeocodingAlert({ type: 'error', text: err.message });
    } finally {
      setGeocodingLoading(false);
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

    // Always use standard light voyager tile layer
    const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapInstance.current);

    markersGroup.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activeTab, currentTheme]);

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
          position: relative;
          background-color: ${client.type === 'entreprise' ? '#4f46e5' : '#d946ef'};
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 3px 3px 8px rgba(0,0,0,0.25);
        ">
          <span style="transform: rotate(45deg); font-size: 18px;">
            ${client.type === 'entreprise' ? '🏢' : '👤'}
          </span>
        </div>
      `;

      const clientMarker = L.marker([client.gps.lat, client.gps.lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [38, 38],
          iconAnchor: [19, 38]
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
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
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
            sx={{
              '& .MuiTabs-indicator': {
                height: '4px',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              },
              '& .MuiTab-root': {
                transition: 'all 0.25s ease',
                mx: 0.5,
                borderRadius: '8px 8px 0 0',
                opacity: 0.75,
                textTransform: 'none',
                fontSize: '0.9rem',
                '&:hover': {
                  opacity: 1,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(91, 127, 245, 0.08)' : 'rgba(59, 94, 219, 0.04)',
                  '& .MuiSvgIcon-root': {
                    transform: 'translateY(-2px) scale(1.1)',
                    color: 'primary.main',
                  }
                },
                '&.Mui-selected': {
                  opacity: 1,
                  fontWeight: 700,
                  '& .MuiSvgIcon-root': {
                    transform: 'scale(1.15)',
                    color: 'primary.main',
                  }
                }
              }
            }}
          >
            <Tab icon={<MapIcon sx={{ fontSize: 20, transition: 'transform 0.25s' }} />} iconPosition="start" label="🗺️ Vue Terrain" sx={{ fontWeight: 600, minHeight: 64 }} />
            <Tab icon={<PeopleIcon sx={{ fontSize: 20, transition: 'transform 0.25s' }} />} iconPosition="start" label="👥 Carnet d'adresses" sx={{ fontWeight: 600, minHeight: 64 }} />
            <Tab icon={<WorkIcon sx={{ fontSize: 20, transition: 'transform 0.25s' }} />} iconPosition="start" label="📅 Planning & Missions" sx={{ fontWeight: 600, minHeight: 64 }} />
            <Tab icon={<BarChartIcon sx={{ fontSize: 20, transition: 'transform 0.25s' }} />} iconPosition="start" label="📊 Activité & Rapports" sx={{ fontWeight: 600, minHeight: 64 }} />
            <Tab icon={<PersonIcon sx={{ fontSize: 20, transition: 'transform 0.25s' }} />} iconPosition="start" label="👷 Votre Équipe" sx={{ fontWeight: 600, minHeight: 64 }} />
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
                    Vue d'ensemble du terrain
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Suivez l'activité de vos équipes en temps réel et gardez un œil sur les interventions de la journée. Cliquez sur un filtre pour isoler un type de marqueur.
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h4" component="h2" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
                    Fiches Clients
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
                    Gérez votre portefeuille client. L'adresse est géocodée et synchronisée avec la carte.
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />} 
                  onClick={() => setShowAddClient(true)}
                  sx={{ 
                    borderRadius: '12px', 
                    py: 1.5, 
                    px: 3, 
                    fontWeight: 700, 
                    textTransform: 'none',
                    boxShadow: '0 8px 20px -6px rgba(79, 70, 229, 0.4)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px -6px rgba(79, 70, 229, 0.5)' }
                  }}
                >
                  + Ajouter un client
                </Button>
              </Box>

              <Paper sx={{ 
                p: 3, 
                borderRadius: '24px', 
                border: 'none', 
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)',
                background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(180deg, #151c2c 0%, #0b0f19 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
              }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <Box sx={{ flexGrow: 1, maxWidth: 400 }}>
                    <TextField 
                      placeholder="Rechercher un client, une adresse..." 
                      size="medium"
                      fullWidth
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleGlobalSearch}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#94a3b8' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          bgcolor: 'background.paper', 
                          borderRadius: '14px',
                          transition: 'all 0.3s',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                          '& fieldset': { borderColor: (theme) => theme.palette.mode === 'dark' ? '#2e3b4e' : '#e2e8f0' },
                          '&:hover fieldset': { borderColor: (theme) => theme.palette.mode === 'dark' ? '#4f46e5' : '#cbd5e1' },
                          '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '2px' },
                          '&.Mui-focused': { boxShadow: '0 4px 20px rgba(79, 70, 229, 0.15)' }
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ ml: 1, mt: 1, display: 'block', color: 'text.secondary', fontWeight: 500 }}>
                      <kbd style={{ background: 'var(--bg-app)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>Entrée</kbd> pour localiser sur la carte.
                    </Typography>
                  </Box>
                  <FormControl size="medium" sx={{ width: 220 }}>
                    <Select
                      value={clientTypeFilter}
                      onChange={(e) => setClientTypeFilter(e.target.value)}
                      displayEmpty
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            zIndex: 9999,
                            borderRadius: '16px',
                            mt: 1,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                            '& .MuiMenuItem-root': {
                              py: 1.2,
                              px: 2,
                              borderRadius: '8px',
                              mx: 1,
                              mb: 0.5,
                              transition: 'all 0.15s',
                              '&:hover': {
                                bgcolor: 'primary.main',
                                color: 'white',
                                transform: 'translateX(4px)',
                              }
                            }
                          }
                        },
                        disablePortal: false
                      }}
                      sx={{ 
                        bgcolor: 'background.paper',
                        borderRadius: '14px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        '& fieldset': { borderColor: (theme) => theme.palette.mode === 'dark' ? '#2e3b4e' : '#e2e8f0' },
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

                <TableContainer sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0b0f19' : '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', py: 2.5, whiteSpace: 'nowrap' }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', py: 2.5, whiteSpace: 'nowrap' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', py: 2.5, whiteSpace: 'nowrap' }}>Adresse</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', py: 2.5, whiteSpace: 'nowrap' }}>GPS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', py: 2.5, whiteSpace: 'nowrap' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow 
                          key={client.id} 
                          hover 
                          onClick={() => setSelectedClientDetail(client)}
                          sx={{ 
                            opacity: client.archived ? 0.6 : 1,
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f1f5f9' },
                            '&:last-child td, &:last-child th': { border: 0 }
                          }}
                        >
                          <TableCell component="th" scope="row" sx={{ whiteSpace: 'nowrap' }}>
                            <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem' }}>{client.name}</Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Chip 
                              icon={client.type === 'entreprise' ? <BusinessIcon sx={{ fontSize: '14px !important', color: client.type === 'entreprise' ? '#1e40af !important' : 'inherit' }} /> : <PersonIcon sx={{ fontSize: '14px !important', color: client.type === 'particulier' ? '#86198f !important' : 'inherit' }} />}
                              label={client.type === 'entreprise' ? 'Entreprise' : 'Particulier'} 
                              size="small"
                              sx={{ 
                                fontWeight: 700, 
                                bgcolor: (theme) => client.type === 'entreprise' 
                                  ? (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe') 
                                  : (theme.palette.mode === 'dark' ? 'rgba(236, 72, 153, 0.2)' : '#fce7f3'),
                                color: (theme) => client.type === 'entreprise' 
                                  ? (theme.palette.mode === 'dark' ? '#93c5fd' : '#1e40af') 
                                  : (theme.palette.mode === 'dark' ? '#f9a8d4' : '#9d174d'),
                                border: 'none',
                                px: 1
                              }}
                              onClick={(e) => { e.stopPropagation(); setClientTypeFilter(client.type); }}
                            />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', fontWeight: 500 }}>{client.address}</Typography>
                          </TableCell>
                          <TableCell 
                            onClick={(e) => { e.stopPropagation(); centerMapOnGps(client.gps.lat, client.gps.lng); }}
                            sx={{ cursor: 'pointer', whiteSpace: 'nowrap', '&:hover': { opacity: 0.8 } }}
                            title="Cliquez pour centrer la carte"
                          >
                            <Box sx={{ 
                              display: 'inline-flex', alignItems: 'center', gap: 0.5, 
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#f1f5f9', 
                              px: 1.5, py: 0.5, borderRadius: '8px', 
                              color: (theme) => theme.palette.mode === 'dark' ? '#818cf8' : '#6366f1', 
                              fontFamily: 'monospace', fontWeight: 600 
                            }}>
                              <PlaceIcon sx={{ fontSize: 14 }} />
                              {client.gps.lat.toFixed(4)}, {client.gps.lng.toFixed(4)}
                            </Box>
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, whiteSpace: 'nowrap' }}>
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => { setEditClientData(client); setShowEditClient(true); }}
                              startIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>}
                              sx={{ fontWeight: 600, color: 'text.secondary', '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9', color: 'text.primary' } }}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="text"
                              size="small"
                              color={client.archived ? 'primary' : 'inherit'}
                              onClick={() => updateClient({ ...client, archived: !client.archived })}
                              startIcon={client.archived ? <UnarchiveIcon sx={{ fontSize: 18 }} /> : <ArchiveIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                              sx={{ 
                                fontWeight: 600, 
                                color: client.archived ? 'primary.main' : 'text.secondary',
                                '&:hover': { 
                                  bgcolor: (theme) => client.archived 
                                    ? (theme.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.2)' : '#e0e7ff') 
                                    : (theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9'), 
                                  color: client.archived ? 'primary.light' : 'text.primary' 
                                }
                              }}
                            >
                              {client.archived ? 'Restaurer' : 'Archiver'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredClients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
                              <SearchIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>Aucun client trouvé</Typography>
                              <Typography variant="body2">Essayez de modifier votre recherche ou vos filtres.</Typography>
                            </Box>
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

          {/* TAB 3: RAPPORTS & EXPORTS */}
          {activeTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Rapports & Statistiques
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Générez des rapports d'interventions en PDF.
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="secondary" 
                  startIcon={<PictureAsPdfIcon />} 
                  onClick={() => {
                    const doc = new jsPDF();
                    const pageWidth = doc.internal.pageSize.width;
                    const pageHeight = doc.internal.pageSize.height;
                    
                    // --- TOP DECORATIVE ACCENT BAR ---
                    doc.setFillColor(30, 58, 138); // Deep blue
                    doc.rect(0, 0, pageWidth, 4, 'F');
                    
                    // --- HEADER BRAND LOGO ---
                    // Double border outer circle
                    doc.setDrawColor(148, 163, 184); // #94a3b8
                    doc.setLineWidth(0.2);
                    doc.circle(24, 28, 10, 'S');
                    doc.circle(24, 28, 9.4, 'S');
                    
                    // 'YA' text inside logo
                    doc.setFontSize(5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(100, 116, 139); // #64748b
                    doc.text("YA", 24, 21.5, { align: 'center' });
                    
                    // Left wing (sky blue stop)
                    doc.setFillColor(125, 211, 252); // #7dd3fc
                    doc.triangle(24, 25.4, 17, 24.2, 23, 30.0, 'FD');
                    
                    // Right wing (sky blue stop)
                    doc.setFillColor(125, 211, 252); // #7dd3fc
                    doc.triangle(24, 25.4, 31, 24.2, 25, 30.0, 'FD');
                    
                    // Left body (indigo / primary blue)
                    doc.setFillColor(79, 70, 229); // #4f46e5
                    doc.triangle(24, 25.4, 23, 30.0, 24, 32.0, 'FD');
                    
                    // Right body (indigo / primary blue)
                    doc.setFillColor(79, 70, 229); // #4f46e5
                    doc.triangle(24, 25.4, 25, 30.0, 24, 32.0, 'FD');
                    
                    // Tail feathers
                    doc.setDrawColor(79, 70, 229);
                    doc.setLineWidth(0.6);
                    doc.line(24, 32.0, 24, 34.5);
                    doc.line(24, 32.0, 22, 34.0);
                    doc.line(24, 32.0, 26, 34.0);
                    
                    // Wing accents
                    doc.setLineWidth(0.5);
                    doc.line(17.6, 26.6, 22.0, 30.0);
                    doc.line(30.4, 26.6, 26.0, 30.0);
                    
                    // Bird head
                    doc.setFillColor(79, 70, 229);
                    doc.circle(24, 25.0, 0.6, 'F');
                    
                    // Company Name next to the logo
                    doc.setFontSize(24);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 58, 138); // Deep blue
                    doc.text("YA CONSULTING", 42, 25);
                    
                    // Company details with custom icons
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139); // Slate-500
                    
                    // Icon Pin
                    doc.setFillColor(100, 116, 139);
                    doc.circle(43.5, 30.2, 0.7, 'F');
                    doc.triangle(42.8, 30.2, 44.2, 30.2, 43.5, 31.8, 'F');
                    doc.setFillColor(255, 255, 255);
                    doc.circle(43.5, 30.2, 0.25, 'F');
                    doc.setTextColor(100, 100, 100);
                    doc.text("Riviera Palmeraie, Cocody, Abidjan", 46, 31);
                    
                    // Icon Phone
                    doc.setDrawColor(100, 116, 139);
                    doc.setLineWidth(0.3);
                    doc.roundedRect(42.7, 34.2, 1.6, 2.4, 0.4, 0.4, 'D');
                    doc.setFillColor(100, 116, 139);
                    doc.circle(43.5, 36.0, 0.2, 'F');
                    doc.text("Téléphone : (225) 01 52 22 63 12 / 05 65 24 69 74", 46, 36);
                    
                    // Icon Email
                    doc.setDrawColor(100, 116, 139);
                    doc.setLineWidth(0.3);
                    doc.rect(42.5, 39.5, 2.0, 1.3, 'D');
                    doc.line(42.5, 39.5, 43.5, 40.2);
                    doc.line(44.5, 39.5, 43.5, 40.2);
                    doc.text("Email : contact@ya-consulting.com", 46, 41);

                    // Document Type (Right side, slightly higher to prevent overlap)
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(15, 23, 42);
                    doc.text("RAPPORT D'INTERVENTIONS", pageWidth - 14, 18, { align: 'right' });
                    
                    // Document Meta (Right side, aligned vertically with company details)
                    doc.setFontSize(9.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    const docId = `REF-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${new Date().getFullYear()}`;
                    doc.text(`Réf : ${docId}`, pageWidth - 14, 25, { align: 'right' });
                    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 30, { align: 'right' });

                    // Divider line
                    doc.setDrawColor(226, 232, 240); // slate-200
                    doc.setLineWidth(0.5);
                    doc.line(14, 48, pageWidth - 14, 48);

                    // --- SUMMARY BOX ---
                    const totalOps = operations.length;
                    const doneOps = operations.filter(o => o.status === 'terminée').length;
                    const rate = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;
                    
                    // Card background
                    doc.setFillColor(245, 247, 250); // Soft grey-blue
                    doc.setDrawColor(226, 232, 240); // Border color
                    doc.setLineWidth(0.4);
                    doc.roundedRect(14, 54, pageWidth - 28, 24, 3, 3, 'FD');
                    
                    // Col 1: Total Interventions
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(100, 116, 139);
                    doc.text("TOTAL INTERVENTIONS", 24, 61);
                    doc.setFontSize(18);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 58, 138); // Deep blue
                    doc.text(totalOps.toString(), 24, 71);
                    
                    // Col 2: Missions Terminées
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(100, 116, 139);
                    doc.text("MISSIONS TERMINÉES", 88, 61);
                    doc.setFontSize(18);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(16, 185, 129); // Green
                    doc.text(doneOps.toString(), 88, 71);
                    
                    // Col 3: Taux de Réussite
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(100, 116, 139);
                    doc.text("TAUX DE RÉUSSITE", 152, 61);
                    doc.setFontSize(18);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(124, 58, 237); // Purple
                    doc.text(`${rate}%`, 152, 71);
                    
                    // Column Dividers
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.4);
                    doc.line(78, 58, 78, 74);
                    doc.line(140, 58, 140, 74);

                    // --- TABLE ---
                    const sortedOps = [...operations].sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                    const tableData = sortedOps.map(o => {
                      const client = clients.find(c => c.id === o.clientId);
                      const emp = employees.find(e => e.id === o.employeeId);
                      return [
                        new Date(o.date).toLocaleDateString('fr-FR'),
                        client?.name || 'Inconnu',
                        emp?.name || 'Inconnu',
                        o.status.toUpperCase(),
                        o.description
                      ];
                    });

                    autoTable(doc, {
                      startY: 85,
                      head: [['Date', 'Client', 'Technicien', 'Statut', 'Description / Motif']],
                      body: tableData,
                      theme: 'grid',
                      headStyles: { 
                        fillColor: [30, 58, 138], 
                        textColor: [255, 255, 255], 
                        fontStyle: 'bold',
                        halign: 'left'
                      },
                      styles: { 
                        font: 'helvetica',
                        fontSize: 9,
                        cellPadding: 4,
                        textColor: [51, 65, 85],
                        lineColor: [226, 232, 240],
                        lineWidth: 0.1
                      },
                      alternateRowStyles: { fillColor: [250, 251, 252] },
                      columnStyles: {
                        0: { cellWidth: 28 }, // Date column
                        3: { fontStyle: 'bold', cellWidth: 32 } // Status column
                      },
                      didParseCell: function(data) {
                        // Center align Date (col 0) and Status (col 3) headers and values
                        if (data.column.index === 0 || data.column.index === 3) {
                          data.cell.styles.halign = 'center';
                        }
                        
                        if (data.section === 'body' && data.column.index === 3) {
                          data.cell.styles.fontSize = 8.5;
                          data.cell.styles.valign = 'middle';
                          if (data.cell.raw === 'TERMINÉE') {
                            data.cell.styles.fillColor = [209, 250, 229]; // light green badge
                            data.cell.styles.textColor = [6, 95, 70];    // dark green text
                          } else if (data.cell.raw === 'EN COURS') {
                            data.cell.styles.fillColor = [254, 243, 199]; // light orange badge
                            data.cell.styles.textColor = [146, 64, 14];   // dark orange text
                          } else if (data.cell.raw === 'PLANIFIÉE') {
                            data.cell.styles.fillColor = [219, 234, 254]; // light blue badge
                            data.cell.styles.textColor = [30, 58, 138];   // dark blue text
                          }
                        }
                      }
                    });
                    
                    const finalY = doc.lastAutoTable.finalY || 85;

                    // --- FOOTER NOTE ---
                    doc.setFontSize(9.5);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(148, 163, 184);
                    doc.text("Document généré automatiquement et certifié conforme par le système YA Consulting.", pageWidth / 2, finalY + 12, { align: 'center' });

                    // --- PAGINATION ---
                    const pageCount = doc.internal.getNumberOfPages();
                    for(let i = 1; i <= pageCount; i++) {
                      doc.setPage(i);
                      
                      // Footer divider line
                      doc.setDrawColor(226, 232, 240);
                      doc.setLineWidth(0.3);
                      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
                      
                      doc.setFontSize(8);
                      doc.setFont('helvetica', 'normal');
                      doc.setTextColor(150, 150, 150);
                      doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 9, { align: 'center' });
                    }
                    
                    const blob = doc.output('blob');
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    doc.save(`Facture_Rapport_YA_Consulting_${new Date().toISOString().slice(0,10)}.pdf`);
                  }}
                  sx={{ boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)' }}
                >
                  Exporter Rapport PDF
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {operations.length}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">Total Interventions</Typography>
                </Paper>
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                  <Typography variant="h3" color="success.main" fontWeight="bold">
                    {operations.filter(o => o.status === 'terminée').length}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">Missions Terminées</Typography>
                </Paper>
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                  <Typography variant="h3" color="secondary.main" fontWeight="bold">
                    {clients.length}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">Clients Actifs</Typography>
                </Paper>
              </Box>
            </Box>
          )}

          {/* TAB 4: ÉQUIPE / EMPLOYÉS */}
          {activeTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                  Gestion de l'Équipe
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAddEmp(true)} sx={{ borderRadius: 2 }}>
                  Ajouter un collaborateur
                </Button>
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Nom</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Rôle</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Téléphone</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textAlign: 'center' }}>Statut</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textAlign: 'right' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, opacity: emp.status === 'inactif' ? 0.6 : 1 }}>
                        <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={emp.avatar} alt={emp.name} sx={{ width: 36, height: 36 }} />
                          <Typography fontWeight={600} color="text.primary">{emp.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={emp.role === 'admin' ? 'Administrateur' : 'Employé'} 
                            size="small" 
                            color={emp.role === 'admin' ? 'secondary' : 'default'}
                            variant={emp.role === 'admin' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>{emp.phone}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={emp.status === 'active' ? 'Actif' : 'Inactif'} 
                            color={emp.status === 'active' ? 'success' : 'error'} 
                            size="small" 
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button 
                            size="small" 
                            color={emp.status === 'active' ? 'error' : 'success'}
                            variant="outlined"
                            onClick={() => toggleEmployeeStatus(emp)}
                            disabled={emp.role === 'admin' && employees.filter(e => e.role === 'admin' && e.status === 'active').length === 1}
                          >
                            {emp.status === 'active' ? 'Désactiver' : 'Activer'}
                          </Button>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={async () => {
                              if(window.confirm('Voulez-vous vraiment supprimer définitivement cet employé ?')) {
                                await deleteEmployee(emp.id);
                              }
                            }}
                            disabled={emp.role === 'admin' && employees.filter(e => e.role === 'admin').length === 1}
                            title="Supprimer définitivement"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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

              {/* ── Adresse + autocomplétion ── */}
              <Box sx={{ position: 'relative' }}>
                <TextField
                  label="Adresse (rue, immeuble, lieu-dit)"
                  required={!showManualGps}
                  fullWidth
                  placeholder="Ex: Bd Giscard d'Estaing, Immeuble Alliance, Rue 12…"
                  value={newClientAddress}
                  onChange={(e) => handleAddressAutocomplete(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  helperText={showManualGps ? '🧭 Mode GPS manuel activé — coordonnées utilisées à la place.' : '💡 Tapez pour voir des suggestions d\'adresses à Abidjan.'}
                />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <Box sx={{
                    position: 'absolute', zIndex: 1300, top: '100%', left: 0, right: 0,
                    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                    borderRadius: 2, boxShadow: 4, maxHeight: 200, overflowY: 'auto', mt: 0.5
                  }}>
                    {addressSuggestions.map((s, i) => (
                      <Box key={i} sx={{
                        p: 1.25, cursor: 'pointer', fontSize: '0.82rem',
                        borderBottom: i < addressSuggestions.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                        onMouseDown={() => {
                          const parts = s.display_name.split(',');
                          setNewClientAddress(parts.slice(0, 2).join(',').trim());
                          setShowSuggestions(false);
                        }}
                      >
                        📍 {s.display_name}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* ── Commune/Quartier — saisie libre ou sélection ── */}
              <Autocomplete
                freeSolo
                options={[
                  'Plateau', 'Cocody', 'Marcory', 'Treichville', 'Adjamé',
                  'Yopougon', 'Abobo', 'Koumassi', 'Port-Bouët', 'Bingerville',
                  'Anyama', 'Songon', 'Angré', 'Riviera', '2 Plateaux',
                  'Zone 4', 'Zone 3', 'Zone 2', 'Zone 1', 'Biétry',
                  'Vridi', 'Gonzagueville', 'Niangon', 'Selmer', 'Sogefiha',
                  'Williamsville', 'Adjamé Liberté', 'N\'Dotré', 'Gbinta', 'Bonoumin'
                ]}
                value={newClientCommune}
                onInputChange={(_, value) => setNewClientCommune(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Commune / Quartier d'Abidjan"
                    placeholder="Sélectionnez ou tapez un quartier…"
                    helperText="💡 Choisissez dans la liste ou saisissez librement (ex : Angré, Riviera, 2 Plateaux…)"
                  />
                )}
              />

              {/* ── GPS Manuel (toggle) ── */}
              <Box>
                <Button
                  size="small"
                  variant={showManualGps ? 'contained' : 'outlined'}
                  color={showManualGps ? 'secondary' : 'inherit'}
                  startIcon={<LocationOnIcon />}
                  onClick={() => setShowManualGps(v => !v)}
                  sx={{ mb: showManualGps ? 1.5 : 0, fontSize: '0.8rem' }}
                >
                  {showManualGps ? '🧭 GPS Manuel activé' : '📐 Saisir les coordonnées GPS manuellement'}
                </Button>
                {showManualGps && (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Latitude"
                        fullWidth
                        size="small"
                        placeholder="Ex: 5.3211"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        helperText="Latitude (N/S)"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Longitude"
                        fullWidth
                        size="small"
                        placeholder="Ex: -4.0180"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        helperText="Longitude (E/W)"
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Téléphone"
                    fullWidth
                    placeholder="Ex: +225 07 00 00 00"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Adresse Email"
                    type="email"
                    fullWidth
                    placeholder="Ex: contact@entreprise.ci"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Nom du contact principal"
                fullWidth
                placeholder="Ex: M. Koffi Konan, Responsable SI"
                value={newClientContactName}
                onChange={(e) => setNewClientContactName(e.target.value)}
              />

              <TextField
                label="Notes de guidage / Description"
                fullWidth
                multiline
                rows={3}
                placeholder="Ex: Portail bleu à côté de la pharmacie, 2ème étage, demander Mme Konan…"
                value={newClientNotes}
                onChange={(e) => setNewClientNotes(e.target.value)}
              />

              {geocodingAlert && (
                <Alert
                  severity={geocodingAlert.type}
                  icon={geocodingAlert.type === 'success' ? <CheckCircleIcon /> : geocodingAlert.type === 'warning' ? <WarningIcon /> : <ErrorIcon />}
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
                disabled={geocodingAlert?.type === 'success' || geocodingLoading}
              >
                {geocodingLoading ? '🔍 Géocodage…' : '🗺️ Enregistrer & Géocoder'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* MODAL: EDIT CLIENT */}
        <Dialog open={showEditClient} onClose={() => { setShowEditClient(false); setGeocodingAlert(null); }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Modifier le client</DialogTitle>
          {editClientData && (
            <form onSubmit={handleEditClientSubmit}>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <TextField
                  label="Nom ou Raison Sociale"
                  required
                  fullWidth
                  value={editClientData.name}
                  onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                />

                <FormControl fullWidth>
                  <InputLabel id="edit-client-type-label">Type de Client</InputLabel>
                  <Select
                    labelId="edit-client-type-label"
                    label="Type de Client"
                    value={editClientData.type}
                    onChange={(e) => setEditClientData({ ...editClientData, type: e.target.value })}
                  >
                    <MenuItem value="entreprise">🏢 Entreprise</MenuItem>
                    <MenuItem value="particulier">👤 Particulier</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Adresse (rue, immeuble, lieu-dit)"
                  required={!editClientData?.useManualGps}
                  fullWidth
                  value={editClientData.address}
                  onChange={(e) => setEditClientData({ ...editClientData, address: e.target.value })}
                  helperText="💡 Modifiez pour re-géocoder. Ajoutez un quartier pour améliorer la précision."
                />

                {/* Commune edit — saisie libre ou sélection */}
                <Autocomplete
                  freeSolo
                  options={[
                    'Plateau', 'Cocody', 'Marcory', 'Treichville', 'Adjamé',
                    'Yopougon', 'Abobo', 'Koumassi', 'Port-Bouët', 'Bingerville',
                    'Anyama', 'Songon', 'Angré', 'Riviera', '2 Plateaux',
                    'Zone 4', 'Zone 3', 'Zone 2', 'Zone 1', 'Biétry',
                    'Vridi', 'Gonzagueville', 'Niangon', 'Selmer', 'Sogefiha',
                    'Williamsville', 'Adjamé Liberté', "N'Dotré", 'Gbinta', 'Bonoumin'
                  ]}
                  value={editClientData.commune || ''}
                  onInputChange={(_, value) => setEditClientData({ ...editClientData, commune: value })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Commune / Quartier"
                      placeholder="Sélectionnez ou tapez un quartier…"
                      helperText="💡 Choisissez dans la liste ou saisissez librement (ex : Angré, Riviera, 2 Plateaux…)"
                    />
                  )}
                />

                {/* GPS manuel edit */}
                <Box>
                  <Button
                    size="small"
                    variant={editClientData?.useManualGps ? 'contained' : 'outlined'}
                    color={editClientData?.useManualGps ? 'secondary' : 'inherit'}
                    startIcon={<LocationOnIcon />}
                    onClick={() => setEditClientData({ ...editClientData, useManualGps: !editClientData.useManualGps })}
                    sx={{ mb: editClientData?.useManualGps ? 1.5 : 0, fontSize: '0.8rem' }}
                  >
                    {editClientData?.useManualGps ? '🧭 GPS Manuel activé' : '📐 Saisir coordonnées GPS manuellement'}
                  </Button>
                  {editClientData?.useManualGps && (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Latitude"
                          fullWidth
                          size="small"
                          placeholder="Ex: 5.3211"
                          value={editClientData.manualLat || ''}
                          onChange={(e) => setEditClientData({ ...editClientData, manualLat: e.target.value })}
                          helperText={`Actuel: ${editClientData.gps?.lat?.toFixed(5) || '—'}`}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Longitude"
                          fullWidth
                          size="small"
                          placeholder="Ex: -4.0180"
                          value={editClientData.manualLng || ''}
                          onChange={(e) => setEditClientData({ ...editClientData, manualLng: e.target.value })}
                          helperText={`Actuel: ${editClientData.gps?.lng?.toFixed(5) || '—'}`}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Téléphone"
                      fullWidth
                      value={editClientData.phone || ''}
                      onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Adresse Email"
                      type="email"
                      fullWidth
                      value={editClientData.email || ''}
                      onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Nom du contact principal"
                  fullWidth
                  value={editClientData.contactName || ''}
                  onChange={(e) => setEditClientData({ ...editClientData, contactName: e.target.value })}
                />

                <TextField
                  label="Notes de guidage / Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={editClientData.notes || ''}
                  onChange={(e) => setEditClientData({ ...editClientData, notes: e.target.value })}
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
                  onClick={() => { setShowEditClient(false); setGeocodingAlert(null); }}
                  disabled={geocodingAlert?.type === 'success'}
                  color="inherit"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={geocodingAlert?.type === 'success' || geocodingLoading}
                >
                  {geocodingLoading ? '🔍 Géocodage…' : '🗺️ Mettre à jour & Géocoder'}
                </Button>
              </DialogActions>
            </form>
          )}
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
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW_CLIENT') {
                      setShowAddClient(true);
                    } else {
                      setNewOpClient(e.target.value);
                    }
                  }}
                >
                  <MenuItem value="ADD_NEW_CLIENT" sx={{ fontWeight: 'bold', color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider' }}>
                    ➕ Ajouter un nouveau client...
                  </MenuItem>
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

                    {client.contactName && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}><PersonIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary={client.contactName} 
                          secondary="Contact Principal"
                        />
                      </ListItem>
                    )}

                    {client.phone && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}><PhoneIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary={client.phone} 
                          secondary="Téléphone"
                        />
                      </ListItem>
                    )}

                    {client.email && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}><EmailIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary={client.email} 
                          secondary="Adresse Email"
                        />
                      </ListItem>
                    )}

                    {client.notes && (
                      <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </ListItemIcon>
                        <ListItemText 
                          primary={<Typography variant="body2" sx={{ whiteSpace: 'pre-line', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>{client.notes}</Typography>} 
                          secondary="Notes & Consignes de guidage"
                        />
                      </ListItem>
                    )}
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
                    variant="text" 
                    size="small" 
                    color={client.archived ? 'primary' : 'inherit'}
                    onClick={() => { updateClient({ ...client, archived: !client.archived }); setSelectedClientDetail(null); }}
                    startIcon={client.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                    sx={{ mr: 'auto' }}
                  >
                    {client.archived ? 'Restaurer' : 'Archiver'}
                  </Button>
                  <Button variant="outlined" onClick={() => setSelectedClientDetail(null)}>Fermer</Button>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => { 
                      setNewOpClient(client.id); 
                      setShowAddOp(true); 
                      setSelectedClientDetail(null); 
                    }}
                  >
                    Planifier une mission
                  </Button>
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

                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                      Modifier la photo de profil :
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {AVATAR_PRESETS.map((presetUrl) => (
                        <Avatar
                          key={presetUrl}
                          src={presetUrl}
                          onClick={async () => {
                            try {
                              await updateEmployee({ ...emp, avatar: presetUrl });
                              setSelectedEmpDetail({ ...emp, avatar: presetUrl });
                            } catch (err) {
                              alert("Erreur lors de la modification de la photo de profil.");
                            }
                          }}
                          sx={{
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: emp.avatar === presetUrl ? 'primary.main' : 'transparent',
                            '&:hover': {
                              transform: 'scale(1.15)',
                              borderColor: 'primary.light'
                            },
                            transition: 'all 0.15s'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>

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

        {/* MODAL: ADD EMPLOYEE */}
        <Dialog open={showAddEmp} onClose={() => setShowAddEmp(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Ajouter un collaborateur</DialogTitle>
          <form onSubmit={handleAddEmpSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <TextField
                label="Nom Complet"
                required
                fullWidth
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
              />
              <TextField
                label="Adresse Email"
                required
                type="email"
                fullWidth
                value={newEmpEmail}
                onChange={(e) => setNewEmpEmail(e.target.value)}
              />
              <TextField
                label="Numéro de Téléphone"
                required
                fullWidth
                value={newEmpPhone}
                onChange={(e) => setNewEmpPhone(e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel>Rôle</InputLabel>
                <Select
                  value={newEmpRole}
                  label="Rôle"
                  onChange={(e) => setNewEmpRole(e.target.value)}
                >
                  <MenuItem value="employee">Employé (Technicien terrain)</MenuItem>
                  <MenuItem value="admin">Administrateur</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                  Sélectionner une photo de profil :
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {AVATAR_PRESETS.map((presetUrl) => (
                    <Avatar
                      key={presetUrl}
                      src={presetUrl}
                      onClick={() => setNewEmpAvatar(presetUrl)}
                      sx={{
                        width: 40,
                        height: 40,
                        cursor: 'pointer',
                        border: '3px solid',
                        borderColor: newEmpAvatar === presetUrl ? 'primary.main' : 'transparent',
                        boxShadow: newEmpAvatar === presetUrl ? 3 : 0,
                        '&:hover': {
                          transform: 'scale(1.1)',
                          borderColor: 'primary.light'
                        },
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 1 }}>
                Le mot de passe par défaut sera généré automatiquement : <b>password123</b>. Le collaborateur pourra le modifier ultérieurement (fonctionnalité à venir).
              </Alert>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={() => setShowAddEmp(false)} color="inherit">Annuler</Button>
              <Button type="submit" variant="contained" color="primary">Ajouter</Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

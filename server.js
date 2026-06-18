import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Seed data (Abidjan, Côte d'Ivoire)
const seedData = {
  employees: [
    {
      id: "emp_1",
      name: "Koffi Kouadio",
      email: "koffi.kouadio@yaconsulting.ci",
      phone: "07 08 09 10 11",
      role: "employee",
      status: "active",
      gps: { lat: 5.3245, lng: -4.0205 }, // Plateau, Abidjan
      workingHours: { start: "07:30", end: "17:30" },
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "emp_2",
      name: "Aminata Diallo",
      email: "aminata.diallo@yaconsulting.ci",
      phone: "05 45 67 89 01",
      role: "employee",
      status: "active",
      gps: { lat: 5.3571, lng: -3.9897 }, // Cocody St-Jean, Abidjan
      workingHours: { start: "08:00", end: "18:00" },
      avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "emp_admin",
      name: "Thomas Touré",
      email: "thomas.toure@yaconsulting.ci",
      phone: "01 22 33 44 55",
      role: "admin",
      status: "active",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
    }
  ],
  clients: [
    {
      id: "client_1",
      name: "Société Ivoirienne de Banque (SIB)",
      type: "entreprise",
      address: "Boulevard de la République, Plateau, Abidjan",
      gps: { lat: 5.3211, lng: -4.0180 },
      archived: false
    },
    {
      id: "client_2",
      name: "M. Bakary Bamba",
      type: "particulier",
      address: "Avenue 8, Rue 12, Zone 4, Marcory, Abidjan",
      gps: { lat: 5.3050, lng: -3.9785 },
      archived: false
    },
    {
      id: "client_3",
      name: "Clinique Médicale de l'Indénié",
      type: "entreprise",
      address: "Avenue Noguès, Plateau, Abidjan",
      gps: { lat: 5.3405, lng: -4.0150 },
      archived: false
    },
    {
      id: "client_4",
      name: "Mme. Marie-Claude Konan",
      type: "particulier",
      address: "Cité CNPS, Angré 22e Arrondissement, Cocody, Abidjan",
      gps: { lat: 5.3955, lng: -3.9710 },
      archived: false
    },
    {
      id: "client_5",
      name: "Orange Côte d'Ivoire",
      type: "entreprise",
      address: "Boulevard Valéry Giscard d'Estaing, Marcory, Abidjan",
      gps: { lat: 5.3150, lng: -3.9920 },
      archived: false
    }
  ],
  operations: [
    {
      id: "op_1",
      clientId: "client_1",
      description: "Maintenance préventive des serveurs du siège social (SIB)",
      date: "2026-06-18",
      employeeId: "emp_1",
      status: "en cours",
      createdAt: "2026-06-17T10:00:00Z"
    },
    {
      id: "op_2",
      clientId: "client_2",
      description: "Installation et configuration de la fibre optique à domicile",
      date: "2026-06-18",
      employeeId: "emp_1",
      status: "planifiée",
      createdAt: "2026-06-17T11:30:00Z"
    },
    {
      id: "op_3",
      clientId: "client_3",
      description: "Audit de sécurité réseau et mise à jour du firewall de la clinique",
      date: "2026-06-18",
      employeeId: "emp_2",
      status: "en cours",
      createdAt: "2026-06-17T14:15:00Z"
    },
    {
      id: "op_4",
      clientId: "client_4",
      description: "Dépannage de la liaison sans fil et paramétrage du routeur WiFi",
      date: "2026-06-19",
      employeeId: "emp_2",
      status: "planifiée",
      createdAt: "2026-06-18T08:00:00Z"
    }
  ]
};

// Helper: Write DB
const writeDatabase = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error("Erreur d'écriture dans database.json :", error);
  }
};

// Helper: Read DB
const readDatabase = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeDatabase(seedData);
      return seedData;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error("Erreur de lecture de database.json :", error);
    return seedData;
  }
};

// Initialize DB if not present
readDatabase();

// --- API ROUTES ---

// 1. Clients
app.get('/api/clients', (req, res) => {
  const db = readDatabase();
  res.json(db.clients);
});

app.post('/api/clients', (req, res) => {
  const { name, type, address } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: "Champs Nom et Adresse obligatoires" });
  }

  // Côte d'Ivoire Geocoding Simulator
  // Generates realistic coordinates offset near Abidjan center (5.3600, -4.0083)
  const seed = address.length;
  const latOffset = (Math.sin(seed) * 0.04);
  const lngOffset = (Math.cos(seed) * 0.05);

  const gpsCoords = {
    lat: 5.3600 + latOffset,
    lng: -4.0083 + lngOffset
  };

  const db = readDatabase();
  const newClient = {
    id: `client_${db.clients.length + 1}`,
    name,
    type: type || 'particulier',
    address,
    gps: gpsCoords,
    archived: false
  };

  db.clients.push(newClient);
  writeDatabase(db);

  res.status(201).json(newClient);
});

app.put('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const db = readDatabase();
  const index = db.clients.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Client introuvable" });
  }

  db.clients[index] = { ...db.clients[index], ...updatedData };
  writeDatabase(db);

  res.json(db.clients[index]);
});

// 2. Employees
app.get('/api/employees', (req, res) => {
  const db = readDatabase();
  res.json(db.employees);
});

app.put('/api/employees/:id/gps', (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Coordonnées lat et lng obligatoires" });
  }

  const db = readDatabase();
  const index = db.employees.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Employé introuvable" });
  }

  db.employees[index].gps = { lat, lng };
  writeDatabase(db);

  res.json(db.employees[index]);
});

// 3. Operations
app.get('/api/operations', (req, res) => {
  const db = readDatabase();
  res.json(db.operations);
});

app.post('/api/operations', (req, res) => {
  const { clientId, description, date, employeeId } = req.body;
  if (!clientId || !description || !date || !employeeId) {
    return res.status(400).json({ error: "Tous les champs d'opération sont obligatoires" });
  }

  const db = readDatabase();
  const newOp = {
    id: `op_${db.operations.length + 1}`,
    clientId,
    description,
    date,
    employeeId,
    status: "planifiée",
    createdAt: new Date().toISOString()
  };

  db.operations.push(newOp);
  writeDatabase(db);

  res.status(201).json(newOp);
});

app.put('/api/operations/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Statut manquant" });
  }

  const db = readDatabase();
  const index = db.operations.findIndex(o => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Opération introuvable" });
  }

  db.operations[index].status = status;
  writeDatabase(db);

  res.json(db.operations[index]);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Serveur API YA Consulting à l'écoute sur le port ${PORT}`);
});

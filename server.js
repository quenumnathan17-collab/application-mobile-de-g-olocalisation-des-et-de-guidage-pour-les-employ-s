import express from 'express';
import cors from 'cors';
import pkg from '@prisma/client';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- API ROUTES ---

// 1. Clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    const mapped = clients.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      address: c.address,
      gps: { lat: c.latitude, lng: c.longitude },
      archived: c.archived
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', async (req, res) => {
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

  try {
    const clientsCount = await prisma.client.count();
    const newClient = await prisma.client.create({
      data: {
        id: `client_${clientsCount + 1}`,
        name,
        type: type || 'particulier',
        address,
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        archived: false
      }
    });

    res.status(201).json({
      id: newClient.id,
      name: newClient.name,
      type: newClient.type,
      address: newClient.address,
      gps: { lat: newClient.latitude, lng: newClient.longitude },
      archived: newClient.archived
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, address, archived } = req.body;

  try {
    const updated = await prisma.client.update({
      where: { id },
      data: {
        name,
        type,
        address,
        archived
      }
    });

    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      address: updated.address,
      gps: { lat: updated.latitude, lng: updated.longitude },
      archived: updated.archived
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany();
    const mapped = employees.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      role: e.role,
      status: e.status,
      gps: { lat: e.latitude, lng: e.longitude },
      workingHours: { start: e.workingHoursStart, end: e.workingHoursEnd },
      avatar: e.avatar
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id/gps', async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Coordonnées lat et lng obligatoires" });
  }

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        latitude: lat,
        longitude: lng
      }
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      gps: { lat: updated.latitude, lng: updated.longitude },
      workingHours: { start: updated.workingHoursStart, end: updated.workingHoursEnd },
      avatar: updated.avatar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Operations
app.get('/api/operations', async (req, res) => {
  try {
    const operations = await prisma.operation.findMany();
    res.json(operations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/operations', async (req, res) => {
  const { clientId, description, date, employeeId } = req.body;
  if (!clientId || !description || !date || !employeeId) {
    return res.status(400).json({ error: "Tous les champs d'opération sont obligatoires" });
  }

  try {
    const opsCount = await prisma.operation.count();
    const newOp = await prisma.operation.create({
      data: {
        id: `op_${opsCount + 1}`,
        clientId,
        description,
        date,
        employeeId,
        status: "planifiée"
      }
    });
    res.status(201).json(newOp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/operations/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Statut manquant" });
  }

  try {
    const updated = await prisma.operation.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Serveur API YA Consulting à l'écoute sur le port ${PORT}`);
});

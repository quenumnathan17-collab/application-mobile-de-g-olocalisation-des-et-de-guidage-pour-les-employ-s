import express from 'express';
import cors from 'cors';
import pkg from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ya-consulting-super-secret-key-2026';

// SSE Clients
let sseClients = [];

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- API ROUTES ---

// --- 0. Auth & SSE ---
app.post('/api/login', async (req, res) => {
  let { identifier, password } = req.body; // Can be email or phone
  identifier = identifier ? identifier.trim() : identifier;
  
  if (!identifier || !password) {
    return res.status(400).json({ error: "Identifiant et mot de passe requis." });
  }

  try {
    const user = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    if (user.status === 'inactif') {
      return res.status(403).json({ error: "Ce compte a été désactivé. Veuillez contacter l'administrateur." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REGISTER (public) ---
app.post('/api/register', async (req, res) => {
  let { name, email, phone, password, avatar, specialty, commune } = req.body;
  
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "Nom, email, téléphone et mot de passe sont obligatoires." });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }

  try {
    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existing) {
      return res.status(400).json({ error: "Un compte avec cet email ou ce téléphone existe déjà." });
    }

    const empCount = await prisma.employee.count();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Default avatar if not provided
    const chosenAvatar = avatar || AVATAR_PRESETS[empCount % AVATAR_PRESETS.length];
    
    const newEmp = await prisma.employee.create({
      data: {
        id: `emp_${empCount + 1}_${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: 'employee',
        status: 'active',
        latitude: 5.3600,
        longitude: -4.0083,
        workingHoursStart: "08:00",
        workingHoursEnd: "18:00",
        avatar: chosenAvatar,
        password: hashedPassword
      }
    });

    res.status(201).json({ 
      message: "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
      user: {
        id: newEmp.id,
        name: newEmp.name,
        email: newEmp.email,
        phone: newEmp.phone,
        role: newEmp.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: "Identifiant requis." });

  try {
    const user = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });
    
    if (!user) {
      // In production, to prevent enumeration, we might just say "Si le compte existe..."
      return res.status(404).json({ error: "Aucun compte associé à cet identifiant." });
    }

    // SIMULATION of sending email or SMS
    console.log(`[SIMULATION] Lien de réinitialisation envoyé à ${identifier}`);
    
    res.json({ message: "Un lien de réinitialisation vous a été envoyé par e-mail/SMS." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

const broadcastEvent = (data) => {
  sseClients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
};

// --- MIDDLEWARES ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  if (!token) return res.status(401).json({ error: "Accès refusé. Token manquant." });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Session expirée ou token invalide." });
    req.user = decoded;
    next();
  });
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Accès refusé. Privilèges insuffisants." });
    }
    next();
  };
};

// 1. Clients
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    const mapped = clients.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      address: c.address,
      gps: { lat: c.latitude, lng: c.longitude },
      phone: c.phone,
      email: c.email,
      contactName: c.contactName,
      notes: c.notes,
      archived: c.archived
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, type, address, lat, lng, phone, email, contactName, notes } = req.body;
  if (!name || !address || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Champs Nom, Adresse, lat et lng obligatoires" });
  }

  try {
    const clientsCount = await prisma.client.count();
    const newClient = await prisma.client.create({
      data: {
        id: `client_${clientsCount + 1}`,
        name,
        type: type || 'particulier',
        address,
        latitude: lat,
        longitude: lng,
        phone: phone || "",
        email: email || "",
        contactName: contactName || "",
        notes: notes || "",
        archived: false
      }
    });

    res.status(201).json({
      id: newClient.id,
      name: newClient.name,
      type: newClient.type,
      address: newClient.address,
      gps: { lat: newClient.latitude, lng: newClient.longitude },
      phone: newClient.phone,
      email: newClient.email,
      contactName: newClient.contactName,
      notes: newClient.notes,
      archived: newClient.archived
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, type, address, archived, lat, lng, phone, email, contactName, notes } = req.body;

  try {
    const dataToUpdate = { name, type, address, archived };
    if (lat !== undefined && lng !== undefined) {
      dataToUpdate.latitude = lat;
      dataToUpdate.longitude = lng;
    }
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (email !== undefined) dataToUpdate.email = email;
    if (contactName !== undefined) dataToUpdate.contactName = contactName;
    if (notes !== undefined) dataToUpdate.notes = notes;

    const updated = await prisma.client.update({
      where: { id },
      data: dataToUpdate
    });

    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      address: updated.address,
      gps: { lat: updated.latitude, lng: updated.longitude },
      phone: updated.phone,
      email: updated.email,
      contactName: updated.contactName,
      notes: updated.notes,
      archived: updated.archived
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Employees
app.get('/api/employees', authenticateToken, async (req, res) => {
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

app.post('/api/employees', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, email, phone, role, avatar } = req.body;
  if (!name || !email || !phone || !role) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  try {
    // Check if exists
    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existing) {
      return res.status(400).json({ error: "Un employé avec cet email ou téléphone existe déjà." });
    }

    const empCount = await prisma.employee.count();
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Select random avatar preset if not provided
    const chosenAvatar = avatar || AVATAR_PRESETS[empCount % AVATAR_PRESETS.length];
    
    const newEmp = await prisma.employee.create({
      data: {
        id: `emp_${empCount + 1}_${Date.now()}`,
        name,
        email,
        phone,
        role,
        status: "active",
        latitude: 5.3600, // Default to Abidjan center
        longitude: -4.0083,
        workingHoursStart: "08:00",
        workingHoursEnd: "18:00",
        avatar: chosenAvatar,
        password: hashedPassword
      }
    });

    res.status(201).json({
      id: newEmp.id,
      name: newEmp.name,
      email: newEmp.email,
      phone: newEmp.phone,
      role: newEmp.role,
      status: newEmp.status,
      gps: { lat: newEmp.latitude, lng: newEmp.longitude },
      workingHours: { start: newEmp.workingHoursStart, end: newEmp.workingHoursEnd },
      avatar: newEmp.avatar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role, status, avatar } = req.body;

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: { name, email, phone, role, status, avatar }
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

app.delete('/api/employees/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.employee.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update own profile (employee or admin)
app.put('/api/employees/:id/profile', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Only allow if owner or admin
  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Accès refusé." });
  }

  const { name, email, phone, avatar, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.employee.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "Employé introuvable." });

    const dataToUpdate = {};

    if (name  && name.trim())  dataToUpdate.name  = name.trim();
    if (email && email.trim()) {
      // Check uniqueness
      const conflict = await prisma.employee.findFirst({
        where: { email: email.trim().toLowerCase(), NOT: { id } }
      });
      if (conflict) return res.status(400).json({ error: "Cet email est déjà utilisé par un autre compte." });
      dataToUpdate.email = email.trim().toLowerCase();
    }
    if (phone && phone.trim()) dataToUpdate.phone = phone.trim();
    if (avatar !== undefined)  dataToUpdate.avatar = avatar;

    // Password change
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Veuillez fournir votre mot de passe actuel." });
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
      if (newPassword.length < 6) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
      dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.employee.update({ where: { id }, data: dataToUpdate });

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

app.put('/api/employees/:id/gps', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Coordonnées lat et lng obligatoires" });
  }

  // Optional: check if req.user.id === id || req.user.role === 'admin'
  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Accès refusé pour mettre à jour ce GPS." });
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
app.get('/api/operations', authenticateToken, async (req, res) => {
  try {
    const operations = await prisma.operation.findMany();
    res.json(operations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/operations', authenticateToken, requireRole('admin'), async (req, res) => {
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

    // Notify clients about the new assignment
    broadcastEvent({
      type: 'OPERATION_ASSIGNED',
      operationId: newOp.id,
      employeeId: employeeId,
      message: `Nouvelle mission assignée pour le ${new Date(date).toLocaleDateString()}`
    });

    res.status(201).json(newOp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/operations/:id/status', authenticateToken, async (req, res) => {
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

    // Notify clients about the status change
    broadcastEvent({
      type: 'OPERATION_STATUS_CHANGED',
      operationId: id,
      newStatus: status,
      message: `La mission ${id} est maintenant: ${status}`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- 6. Address Reports ---
app.get('/api/address-reports', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const reports = await prisma.addressReport.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/address-reports', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Le contenu du message est requis." });
  }

  try {
    const newReport = await prisma.addressReport.create({
      data: {
        employeeId: req.user.id,
        employeeName: req.user.name,
        message: message.trim()
      }
    });

    // Broadcast to SSE clients to notify admin in real-time
    broadcastEvent({
      type: 'ADDRESS_REPORT_CREATED',
      report: newReport,
      message: `Nouveau signalement d'adresse par ${req.user.name}`
    });

    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/address-reports/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.addressReport.delete({
      where: { id }
    });
    
    // Broadcast event
    broadcastEvent({
      type: 'ADDRESS_REPORT_DELETED',
      reportId: id
    });

    res.json({ message: "Signalement supprimé." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Serveur API YA Consulting à l'écoute sur le port ${PORT}`);
});

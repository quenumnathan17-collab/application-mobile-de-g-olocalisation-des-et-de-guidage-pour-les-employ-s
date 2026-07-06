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

// --- API ROUTES ---

// --- 0. Auth & SaaS Onboarding ---

// --- SaaS Onboarding (Create Organization + Admin account) ---
app.post('/api/organizations', async (req, res) => {
  const { companyName, email, phone, sector, adminName, password } = req.body;

  if (!companyName || !email || !adminName || !password) {
    return res.status(400).json({ error: "Nom de l'entreprise, email, nom de l'administrateur et mot de passe requis." });
  }

  try {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Check conflicts
    const existingOrg = await prisma.organization.findFirst({
      where: { OR: [{ email }, { slug }] }
    });
    if (existingOrg) {
      return res.status(400).json({ error: "Cette entreprise ou cet e-mail est déjà enregistré." });
    }

    const existingEmp = await prisma.employee.findFirst({
      where: { email }
    });
    if (existingEmp) {
      return res.status(400).json({ error: "Cet e-mail est déjà utilisé pour un compte collaborateur." });
    }

    // Generate random invite code
    const inviteCode = 'invite_' + Math.random().toString(36).substring(2, 9);

    // Create organization
    const newOrg = await prisma.organization.create({
      data: {
        name: companyName.trim(),
        slug,
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : "",
        sector: sector ? sector.trim() : "",
        inviteCode,
        logo: ""
      }
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = AVATAR_PRESETS[0];

    const newEmp = await prisma.employee.create({
      data: {
        id: `emp_admin_${Date.now()}`,
        name: adminName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : "",
        role: 'admin',
        status: 'active',
        latitude: 5.3600,
        longitude: -4.0083,
        workingHoursStart: "08:00",
        workingHoursEnd: "18:00",
        avatar,
        password: hashedPassword,
        organizationId: newOrg.id
      }
    });

    // Create JWT
    const token = jwt.sign(
      { id: newEmp.id, role: newEmp.role, name: newEmp.name, organizationId: newOrg.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: newEmp.id,
        name: newEmp.name,
        email: newEmp.email,
        phone: newEmp.phone,
        role: newEmp.role,
        avatar: newEmp.avatar,
        organizationId: newOrg.id
      },
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        logo: newOrg.logo,
        inviteCode: newOrg.inviteCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Login (Authenticates users inside their tenant) ---
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

    // Fetch tenant organization
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, organizationId: user.organizationId }, 
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
        avatar: user.avatar,
        organizationId: user.organizationId
      },
      organization: org ? {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        inviteCode: org.inviteCode
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REGISTER (public self-registration using inviteCode) ---
app.post('/api/register', async (req, res) => {
  let { name, email, phone, password, avatar, inviteCode } = req.body;
  
  if (!name || !email || !phone || !password || !inviteCode) {
    return res.status(400).json({ error: "Nom, email, téléphone, mot de passe et code d'invitation d'entreprise sont obligatoires." });
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
    // Verify invite code
    const org = await prisma.organization.findUnique({
      where: { inviteCode: inviteCode.trim() }
    });
    if (!org) {
      return res.status(400).json({ error: "Code d'invitation invalide. Veuillez demander le code à l'administrateur de votre entreprise." });
    }

    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existing) {
      return res.status(400).json({ error: "Un compte avec cet email ou ce téléphone existe déjà." });
    }

    const empCount = await prisma.employee.count();
    const hashedPassword = await bcrypt.hash(password, 10);
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
        password: hashedPassword,
        organizationId: org.id
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

// --- Reset Password Simulation ---
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
    req.user = decoded; // { id, role, name, organizationId }
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

// --- TENANT API OPERATIONS ---

// --- Organization settings ---
app.put('/api/organizations/logo', authenticateToken, requireRole('admin'), async (req, res) => {
  const { logo } = req.body;
  if (logo === undefined) return res.status(400).json({ error: "Données du logo manquantes." });

  try {
    const updated = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: { logo }
    });

    res.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logo: updated.logo,
      inviteCode: updated.inviteCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Clients
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { organizationId: req.user.organizationId }
    });
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
        archived: false,
        organizationId: req.user.organizationId
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
    const client = await prisma.client.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });
    if (!client) return res.status(404).json({ error: "Client introuvable." });

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
    const employees = await prisma.employee.findMany({
      where: { organizationId: req.user.organizationId }
    });
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

app.post('/api/employees', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, email, phone, role, avatar } = req.body;
  if (!name || !email || !phone || !role) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  try {
    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existing) {
      return res.status(400).json({ error: "Un employé avec cet email ou téléphone existe déjà." });
    }

    const empCount = await prisma.employee.count();
    const hashedPassword = await bcrypt.hash('password123', 10);
    const chosenAvatar = avatar || AVATAR_PRESETS[empCount % AVATAR_PRESETS.length];
    
    const newEmp = await prisma.employee.create({
      data: {
        id: `emp_${empCount + 1}_${Date.now()}`,
        name,
        email,
        phone,
        role,
        status: "active",
        latitude: 5.3600,
        longitude: -4.0083,
        workingHoursStart: "08:00",
        workingHoursEnd: "18:00",
        avatar: chosenAvatar,
        password: hashedPassword,
        organizationId: req.user.organizationId
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
    const employee = await prisma.employee.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });
    if (!employee) return res.status(404).json({ error: "Employé introuvable dans cette entreprise." });

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
    const employee = await prisma.employee.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });
    if (!employee) return res.status(404).json({ error: "Employé introuvable dans cette entreprise." });

    await prisma.employee.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update own profile
app.put('/api/employees/:id/profile', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Accès refusé." });
  }

  const { name, email, phone, avatar, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.employee.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });
    if (!user) return res.status(404).json({ error: "Employé introuvable." });

    const dataToUpdate = {};

    if (name  && name.trim())  dataToUpdate.name  = name.trim();
    if (email && email.trim()) {
      const conflict = await prisma.employee.findFirst({
        where: { email: email.trim().toLowerCase(), NOT: { id } }
      });
      if (conflict) return res.status(400).json({ error: "Cet email est déjà utilisé par un autre compte." });
      dataToUpdate.email = email.trim().toLowerCase();
    }
    if (phone && phone.trim()) dataToUpdate.phone = phone.trim();
    if (avatar !== undefined)  dataToUpdate.avatar = avatar;

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

// Update tech live GPS
app.put('/api/employees/:id/gps', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Coordonnées lat et lng obligatoires" });
  }

  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Accès refusé." });
  }

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        latitude: lat,
        longitude: lng
      }
    });

    broadcastEvent({
      type: 'EMPLOYEE_GPS_UPDATED',
      employeeId: id,
      organizationId: req.user.organizationId,
      gps: { lat, lng }
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      gps: { lat: updated.latitude, lng: updated.longitude },
      avatar: updated.avatar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Operations
app.get('/api/operations', authenticateToken, async (req, res) => {
  try {
    const operations = await prisma.operation.findMany({
      where: { organizationId: req.user.organizationId }
    });
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
        status: "planifiée",
        organizationId: req.user.organizationId
      }
    });

    broadcastEvent({
      type: 'OPERATION_ASSIGNED',
      organizationId: req.user.organizationId,
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
    const op = await prisma.operation.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });
    if (!op) return res.status(404).json({ error: "Opération introuvable." });

    const updated = await prisma.operation.update({
      where: { id },
      data: { status }
    });

    broadcastEvent({
      type: 'OPERATION_STATUS_CHANGED',
      organizationId: req.user.organizationId,
      operationId: id,
      newStatus: status,
      message: `La mission ${id} est maintenant: ${status}`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Address Reports
app.get('/api/address-reports', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const reports = await prisma.addressReport.findMany({
      where: { organizationId: req.user.organizationId },
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
        message: message.trim(),
        organizationId: req.user.organizationId
      }
    });

    broadcastEvent({
      type: 'ADDRESS_REPORT_CREATED',
      organizationId: req.user.organizationId,
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
    const report = await prisma.addressReport.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });
    if (!report) return res.status(404).json({ error: "Signalement introuvable." });

    await prisma.addressReport.delete({
      where: { id }
    });
    
    broadcastEvent({
      type: 'ADDRESS_REPORT_DELETED',
      organizationId: req.user.organizationId,
      reportId: id
    });

    res.json({ message: "Signalement supprimé." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Serveur API Multi-Tenant à l'écoute sur le port ${PORT}`);
});

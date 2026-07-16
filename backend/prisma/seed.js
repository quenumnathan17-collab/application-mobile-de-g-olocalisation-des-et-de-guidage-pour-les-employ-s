import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const initialEmployees = [
  {
    id: "emp_1",
    name: "Koffi Kouadio",
    email: "koffi.kouadio@yaconsulting.ci",
    phone: "07 08 09 10 11",
    role: "employee",
    status: "active",
    latitude: 5.3245,
    longitude: -4.0205, // Plateau, Abidjan
    workingHoursStart: "07:30",
    workingHoursEnd: "17:30",
    avatar: "/koffi.jpg",
  },
  {
    id: "emp_2",
    name: "Aminata Diallo",
    email: "aminata.diallo@yaconsulting.ci",
    phone: "05 45 67 89 01",
    role: "employee",
    status: "active",
    latitude: 5.3571,
    longitude: -3.9897, // Cocody St-Jean, Abidjan
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "emp_admin",
    name: "Thomas Touré",
    email: "thomas.toure@yaconsulting.ci",
    phone: "01 22 33 44 55",
    role: "admin",
    status: "active",
    latitude: 0.0,
    longitude: 0.0,
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  },
];

const initialClients = [
  {
    id: "client_1",
    name: "Société Ivoirienne de Banque (SIB)",
    type: "entreprise",
    address: "Boulevard de la République, Plateau, Abidjan",
    latitude: 5.3211,
    longitude: -4.018,
    archived: false,
  },
  {
    id: "client_2",
    name: "M. Bakary Bamba",
    type: "particulier",
    address: "Avenue 8, Rue 12, Zone 4, Marcory, Abidjan",
    latitude: 5.305,
    longitude: -3.9785,
    archived: false,
  },
  {
    id: "client_3",
    name: "Clinique Médicale de l'Indénié",
    type: "entreprise",
    address: "Avenue Noguès, Plateau, Abidjan",
    latitude: 5.3405,
    longitude: -4.015,
    archived: false,
  },
  {
    id: "client_4",
    name: "Mme. Marie-Claude Konan",
    type: "particulier",
    address: "Cité CNPS, Angré 22e Arrondissement, Cocody, Abidjan",
    latitude: 5.3955,
    longitude: -3.971,
    archived: false,
  },
  {
    id: "client_5",
    name: "Orange Côte d'Ivoire",
    type: "entreprise",
    address: "Boulevard Valéry Giscard d'Estaing, Marcory, Abidjan",
    latitude: 5.315,
    longitude: -3.992,
    archived: false,
  },
];

const initialOperations = [
  {
    id: "op_1",
    clientId: "client_1",
    description: "Maintenance préventive des serveurs du siège social (SIB)",
    date: "2026-06-18",
    employeeId: "emp_1",
    status: "en cours",
    createdAt: new Date("2026-06-17T10:00:00Z"),
  },
  {
    id: "op_2",
    clientId: "client_2",
    description: "Installation et configuration de la fibre optique à domicile",
    date: "2026-06-18",
    employeeId: "emp_1",
    status: "planifiée",
    createdAt: new Date("2026-06-17T11:30:00Z"),
  },
  {
    id: "op_3",
    clientId: "client_3",
    description:
      "Audit de sécurité réseau et mise à jour du firewall de la clinique",
    date: "2026-06-18",
    employeeId: "emp_2",
    status: "en cours",
    createdAt: new Date("2026-06-17T14:15:00Z"),
  },
  {
    id: "op_4",
    clientId: "client_4",
    description:
      "Dépannage de la liaison sans fil et paramétrage du routeur WiFi",
    date: "2026-06-19",
    employeeId: "emp_2",
    status: "planifiée",
    createdAt: new Date("2026-06-18T08:00:00Z"),
  },
];

async function main() {
  console.log("Peuplement de la base de données SQL...");

  // Nettoyage des tables existantes
  await prisma.operation.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.organization.deleteMany({});

  // 1. Création de l'organisation YA Consulting par défaut
  const org = await prisma.organization.create({
    data: {
      id: "org_ya_consulting",
      name: "YA Consulting",
      slug: "ya-consulting",
      email: "info@yaconsulting.ci",
      phone: "+225 07 08 09 10 11",
      sector: "Sécurité & Réseaux",
      inviteCode: "invite_ya_consulting",
      logo: "",
    },
  });

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Insertion des employés liés à l'organisation
  for (const emp of initialEmployees) {
    await prisma.employee.create({
      data: {
        ...emp,
        password: hashedPassword,
        organizationId: org.id,
      },
    });
  }

  // Insertion des clients liés à l'organisation
  for (const client of initialClients) {
    await prisma.client.create({
      data: {
        ...client,
        organizationId: org.id,
      },
    });
  }

  // Insertion des opérations liées à l'organisation
  for (const op of initialOperations) {
    await prisma.operation.create({
      data: {
        ...op,
        organizationId: org.id,
      },
    });
  }

  console.log("Données de test ivoiriennes insérées avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

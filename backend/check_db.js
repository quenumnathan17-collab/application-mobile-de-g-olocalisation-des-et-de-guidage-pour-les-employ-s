import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const c = await p.client.findMany();
const e = await p.employee.findMany();
const o = await p.operation.findMany();

console.log('=== CLIENTS (' + c.length + ') ===');
c.forEach(x => console.log('  -', x.name, '|', x.address, '| lat:', x.latitude, '| lng:', x.longitude));

console.log('\n=== EMPLOYES (' + e.length + ') ===');
e.forEach(x => console.log('  -', x.id, '|', x.name, '|', x.avatar));

console.log('\n=== OPERATIONS (' + o.length + ') ===');
o.forEach(x => console.log('  -', x.id, '| client:', x.clientId, '| employe:', x.employeeId, '| statut:', x.status, '| date:', x.date, '| desc:', x.description));

await p.$disconnect();

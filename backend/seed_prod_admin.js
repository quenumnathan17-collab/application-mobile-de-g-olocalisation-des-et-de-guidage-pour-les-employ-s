import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://nathan:COpEbIRRAjfsItl3BuimCgmrOdMEbER9@dpg-d91uec6gvqtc73bncd10-a.frankfurt-postgres.render.com/ya_consulting"
    }
  }
});

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const emp = await prisma.employee.upsert({
    where: { email: 'quenumnathan17@gmail.com' },
    update: { 
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    },
    create: {
      id: 'emp_nathan_prod_' + Date.now(),
      name: 'Nathan Quenum',
      email: 'quenumnathan17@gmail.com',
      phone: '+225 0102030405',
      role: 'admin',
      latitude: 5.3600,
      longitude: -4.0083,
      status: 'active',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nathan',
      password: hashedPassword
    }
  });
  
  console.log('Production Admin account inserted successfully:', emp.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

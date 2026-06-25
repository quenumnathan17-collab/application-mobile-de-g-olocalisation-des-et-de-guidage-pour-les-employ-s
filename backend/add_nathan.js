import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const emp = await prisma.employee.upsert({
    where: { email: 'quenumnathan17@gmail.com' },
    update: { 
      password: hashedPassword,
      role: 'admin'
    },
    create: {
      id: 'emp_' + Date.now(),
      name: 'Nathan Quenum',
      email: 'quenumnathan17@gmail.com',
      phone: '+225 0000000000',
      role: 'admin',
      latitude: 5.3600,
      longitude: -4.0083,
      status: 'actif',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nathan',
      password: hashedPassword
    }
  });
  
  console.log('User ready:', emp.email, 'Role:', emp.role);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();
  console.log(`Updating passwords for ${employees.length} employees...`);
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  for (const emp of employees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { password: hashedPassword }
    });
  }
  
  console.log('All passwords have been set to "password123".');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

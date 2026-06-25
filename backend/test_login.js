import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.employee.findUnique({
    where: { email: 'koffi.kouadio@yaconsulting.ci' }
  });
  console.log('User found:', user ? user.email : 'No user');
  if (user) {
    const isMatch = await bcrypt.compare('password123', user.password);
    console.log('Password match:', isMatch);
  }
}

test().finally(() => prisma.$disconnect());

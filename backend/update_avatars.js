import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update Diarrasouba yassoungo with a unique male professional avatar
  const diarrasouba = await prisma.employee.updateMany({
    where: { name: 'Diarrasouba yassoungo' },
    data: {
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    }
  });
  console.log('Diarrasouba updated:', diarrasouba);

  // Update ange nathan with a unique male professional avatar
  const angeNathan = await prisma.employee.updateMany({
    where: { name: 'ange nathan' },
    data: {
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    }
  });
  console.log('Ange Nathan updated:', angeNathan);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

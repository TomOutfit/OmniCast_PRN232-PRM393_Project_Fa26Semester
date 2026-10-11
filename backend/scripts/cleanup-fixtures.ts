import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const deletedEvents = await prisma.liveEvent.deleteMany({
      where: {
        OR: [
          { title: { contains: '[TEST]' } },
          { title: { contains: 'Test' } },
          { title: { contains: 'Trực tiếp Studio -' } },
        ],
      },
    });
    console.log(`🧹 Deleted test LiveEvents: ${deletedEvents.count}`);

    const endedEvents = await prisma.liveEvent.updateMany({
      where: { status: 'LIVE' },
      data: { status: 'ENDED' },
    });
    console.log(`⏹️ Ended remaining LIVE events: ${endedEvents.count}`);

    const deletedRecordings = await prisma.recording.deleteMany({
      where: {
        OR: [
          { title: { contains: '[TEST]' } },
          { title: { contains: 'Test' } },
        ],
      },
    });
    console.log(`🧹 Deleted test Recordings: ${deletedRecordings.count}`);

    const remainingLive = await prisma.liveEvent.count({ where: { status: 'LIVE' } });
    console.log(`✅ Current LIVE events count: ${remainingLive}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);

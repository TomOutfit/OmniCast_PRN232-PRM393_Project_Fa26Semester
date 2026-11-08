require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.liveMediaEndpointConfig.findMany();
  console.log('LIVE MEDIA CONFIGS IN DB:', JSON.stringify(configs, null, 2));
}

main().finally(() => prisma.$disconnect());


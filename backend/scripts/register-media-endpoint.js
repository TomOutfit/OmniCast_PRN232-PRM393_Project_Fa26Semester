require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const endpoint = {
  publicHost: process.env.OMNICAST_MEDIA_PUBLIC_HOST,
  hlsUrl: process.env.OMNICAST_MEDIA_HLS_URL,
  whipUrl: process.env.OMNICAST_MEDIA_WHIP_URL,
  webrtcUrl: process.env.OMNICAST_MEDIA_WEBRTC_URL,
};

if (Object.values(endpoint).some((value) => !value)) {
  throw new Error('Public media endpoint environment is incomplete.');
}

prisma.liveMediaEndpointConfig
  .upsert({
    where: { id: 'primary' },
    create: { id: 'primary', ...endpoint },
    update: endpoint,
  })
  .then(() => {
    process.stdout.write(`Registered MediaMTX endpoint for ${endpoint.publicHost}\n`);
  })
  .catch((error) => {
    process.stderr.write(`Could not register MediaMTX endpoint: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

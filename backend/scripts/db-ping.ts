import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
p.$queryRawUnsafe(`SELECT current_database() as db, version() as pg_version`)
  .then((r: any) => {
    console.log(JSON.stringify(r, null, 2));
    return p.$disconnect();
  })
  .catch((e: any) => {
    console.error('DB ERROR:', e.message?.slice(0, 200) ?? e);
    return p.$disconnect().then(() => process.exit(1));
  });

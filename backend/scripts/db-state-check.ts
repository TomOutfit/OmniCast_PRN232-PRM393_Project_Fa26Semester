import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
async function main() {
  const enums = await p.$queryRawUnsafe<Array<{ typname: string }>>(
    `SELECT typname FROM pg_type
     WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
       AND typtype = 'e'
     ORDER BY typname;`,
  );
  console.log('Existing enums in public schema:');
  for (const e of enums) console.log('  · ' + e.typname);

  const cols = await p.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Recording'
       AND column_name IN ('sourceType','license','sourceAttribution','fallbackUrl','thumbnailAttribution','isActive','lastCheckedAt','lastStatus')
     ORDER BY column_name;`,
  );
  console.log('\nExisting v2.1 columns in Recording:');
  if (cols.length === 0) console.log('  · (none)');
  for (const c of cols) console.log(`  · ${c.column_name} (${c.data_type})`);
}
main()
  .catch((e: any) => {
    console.error('ERR:', e.message?.slice(0, 300) ?? e);
    return p.$disconnect().then(() => process.exit(1));
  })
  .finally(() => p.$disconnect());

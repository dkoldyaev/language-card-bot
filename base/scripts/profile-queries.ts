import 'dotenv/config';
import { Pool } from 'pg';

const dbUrl = process.env.PROFILE_DATABASE_URL || 'postgresql://testuser:testpass@localhost:5434/english_card_bot_test?schema=public';

const pool = new Pool({
  connectionString: dbUrl,
});

async function runExplain(client: any, queryName: string, sql: string, params: any[] = []) {
  console.log(`\n================================================================================`);
  console.log(`PROFILING QUERY: ${queryName}`);
  console.log(`SQL: ${sql}`);
  console.log(`Params: ${JSON.stringify(params)}`);
  console.log(`--------------------------------------------------------------------------------`);
  try {
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, COSTS, VERBOSE, FORMAT TEXT) ${sql}`;
    const res = await client.query(explainSql, params);
    const plan = res.rows.map((r: any) => r['QUERY PLAN']).join('\n');
    console.log(plan);
    return plan;
  } catch (err: any) {
    console.error(`Failed to explain query: ${err.message}`);
    return null;
  }
}

async function checkCatalog(client: any) {
  console.log(`\n================================================================================`);
  console.log(`DATABASE CATALOG: TABLE SIZES & SCAN STATS`);
  console.log(`================================================================================`);

  const statsRes = await client.query(`
    SELECT
      relname AS table_name,
      seq_scan,
      seq_tup_read,
      idx_scan,
      idx_tup_fetch,
      n_live_tup
    FROM pg_stat_user_tables
    ORDER BY seq_tup_read DESC;
  `);
  console.table(statsRes.rows);

  console.log(`\n================================================================================`);
  console.log(`DATABASE CATALOG: INDEXES PER TABLE`);
  console.log(`================================================================================`);

  const indexRes = await client.query(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  console.table(indexRes.rows);

  console.log(`\n================================================================================`);
  console.log(`MISSING FOREIGN KEY INDEXES (Foreign keys without a supporting index)`);
  console.log(`================================================================================`);

  const missingFkRes = await client.query(`
    SELECT
      conrelid::regclass AS table_name,
      conname AS fk_name,
      pg_get_constraintdef(c.oid) AS constraint_def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE contype = 'f'
      AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (c.conkey::int2[] <@ i.indkey::int2[])
      );
  `);
  if (missingFkRes.rows.length === 0) {
    console.log('No unindexed foreign keys found.');
  } else {
    console.table(missingFkRes.rows);
  }
}

async function profileRepresentativeQueries(client: any) {
  // Let's find sample IDs from DB
  const userRow = (await client.query(`SELECT id FROM "User" LIMIT 1`)).rows[0];
  const userId = userRow?.id ?? 1;

  const dictRow = (await client.query(`SELECT id FROM "Dictionary" LIMIT 1`)).rows[0];
  const dictId = dictRow?.id ?? 1;

  const wordRow = (await client.query(`SELECT id FROM "Word" LIMIT 1`)).rows[0];
  const wordId = wordRow?.id ?? 1;

  const defRow = (await client.query(`SELECT id FROM "Definition" LIMIT 1`)).rows[0];
  const defId = defRow?.id ?? 1;

  // 1. Dictionary View - Words query
  await runExplain(
    client,
    '1. Dictionary View: Fetch words for dictionary (ordered by id)',
    `SELECT "id", "text", "dictionaryId", "createdAt" FROM "Word" WHERE "dictionaryId" = $1 ORDER BY "id" ASC`,
    [dictId]
  );

  // 2. Dictionary View - Nested Definitions query (batch in)
  await runExplain(
    client,
    '2. Dictionary View: Batch fetch definitions by wordId IN (...)',
    `SELECT "id", "text", "wordId", "createdAt" FROM "Definition" WHERE "wordId" = ANY($1::int[]) ORDER BY "id" ASC`,
    [[wordId, wordId + 1, wordId + 2]]
  );

  // 3. Dictionary View - Nested Translations
  await runExplain(
    client,
    '3. Dictionary View: Batch fetch translations by definitionId IN (...)',
    `SELECT "id", "text", "definitionId", "createdAt" FROM "DefinitionTranslation" WHERE "definitionId" = ANY($1::int[])`,
    [[defId, defId + 1, defId + 2]]
  );

  // 4. Dictionary View - Preset relations for words
  await runExplain(
    client,
    '4. Dictionary View: Join _PresetToWord m2m relation',
    `SELECT "p"."id", "p"."title", "ptw"."B" AS "wordId"
     FROM "Preset" "p"
     INNER JOIN "_PresetToWord" "ptw" ON "ptw"."A" = "p"."id"
     WHERE "ptw"."B" = ANY($1::int[])`,
    [[wordId, wordId + 1, wordId + 2]]
  );

  // 5. Quiz Card Generation: find words with definitions using EXISTS subquery
  await runExplain(
    client,
    '5. Quiz: Generate quiz card candidate words (EXISTS definition)',
    `SELECT "Word"."id" FROM "Word"
     INNER JOIN "Dictionary" ON "Word"."dictionaryId" = "Dictionary"."id"
     WHERE "Word"."dictionaryId" = $1
       AND "Dictionary"."userId" = $2
       AND EXISTS (SELECT 1 FROM "Definition" WHERE "Definition"."wordId" = "Word"."id")`,
    [dictId, userId]
  );

  // 6. Quiz: Fetch all variants (pool of wrong words)
  await runExplain(
    client,
    '6. Quiz: Fetch all other words in dictionary for variants',
    `SELECT "Word"."text" FROM "Word"
     INNER JOIN "Dictionary" ON "Word"."dictionaryId" = "Dictionary"."id"
     WHERE "Word"."dictionaryId" = $1
       AND "Dictionary"."userId" = $2
       AND "Word"."id" != $3`,
    [dictId, userId, wordId]
  );

  // 7. Presets: Filter presets by language ordered by createdAt DESC
  await runExplain(
    client,
    '7. Presets: List presets by language ordered by createdAt DESC',
    `SELECT "id", "title", "description", "for_language", "type", "createdAt"
     FROM "Preset"
     WHERE "for_language" = $1
     ORDER BY "createdAt" DESC`,
    ['ru']
  );

  // 8. User State Sync: Load state
  await runExplain(
    client,
    '8. User State: Load user state with user unique lookup',
    `SELECT * FROM "UserState" WHERE "userId" = $1`,
    [userId]
  );

  // 9. Dictionaries: Count words per dictionary (getUserDictionaries)
  await runExplain(
    client,
    '9. Dictionaries: Count words grouped by dictionary',
    `SELECT "dictionaryId", COUNT(*) FROM "Word" WHERE "dictionaryId" = $1 GROUP BY "dictionaryId"`,
    [dictId]
  );

  // 10. Check Word Duplicate on Add Word
  await runExplain(
    client,
    '10. Add Word: Check existing word by (dictionaryId, text)',
    `SELECT "id", "text", "dictionaryId" FROM "Word" WHERE "dictionaryId" = $1 AND "text" = $2 LIMIT 1`,
    [dictId, 'apple']
  );
}

async function main() {
  console.log(`Connecting to Postgres at ${dbUrl.replace(/:[^:@]+@/, ':***@')}...`);
  const client = await pool.connect();
  try {
    await checkCatalog(client);
    await profileRepresentativeQueries(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Profiling error:', err);
  process.exit(1);
});

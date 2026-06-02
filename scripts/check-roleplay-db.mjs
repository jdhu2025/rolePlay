import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}
const sql = postgres(url, { ssl: 'require', max: 1 })

const tables = await sql`select table_name from information_schema.tables where table_schema='public' and table_name like 'roleplay%' order by 1`
console.log('roleplay tables:', tables.map((t) => t.table_name))

const journal = await sql`select id, hash, created_at from drizzle.__drizzle_migrations order by id`
console.log('drizzle migrations applied:')
for (const r of journal) {
  console.log(' ', r.id, String(r.hash).slice(0, 12), new Date(Number(r.created_at)).toISOString())
}

try {
  const tagRows = await sql`select slug, label_en from roleplay_tag order by sort_order`
  console.log('tag count:', tagRows.length)
  for (const t of tagRows) console.log(' ', t.slug, '-', t.label_en)
} catch (e) {
  console.log('tag query err:', e.message)
}

try {
  const cols = await sql`select column_name from information_schema.columns where table_schema='public' and table_name='roleplay_character' order by 1`
  console.log('roleplay_character columns:', cols.map((c) => c.column_name).join(','))
} catch (e) {
  console.log('cols query err:', e.message)
}

try {
  const cols = await sql`select column_name from information_schema.columns where table_schema='public' and table_name='roleplay_character_comment' order by 1`
  console.log('roleplay_character_comment columns:', cols.map((c) => c.column_name).join(','))
} catch (e) {
  console.log('comment cols err:', e.message)
}

await sql.end()

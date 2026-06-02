/**
 * Cleanup: removes the two review fixtures created by seed-review-fixture.mjs.
 * Cascade deletes pull along any junction rows (tags / comments).
 */
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}
const sql = postgres(url, { ssl: 'require', max: 1 })

const ids = ['rp-fixture-approve', 'rp-fixture-reject']
const before = await sql`select id, name, status from roleplay_character where id in ${sql(ids)}`
console.log('before delete:', before)
await sql`delete from roleplay_character where id in ${sql(ids)}`
const after = await sql`select id, name from roleplay_character where id in ${sql(ids)}`
console.log('after delete (should be empty):', after)
await sql.end()

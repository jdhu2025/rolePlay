import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}
const sql = postgres(url, { ssl: 'require', max: 1 })

const adminRoles = await sql`
  select id, name from "role" where lower(name) like '%admin%' or lower(name) like '%super%'
`
console.log('admin-ish roles:')
for (const r of adminRoles) console.log(' ', r.id, '-', r.name)

const adminUsers = await sql`
  select u.id, u.email, r.name as role_name
  from "user_role" ur
  join "user" u on u.id = ur.user_id
  join "role" r on r.id = ur.role_id
  where lower(r.name) like '%admin%'
`
console.log('admin users:', adminUsers.length)
for (const u of adminUsers) console.log(' ', u.email, '-', u.role_name)

const queue = await sql`
  select id, name, status, user_id, updated_at
  from roleplay_character
  where status = 'under_review'
  order by updated_at desc
  limit 10
`
console.log('under_review characters:', queue.length)
for (const c of queue) console.log(' ', c.id, '-', c.name, '-', c.user_id)

await sql.end()

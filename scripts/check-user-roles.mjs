import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}
const sql = postgres(url, { ssl: 'require', max: 1 })

const targetUserId = process.argv[2] || '844b8c27-a750-4569-9085-4453600707dc'

const userInfo = await sql`select id, email, name from "user" where id = ${targetUserId}`
console.log('user:', userInfo)

const roles = await sql`
  select r.id, r.name
  from "user_role" ur
  join "role" r on r.id = ur.role_id
  where ur.user_id = ${targetUserId}
`
console.log('roles:', roles)

await sql.end()

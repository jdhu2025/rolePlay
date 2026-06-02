/**
 * Seeds two roleplay characters in `under_review` for the admin review
 * end-to-end smoke test.
 *
 * Owner is the existing `smoke-test-1779193001@example.com` user (the one
 * currently signed into bb-browser). After approving / rejecting we either
 * delete the rows or leave them in their final state for the post-test DB
 * snapshot.
 *
 * Run:
 *   DATABASE_URL=... node scripts/seed-review-fixture.mjs
 */
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}

const sql = postgres(url, { ssl: 'require', max: 1 })

const ownerId = process.argv[2] || '844b8c27-a750-4569-9085-4453600707dc'

const owner = await sql`select id, email from "user" where id = ${ownerId}`
if (owner.length === 0) {
  console.error('owner user not found:', ownerId)
  process.exit(1)
}
console.log('owner:', owner[0].email)

const fixtures = [
  {
    id: 'rp-fixture-approve',
    name: 'TestApprove',
    intro: 'Friendly barista, lifelong coffee nerd. She knows every espresso machine in town.',
    opening: '*smiles warmly* Hey there, what can I get started for you today?',
    settings: 'She is a 22-year-old barista in a Brooklyn coffee shop who loves indie rock and rainy mornings.',
    tagline: 'Your friendly neighborhood barista',
    rejectionReason: '',
  },
  {
    id: 'rp-fixture-reject',
    name: 'TestReject',
    intro: 'A character with a deliberately weak opening line so the moderator can practise rejecting.',
    opening: 'hi',
    settings: 'Generic placeholder character used for the reject path of the moderation smoke test.',
    tagline: 'Reject me please',
    rejectionReason: '',
  },
]

await sql`delete from roleplay_character where id in ${sql(fixtures.map((f) => f.id))}`

for (const f of fixtures) {
  await sql`
    insert into roleplay_character (
      id, user_id, status, visibility, name, age, gender, author_name,
      tagline, intro, opening, avatar_url, cover_url, gallery, tags,
      personality, settings, skills, model, metadata, rejection_reason,
      chat_count, like_count
    ) values (
      ${f.id}, ${ownerId}, 'under_review', 'public', ${f.name}, 22, 'female',
      ${owner[0].email}, ${f.tagline}, ${f.intro}, ${f.opening},
      'chloe-1.jpeg', '', '[]', '[]', '[]', ${f.settings}, '[]',
      '', '{"source":"review-fixture"}', ${f.rejectionReason}, 0, 0
    )
  `
  console.log('seeded:', f.id, f.name)
}

const queue = await sql`
  select id, name, status, user_id, rejection_reason
  from roleplay_character
  where id in ${sql(fixtures.map((f) => f.id))}
  order by id
`
for (const r of queue) console.log(' ', r.id, '-', r.name, '-', r.status)

await sql.end()

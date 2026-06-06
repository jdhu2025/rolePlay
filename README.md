# RolePlay

## Getting Started

RolePlay is an AI roleplay companion app built on a Next.js SaaS foundation.

## Development

```bash
pnpm install
pnpm dev
```

## Vercel Deployment

Import this repository in Vercel and use the project root as the Root
Directory. The repository already includes `vercel.json`.

- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Framework Preset: `Next.js`

Set the required production environment variables in Vercel before deploying:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `DATABASE_PROVIDER`
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- one text-generation provider, for example `LLM_API_KEY`,
  `LLM_BASE_URL`, and `LLM_MODEL`

For uploads and generated roleplay media, also configure Cloudflare R2
variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`,
`R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_DOMAIN`) or the S3 fallback variables.

## Agent Context

Internal requirements, plans, research notes, and implementation logs live in
[`agent-context/`](./agent-context/README.md).

## Feedback

Submit feedback on [GitHub Issues](https://github.com/jdhu2025/rolePlay/issues).

## LICENSE

!!! Please do not publicly release ShipAny's Code. Illegal use will be prosecuted

[ShipAny LICENSE](./LICENSE)

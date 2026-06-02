#!/usr/bin/env tsx
import { getAllConfigs } from '@/shared/models/config';
import {
  grantCreditsForNewUser,
  hasInitialCreditsGrant,
  resolveStarterCreditsConfig,
} from '@/shared/models/credit';
import { getUsers } from '@/shared/models/user';

type Options = {
  apply: boolean;
  email?: string;
  maxUsers: number;
  pageSize: number;
  sinceDays: number;
};

function parseArgs(): Options {
  const options: Options = {
    apply: false,
    maxUsers: 500,
    pageSize: 100,
    sinceDays: 14,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg.startsWith('--email=')) {
      options.email = arg.slice('--email='.length).trim();
    } else if (arg.startsWith('--max-users=')) {
      options.maxUsers = parseInt(arg.slice('--max-users='.length), 10) || 0;
    } else if (arg.startsWith('--page-size=')) {
      options.pageSize = parseInt(arg.slice('--page-size='.length), 10) || 0;
    } else if (arg.startsWith('--since-days=')) {
      options.sinceDays = parseInt(arg.slice('--since-days='.length), 10) || 0;
    }
  }

  options.maxUsers = Math.max(1, options.maxUsers);
  options.pageSize = Math.min(Math.max(1, options.pageSize), 500);
  options.sinceDays = Math.max(0, options.sinceDays);

  return options;
}

async function main() {
  const options = parseArgs();
  const starterCredits = resolveStarterCreditsConfig(await getAllConfigs());
  const sinceAt = options.sinceDays
    ? new Date(Date.now() - options.sinceDays * 24 * 60 * 60 * 1000)
    : null;

  console.info('roleplay starter credits backfill started', {
    mode: options.apply ? 'apply' : 'dry-run',
    email: options.email || null,
    maxUsers: options.maxUsers,
    pageSize: options.pageSize,
    sinceDays: options.sinceDays,
    starterCredits,
  });

  if (!starterCredits.enabled || starterCredits.amount <= 0) {
    console.info('starter credits are disabled or non-positive; exiting');
    return;
  }

  let page = 1;
  let scanned = 0;
  let eligible = 0;
  let missing = 0;
  let granted = 0;
  let skippedExisting = 0;

  while (scanned < options.maxUsers) {
    const users = await getUsers({
      page,
      limit: options.pageSize,
      email: options.email,
    });
    if (!users.length) break;

    for (const user of users) {
      if (scanned >= options.maxUsers) break;
      scanned += 1;

      if (sinceAt && user.createdAt < sinceAt) {
        continue;
      }

      eligible += 1;
      const hasGrant = await hasInitialCreditsGrant({
        userId: user.id,
        description: starterCredits.description,
      });

      if (hasGrant) {
        skippedExisting += 1;
        continue;
      }

      missing += 1;
      console.info('starter credits missing', {
        userId: user.id,
        email: user.email,
        createdAt: user.createdAt,
      });

      if (!options.apply) continue;

      const grant = await grantCreditsForNewUser(user);
      if (grant) granted += 1;
    }

    if (options.email) break;
    page += 1;
  }

  console.info('roleplay starter credits backfill finished', {
    mode: options.apply ? 'apply' : 'dry-run',
    scanned,
    eligible,
    missing,
    granted,
    skippedExisting,
  });
}

main().catch((error) => {
  console.error('roleplay starter credits backfill failed', error);
  process.exit(1);
});

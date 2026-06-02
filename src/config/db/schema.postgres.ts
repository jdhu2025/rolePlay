import {
  boolean,
  index,
  integer,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { envConfigs } from '@/config';

const schemaName = (envConfigs.db_schema || 'public').trim();
// Drizzle forbids pgSchema('public'); for public schema use pgTable().
// For non-public schema (e.g. 'web'), use pgSchema(name).table() to generate "schema"."table".
const customSchema =
  schemaName && schemaName !== 'public' ? pgSchema(schemaName) : null;
const table: typeof pgTable = customSchema
  ? (customSchema.table.bind(customSchema) as unknown as typeof pgTable)
  : pgTable;

export const user = table(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Track first-touch acquisition channel (e.g. google, twitter, newsletter)
    utmSource: text('utm_source').notNull().default(''),
    ip: text('ip').notNull().default(''),
    locale: text('locale').notNull().default(''),
    /**
     * Private roleplay user persona preferences (P1-1):
     * preferredName, defaultRelationship, tonePreference. Stored as JSON
     * text so future preferences can be added without more sparse columns.
     */
    persona: text('persona').notNull().default('{}'),
  },
  (table) => [
    // Search users by name in admin dashboard
    index('idx_user_name').on(table.name),
    // Order users by registration time for latest users list
    index('idx_user_created_at').on(table.createdAt),
  ]
);

export const session = table(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = table(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index('idx_account_user_id').on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = table(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index('idx_verification_identifier').on(table.identifier),
  ]
);

export const config = table('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

export const taxonomy = table(
  'taxonomy',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    image: text('image'),
    icon: text('icon'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query taxonomies by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_taxonomy_type_status').on(table.type, table.status),
  ]
);

export const post = table(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title'),
    description: text('description'),
    image: text('image'),
    content: text('content'),
    categories: text('categories'),
    tags: text('tags'),
    authorName: text('author_name'),
    authorImage: text('author_image'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query posts by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_post_type_status').on(table.type, table.status),
  ]
);

export const order = table(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // checkout user email
    status: text('status').notNull(), // created, paid, failed
    amount: integer('amount').notNull(), // checkout amount in cents
    currency: text('currency').notNull(), // checkout currency
    productId: text('product_id'),
    paymentType: text('payment_type'), // one_time, subscription
    paymentInterval: text('payment_interval'), // day, week, month, year
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: text('checkout_info').notNull(), // checkout request info
    checkoutResult: text('checkout_result'), // checkout result
    paymentResult: text('payment_result'), // payment result
    discountCode: text('discount_code'), // discount code
    discountAmount: integer('discount_amount'), // discount amount in cents
    discountCurrency: text('discount_currency'), // discount currency
    paymentEmail: text('payment_email'), // actual payment email
    paymentAmount: integer('payment_amount'), // actual payment amount
    paymentCurrency: text('payment_currency'), // actual payment currency
    paidAt: timestamp('paid_at'), // paid at
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    description: text('description'), // order description
    productName: text('product_name'), // product name
    subscriptionId: text('subscription_id'), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    checkoutUrl: text('checkout_url'), // checkout url
    callbackUrl: text('callback_url'), // callback url, after handle callback
    creditsAmount: integer('credits_amount'), // credits amount
    creditsValidDays: integer('credits_valid_days'), // credits validity days
    planName: text('plan_name'), // subscription plan name
    paymentProductId: text('payment_product_id'), // payment product id
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'), // order subscription no
    transactionId: text('transaction_id'), // payment transaction id
    paymentUserName: text('payment_user_name'), // payment user name
    paymentUserId: text('payment_user_id'), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_order_user_status_payment_type').on(
      table.userId,
      table.status,
      table.paymentType
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    index('idx_order_transaction_provider').on(
      table.transactionId,
      table.paymentProvider
    ),
    // Order orders by creation time for listing
    index('idx_order_created_at').on(table.createdAt),
  ]
);

export const subscription = table(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(), // subscription no
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // subscription user email
    status: text('status').notNull(), // subscription status
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    productId: text('product_id'), // product id
    description: text('description'), // subscription description
    amount: integer('amount'), // subscription amount
    currency: text('currency'), // subscription currency
    interval: text('interval'), // subscription interval, day, week, month, year
    intervalCount: integer('interval_count'), // subscription interval count
    trialPeriodDays: integer('trial_period_days'), // subscription trial period days
    currentPeriodStart: timestamp('current_period_start'), // subscription current period start
    currentPeriodEnd: timestamp('current_period_end'), // subscription current period end
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    planName: text('plan_name'),
    billingUrl: text('billing_url'),
    productName: text('product_name'), // subscription product name
    creditsAmount: integer('credits_amount'), // subscription credits amount
    creditsValidDays: integer('credits_valid_days'), // subscription credits valid days
    paymentProductId: text('payment_product_id'), // subscription payment product id
    paymentUserId: text('payment_user_id'), // subscription payment user id
    canceledAt: timestamp('canceled_at'), // subscription canceled apply at
    canceledEndAt: timestamp('canceled_end_at'), // subscription canceled end at
    canceledReason: text('canceled_reason'), // subscription canceled reason
    canceledReasonType: text('canceled_reason_type'), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_subscription_user_status_interval').on(
      table.userId,
      table.status,
      table.interval
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index('idx_subscription_provider_id').on(
      table.subscriptionId,
      table.paymentProvider
    ),
    // Order subscriptions by creation time for listing
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = table(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }), // user id
    userEmail: text('user_email'), // user email
    orderNo: text('order_no'), // payment order no
    subscriptionNo: text('subscription_no'), // subscription no
    transactionNo: text('transaction_no').unique().notNull(), // transaction no
    transactionType: text('transaction_type').notNull(), // transaction type, grant / consume
    transactionScene: text('transaction_scene'), // transaction scene, payment / subscription / gift / award
    credits: integer('credits').notNull(), // credits amount, n or -n
    remainingCredits: integer('remaining_credits').notNull().default(0), // remaining credits amount
    description: text('description'), // transaction description
    expiresAt: timestamp('expires_at'), // transaction expires at
    status: text('status').notNull(), // transaction status
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    consumedDetail: text('consumed_detail'), // consumed detail
    metadata: text('metadata'), // transaction metadata
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    // Query credits by order number
    index('idx_credit_order_no').on(table.orderNo),
    // Query credits by subscription number
    index('idx_credit_subscription_no').on(table.subscriptionNo),
  ]
);

export const apikey = table(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_apikey_user_status').on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index('idx_apikey_key_status').on(table.key, table.status),
  ]
);

// RBAC Tables
export const role = table(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // admin, editor, viewer
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index('idx_role_status').on(table.status),
  ]
);

export const permission = table(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // admin.users.read, admin.posts.write
    resource: text('resource').notNull(), // users, posts, categories
    action: text('action').notNull(), // read, write, delete
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = table(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index('idx_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const userRole = table(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const aiTask = table(
  'ai_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mediaType: text('media_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    options: text('options'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    taskId: text('task_id'), // provider task id
    taskInfo: text('task_info'), // provider task info
    taskResult: text('task_result'), // provider task result
    costCredits: integer('cost_credits').notNull().default(0),
    scene: text('scene').notNull().default(''),
    creditId: text('credit_id'), // credit consumption record id
  },
  (table) => [
    // Composite: Query user's AI tasks by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_ai_task_user_media_type').on(table.userId, table.mediaType),
    // Composite: Query user's AI tasks by media type and provider
    // Can also be used for: WHERE mediaType = ? AND provider = ? (left-prefix)
    index('idx_ai_task_media_type_status').on(table.mediaType, table.status),
  ]
);

export const chat = table(
  'chat',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    title: text('title').notNull().default(''),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    content: text('content'),
  },
  (table) => [index('idx_chat_user_status').on(table.userId, table.status)]
);

export const chatMessage = table(
  'chat_message',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    role: text('role').notNull(),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
  },
  (table) => [
    index('idx_chat_message_chat_id').on(table.chatId, table.status),
    index('idx_chat_message_user_id').on(table.userId, table.status),
  ]
);

export const roleplayCharacter = table(
  'roleplay_character',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // v2 status: draft / under_review / published / rejected / deleted
    // (legacy 'created' rows are migrated to 'published' in 0004)
    status: text('status').notNull().default('draft'),
    visibility: text('visibility').notNull().default('private'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    name: text('name').notNull(),
    age: integer('age').notNull().default(25),
    gender: text('gender').notNull().default('non-binary'),
    authorName: text('author_name').notNull().default('you'),
    tagline: text('tagline').notNull().default(''),
    intro: text('intro').notNull().default(''),
    opening: text('opening').notNull().default(''),
    avatarUrl: text('avatar_url').notNull().default(''),
    coverUrl: text('cover_url').notNull().default(''),
    gallery: text('gallery').notNull().default('[]'),
    tags: text('tags').notNull().default('[]'),
    skills: text('skills').notNull().default('[]'),
    style: text('style').notNull().default(''),
    relationship: text('relationship').notNull().default(''),
    scene: text('scene').notNull().default(''),
    personality: text('personality').notNull().default('[]'),
    voice: text('voice').notNull().default(''),
    settings: text('settings').notNull().default(''),
    /**
     * Structured personality card (JSON-encoded). Powers the P0 wave of
     * character-writing improvements: 6-block identity template, negative
     * anchors, catchphrases, metaphor domain. Empty `{}` falls back to the
     * legacy single-blob `settings` path so legacy rows keep working.
     * See `roleplay-character-personality-plan.md`.
     */
    personalityCard: text('personality_card').notNull().default('{}'),
    visualIdentity: text('visual_identity').notNull().default('{}'),
    /**
     * Fixed prompt suffix appended to every portrait/scene render so a
     * character's visual style stays consistent across regenerations.
     * Produced by the AI Writer alongside the personality card. Empty
     * string keeps legacy characters compatible (no suffix appended).
     * See `roleplay-character-personality-plan.md` (P2-2).
     */
    imageStyleSuffix: text('image_style_suffix').notNull().default(''),
    /**
     * P2-3: AI-Writer-recommended TTS voice preset id (whitelisted in
     * `roleplay-personality.ts`). The TTS route maps the preset to the
     * upstream `voice_type` at render time. Empty string falls back to
     * the gender-based default — keeps legacy characters working.
     * See `roleplay-character-personality-plan.md` (P2-3).
     */
    voicePreset: text('voice_preset').notNull().default(''),
    /**
     * P1-2: few-shot user/character pairs that demonstrate the character's
     * reply style. JSON-encoded array of { user, character } examples.
     */
    styleExamples: text('style_examples').notNull().default('[]'),
    /**
     * P2-4: reply formatting preferences. JSON-encoded object with emoji
     * frequency, italic action beat length, and English code-switching level.
     */
    formatStyle: text('format_style')
      .notNull()
      .default(
        '{"emojiFrequency":"rare","actionBeatLength":"balanced","englishMix":"none"}'
      ),
    model: text('model').notNull().default(''),
    chatCount: integer('chat_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    rejectionReason: text('rejection_reason').notNull().default(''),
    metadata: text('metadata'),
  },
  (table) => [
    index('idx_roleplay_character_user_status').on(table.userId, table.status),
    index('idx_roleplay_character_visibility_status').on(
      table.visibility,
      table.status
    ),
    index('idx_roleplay_character_status_visibility').on(
      table.status,
      table.visibility
    ),
  ]
);

export const roleplayTag = table(
  'roleplay_tag',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    labelEn: text('label_en').notNull(),
    labelZh: text('label_zh').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('created'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_roleplay_tag_slug').on(table.slug),
    index('idx_roleplay_tag_sort').on(table.sortOrder),
  ]
);

export const roleplayCharacterTag = table(
  'roleplay_character_tag',
  {
    characterId: text('character_id')
      .notNull()
      .references(() => roleplayCharacter.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => roleplayTag.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.characterId, table.tagId] }),
    index('idx_roleplay_character_tag_tag').on(table.tagId),
  ]
);

export const roleplayConversation = table(
  'roleplay_conversation',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    characterId: text('character_id').references(() => roleplayCharacter.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('created'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    title: text('title').notNull().default(''),
    provider: text('provider').notNull().default('openrouter'),
    model: text('model').notNull().default(''),
    characterSnapshot: text('character_snapshot').notNull().default('{}'),
    memorySummary: text('memory_summary').notNull().default(''),
    /**
     * P2-1 relationship state vector. JSON text:
     * { intimacy, trust, currentMood, lastTopic, insideJokes, turnCount }.
     * Kept as text for cross-dialect compatibility with the rest of the
     * roleplay schema.
     */
    state: text('state').notNull().default('{}'),
    metadata: text('metadata'),
  },
  (table) => [
    index('idx_roleplay_conversation_user_status').on(
      table.userId,
      table.status
    ),
    index('idx_roleplay_conversation_character').on(table.characterId),
  ]
);

export const roleplayMessage = table(
  'roleplay_message',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => roleplayConversation.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('created'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    role: text('role').notNull(),
    text: text('text').notNull().default(''),
    media: text('media'),
    provider: text('provider').notNull().default(''),
    model: text('model').notNull().default(''),
    metadata: text('metadata'),
  },
  (table) => [
    index('idx_roleplay_message_conversation_status').on(
      table.conversationId,
      table.status
    ),
    index('idx_roleplay_message_user_status').on(table.userId, table.status),
  ]
);

export const roleplayMemory = table(
  'roleplay_memory',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    characterId: text('character_id').references(() => roleplayCharacter.id, {
      onDelete: 'cascade',
    }),
    conversationId: text('conversation_id').references(
      () => roleplayConversation.id,
      { onDelete: 'cascade' }
    ),
    status: text('status').notNull().default('created'),
    visibility: text('visibility').notNull().default('private'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    summary: text('summary').notNull().default(''),
    metadata: text('metadata'),
  },
  (table) => [
    index('idx_roleplay_memory_user_status').on(table.userId, table.status),
    index('idx_roleplay_memory_character').on(table.characterId),
    index('idx_roleplay_memory_conversation').on(table.conversationId),
  ]
);

export const roleplayAsset = table(
  'roleplay_asset',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    characterId: text('character_id').references(() => roleplayCharacter.id, {
      onDelete: 'set null',
    }),
    conversationId: text('conversation_id').references(
      () => roleplayConversation.id,
      { onDelete: 'set null' }
    ),
    messageId: text('message_id').references(() => roleplayMessage.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('created'),
    type: text('type').notNull(),
    url: text('url').notNull().default(''),
    storageKey: text('storage_key').notNull().default(''),
    contentType: text('content_type').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    metadata: text('metadata'),
  },
  (table) => [
    index('idx_roleplay_asset_user_type').on(table.userId, table.type),
    index('idx_roleplay_asset_character').on(table.characterId),
    index('idx_roleplay_asset_conversation').on(table.conversationId),
  ]
);

export const roleplayCharacterFollow = table(
  'roleplay_character_follow',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    characterId: text('character_id')
      .notNull()
      .references(() => roleplayCharacter.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('created'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_roleplay_follow_user_character').on(
      table.userId,
      table.characterId
    ),
    index('idx_roleplay_follow_character_status').on(
      table.characterId,
      table.status
    ),
  ]
);

export const roleplayCharacterComment = table(
  'roleplay_character_comment',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    characterId: text('character_id')
      .notNull()
      .references(() => roleplayCharacter.id, { onDelete: 'cascade' }),
    // Self-FK declared as a plain column to dodge TS circular-typing issues;
    // the actual FK constraint lives in migration 0006.
    parentId: text('parent_id'),
    status: text('status').notNull().default('created'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    body: text('body').notNull().default(''),
    authorName: text('author_name').notNull().default(''),
    likeCount: integer('like_count').notNull().default(0),
    metadata: text('metadata'),
  },
  (table) => [
    index('idx_roleplay_comment_character_status').on(
      table.characterId,
      table.status
    ),
    index('idx_roleplay_comment_user_status').on(table.userId, table.status),
    index('idx_roleplay_comment_parent').on(table.parentId),
  ]
);

export const roleplayQualityEvent = table(
  'roleplay_quality_event',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    characterId: text('character_id').references(() => roleplayCharacter.id, {
      onDelete: 'set null',
    }),
    conversationId: text('conversation_id').references(
      () => roleplayConversation.id,
      { onDelete: 'set null' }
    ),
    messageId: text('message_id').references(() => roleplayMessage.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('created'),
    eventType: text('event_type').notNull(),
    value: integer('value').notNull().default(1),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_roleplay_quality_event_character_type').on(
      table.characterId,
      table.eventType
    ),
    index('idx_roleplay_quality_event_conversation').on(table.conversationId),
    index('idx_roleplay_quality_event_created').on(table.createdAt),
  ]
);

export const roleplayQualityEvaluation = table(
  'roleplay_quality_evaluation',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id').references(() => roleplayCharacter.id, {
      onDelete: 'set null',
    }),
    conversationId: text('conversation_id').references(
      () => roleplayConversation.id,
      { onDelete: 'set null' }
    ),
    sampleMessageId: text('sample_message_id').references(
      () => roleplayMessage.id,
      { onDelete: 'set null' }
    ),
    status: text('status').notNull().default('created'),
    judgeModel: text('judge_model').notNull().default(''),
    voiceScore: integer('voice_score').notNull().default(0),
    valuesScore: integer('values_score').notNull().default(0),
    relationshipScore: integer('relationship_score').notNull().default(0),
    immersionScore: integer('immersion_score').notNull().default(0),
    oocScore: integer('ooc_score').notNull().default(0),
    summary: text('summary').notNull().default(''),
    issues: text('issues').notNull().default('[]'),
    recommendations: text('recommendations').notNull().default('[]'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_roleplay_quality_eval_character_created').on(
      table.characterId,
      table.createdAt
    ),
    index('idx_roleplay_quality_eval_conversation').on(table.conversationId),
  ]
);

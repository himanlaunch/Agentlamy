import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull();

export const teamRoleEnum = pgEnum("team_role", ["owner", "member"]);
export const scanStatusEnum = pgEnum("scan_status", ["queued", "running", "completed", "failed"]);

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.identifier, table.token],
    }),
  })
);

export const teams = pgTable(
  "teams",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    slugIdx: uniqueIndex("teams_slug_idx").on(table.slug),
  })
);

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").default("owner").notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    memberUniq: uniqueIndex("memberships_team_user_idx").on(table.teamId, table.userId),
  })
);

export const scanTargets = pgTable(
  "scan_targets",
  {
    id: id(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    baseUrl: text("base_url").notNull(),
    normalizedHost: text("normalized_host").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    targetUniq: uniqueIndex("scan_targets_team_host_idx").on(table.teamId, table.normalizedHost),
  })
);

export const projects = pgTable("projects", {
  id: id(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  scanTargetId: text("scan_target_id")
    .notNull()
    .references(() => scanTargets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const scans = pgTable(
  "scans",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: scanStatusEnum("status").default("queued").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    score: integer("score"),
    grade: text("grade"),
    summaryJson: jsonb("summary_json").$type<Record<string, unknown>>(),
    shareToken: text("share_token").notNull().$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    shareTokenIdx: uniqueIndex("scans_share_token_idx").on(table.shareToken),
  })
);

export const scannedPages = pgTable("scanned_pages", {
  id: id(),
  scanId: text("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  path: text("path"),
  title: text("title"),
  contentType: text("content_type").notNull(),
  tokenCount: integer("token_count").notNull().default(0),
  headingStats: jsonb("heading_stats").$type<Record<string, unknown>>(),
  markdownAvailable: boolean("markdown_available").default(false).notNull(),
  fetchMode: text("fetch_mode").notNull().default("raw-http"),
  introText: text("intro_text"),
  metaJson: jsonb("meta_json").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const findings = pgTable("findings", {
  id: id(),
  scanId: text("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  pageId: text("page_id").references(() => scannedPages.id, { onDelete: "set null" }),
  checkerId: text("checker_id").notNull(),
  checkerName: text("checker_name").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  fixHint: text("fix_hint"),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const generatedArtifacts = pgTable("generated_artifacts", {
  id: id(),
  scanId: text("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  provider: text("provider"),
  model: text("model"),
  content: text("content").notNull(),
  format: text("format").notNull(),
  createdAt: createdAt(),
});

export const teamRelations = relations(teams, ({ many }) => ({
  memberships: many(memberships),
  projects: many(projects),
  scanTargets: many(scanTargets),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
  }),
  scanTarget: one(scanTargets, {
    fields: [projects.scanTargetId],
    references: [scanTargets.id],
  }),
  scans: many(scans),
}));

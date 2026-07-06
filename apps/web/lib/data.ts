import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  findings,
  generatedArtifacts,
  memberships,
  projects,
  scannedPages,
  scans,
  scanTargets,
  teams,
  users,
} from "./schema";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function normalizedHost(baseUrl: string) {
  return new URL(baseUrl).host.toLowerCase();
}

export async function ensureUserRecord(user: { id: string; email?: string | null; name?: string | null }) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? user.email ?? "AgentLamy User",
    })
    .returning();

  return inserted[0];
}

export async function ensurePersonalTeam(user: { id: string; email?: string | null; name?: string | null }) {
  const db = getDb();
  await ensureUserRecord(user);

  const existing = await db
    .select({
      teamId: memberships.teamId,
      teamName: teams.name,
    })
    .from(memberships)
    .innerJoin(teams, eq(teams.id, memberships.teamId))
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (existing[0]) {
    return existing[0].teamId;
  }

  const teamName = user.name ? `${user.name}'s Workspace` : "My Workspace";
  const team = await db
    .insert(teams)
    .values({
      name: teamName,
      slug: `${slugify(teamName)}-${crypto.randomUUID().slice(0, 8)}`,
    })
    .returning();

  await db.insert(memberships).values({
    teamId: team[0].id,
    userId: user.id,
    role: "owner",
  });

  return team[0].id;
}

export async function createProjectForUser({
  user,
  name,
  baseUrl,
  description,
}: {
  user: { id: string; email?: string | null; name?: string | null };
  name: string;
  baseUrl: string;
  description?: string;
}) {
  const db = getDb();
  const teamId = await ensurePersonalTeam(user);
  const host = normalizedHost(baseUrl);

  let target = await db
    .select()
    .from(scanTargets)
    .where(and(eq(scanTargets.teamId, teamId), eq(scanTargets.normalizedHost, host)))
    .limit(1);

  if (!target[0]) {
    target = await db
      .insert(scanTargets)
      .values({
        teamId,
        baseUrl,
        normalizedHost: host,
      })
      .returning();
  }

  const project = await db
    .insert(projects)
    .values({
      teamId,
      scanTargetId: target[0].id,
      name,
      description,
    })
    .returning();

  return project[0];
}

export async function getDashboardData(userId: string) {
  const db = getDb();
  const projectRows = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      description: projects.description,
      baseUrl: scanTargets.baseUrl,
      teamName: teams.name,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .innerJoin(teams, eq(teams.id, projects.teamId))
    .innerJoin(scanTargets, eq(scanTargets.id, projects.scanTargetId))
    .innerJoin(memberships, eq(memberships.teamId, projects.teamId))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(projects.updatedAt));

  const recentScans = await db
    .select({
      scanId: scans.id,
      projectId: scans.projectId,
      status: scans.status,
      score: scans.score,
      grade: scans.grade,
      createdAt: scans.createdAt,
      completedAt: scans.completedAt,
    })
    .from(scans)
    .innerJoin(projects, eq(projects.id, scans.projectId))
    .innerJoin(memberships, eq(memberships.teamId, projects.teamId))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(scans.createdAt))
    .limit(10);

  return { projects: projectRows, recentScans };
}

export async function getProjectForUser(projectId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      baseUrl: scanTargets.baseUrl,
      teamId: projects.teamId,
      scanTargetId: projects.scanTargetId,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .innerJoin(scanTargets, eq(scanTargets.id, projects.scanTargetId))
    .innerJoin(memberships, eq(memberships.teamId, projects.teamId))
    .where(and(eq(projects.id, projectId), eq(memberships.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listScansForProject(projectId: string, userId: string) {
  const db = getDb();
  return db
    .select()
    .from(scans)
    .innerJoin(projects, eq(projects.id, scans.projectId))
    .innerJoin(memberships, eq(memberships.teamId, projects.teamId))
    .where(and(eq(scans.projectId, projectId), eq(memberships.userId, userId)))
    .orderBy(desc(scans.createdAt));
}

export async function createQueuedScan(projectId: string) {
  const db = getDb();
  const inserted = await db
    .insert(scans)
    .values({
      projectId,
      status: "queued",
    })
    .returning();

  return inserted[0];
}

export async function getScanForUser(scanId: string, userId: string) {
  const db = getDb();
  const scanRows = await db
    .select({
      id: scans.id,
      projectId: scans.projectId,
      shareToken: scans.shareToken,
      status: scans.status,
      score: scans.score,
      grade: scans.grade,
      summaryJson: scans.summaryJson,
      startedAt: scans.startedAt,
      completedAt: scans.completedAt,
      createdAt: scans.createdAt,
      projectName: projects.name,
      projectDescription: projects.description,
      baseUrl: scanTargets.baseUrl,
    })
    .from(scans)
    .innerJoin(projects, eq(projects.id, scans.projectId))
    .innerJoin(scanTargets, eq(scanTargets.id, projects.scanTargetId))
    .innerJoin(memberships, eq(memberships.teamId, projects.teamId))
    .where(and(eq(scans.id, scanId), eq(memberships.userId, userId)))
    .limit(1);

  return scanRows[0] ?? null;
}

export async function getScanByShareToken(shareToken: string) {
  const db = getDb();
  const scanRows = await db
    .select({
      id: scans.id,
      projectId: scans.projectId,
      shareToken: scans.shareToken,
      status: scans.status,
      score: scans.score,
      grade: scans.grade,
      summaryJson: scans.summaryJson,
      startedAt: scans.startedAt,
      completedAt: scans.completedAt,
      createdAt: scans.createdAt,
      projectName: projects.name,
      projectDescription: projects.description,
      baseUrl: scanTargets.baseUrl,
    })
    .from(scans)
    .innerJoin(projects, eq(projects.id, scans.projectId))
    .innerJoin(scanTargets, eq(scanTargets.id, projects.scanTargetId))
    .where(eq(scans.shareToken, shareToken))
    .limit(1);

  return scanRows[0] ?? null;
}

export async function getScanPages(scanId: string) {
  const db = getDb();
  return db.select().from(scannedPages).where(eq(scannedPages.scanId, scanId)).orderBy(desc(scannedPages.tokenCount));
}

export async function getScanFindings(scanId: string) {
  const db = getDb();
  return db.select().from(findings).where(eq(findings.scanId, scanId)).orderBy(desc(findings.createdAt));
}

export async function getScanArtifacts(scanId: string) {
  const db = getDb();
  return db.select().from(generatedArtifacts).where(eq(generatedArtifacts.scanId, scanId)).orderBy(desc(generatedArtifacts.createdAt));
}

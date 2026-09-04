import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  achievements,
  aiAnalyses,
  auditLogs,
  InsertUser,
  privacySettings,
  rankings,
  studentAchievements,
  results,
  subjectOfferings,
  subjects,
  semesters,
  studentAccounts,
  students,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getStudentForUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ student: students, account: studentAccounts })
    .from(studentAccounts)
    .innerJoin(students, eq(studentAccounts.studentId, students.id))
    .where(eq(studentAccounts.userId, userId))
    .limit(1);
  return result[0];
}

export async function getStudentPublishedResults(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ result: results, subject: subjects, semester: semesters })
    .from(results)
    .innerJoin(subjectOfferings, eq(results.subjectOfferingId, subjectOfferings.id))
    .innerJoin(subjects, eq(subjectOfferings.subjectId, subjects.id))
    .innerJoin(semesters, eq(subjectOfferings.semesterId, semesters.id))
    .where(and(eq(results.studentId, studentId), eq(results.published, true)))
    .orderBy(semesters.number, subjects.code);
}

export async function getStudentAchievements(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ award: studentAchievements, achievement: achievements, semester: semesters })
    .from(studentAchievements)
    .innerJoin(achievements, eq(studentAchievements.achievementId, achievements.id))
    .leftJoin(semesters, eq(studentAchievements.semesterId, semesters.id))
    .where(eq(studentAchievements.studentId, studentId))
    .orderBy(desc(studentAchievements.awardedAt));
}

export async function getStudentPublishedAnalyses(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: aiAnalyses.id, semesterId: aiAnalyses.semesterId, payload: aiAnalyses.payload, publishedAt: aiAnalyses.publishedAt })
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.studentId, studentId), eq(aiAnalyses.status, "published")))
    .orderBy(desc(aiAnalyses.publishedAt));
}

export async function getPeerStudentProfile(studentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ student: students, privacy: privacySettings }).from(students).leftJoin(privacySettings, eq(privacySettings.studentId, students.id)).where(eq(students.id, studentId)).limit(1);
  return result[0];
}

export async function getPublishedSubjectAnalytics(cohortId: number, semesterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ result: results, subject: subjects, student: students, privacy: privacySettings })
    .from(results)
    .innerJoin(subjectOfferings, eq(results.subjectOfferingId, subjectOfferings.id))
    .innerJoin(subjects, eq(subjectOfferings.subjectId, subjects.id))
    .innerJoin(students, eq(results.studentId, students.id))
    .leftJoin(privacySettings, eq(privacySettings.studentId, students.id))
    .where(and(eq(subjectOfferings.cohortId, cohortId), eq(subjectOfferings.semesterId, semesterId), eq(results.published, true)));
}

export async function getPrivacySettings(studentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(privacySettings).where(eq(privacySettings.studentId, studentId)).limit(1);
  return result[0];
}

export async function listPublishedRankings(input: { cohortId: number; semesterId: number; rankingType: "ACADEMIC" | "FANTASY" | "IMPROVEMENT" | "RECENT_FORM" | "CONSISTENCY" | "SUBJECT" }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rankings).where(and(
    eq(rankings.cohortId, input.cohortId),
    eq(rankings.semesterId, input.semesterId),
    eq(rankings.rankingType, input.rankingType),
    eq(rankings.published, true),
  )).orderBy(rankings.rank).limit(100);
}

export async function appendAuditLog(input: {
  actorUserId: number;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    oldValue: input.oldValue,
    newValue: input.newValue,
  });
}

export async function listAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

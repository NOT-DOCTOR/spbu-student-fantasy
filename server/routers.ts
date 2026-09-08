import { TRPCError } from "@trpc/server";
import { and, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { cohorts, privacySettings, programs, scoringConfigs, semesters, studentAccounts, students, subjects } from "../drizzle/schema";
import { canViewAcademicData } from "../shared/privacy";
import { createStudentInput, studentSearchInput, updateStudentInput } from "../shared/studentAdmin";
import { getAppRole, requireAdmin, requireVerifiedStudent } from "./access";
import { appendAuditLog, getDb, getPrivacySettings, getStudentForUser, getPeerStudentProfile, getPublishedSubjectAnalytics, getStudentAchievements, getStudentPublishedAnalyses, getStudentPublishedResults, listAuditLogs, listPublishedRankings } from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { importsRouter } from "./routers/imports";
import { analysesRouter } from "./routers/analyses";
import { createRankingSnapshot } from "./rankings";

const rankingType = z.enum(["ACADEMIC", "FANTASY", "IMPROVEMENT", "RECENT_FORM", "CONSISTENCY", "SUBJECT"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  academic: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const role = getAppRole(ctx);
      if (role === "ADMIN") return { role, student: null, privacy: null, results: [], analyses: [], achievements: [] };
      const { student } = await requireVerifiedStudent(ctx);
      if (!student) throw new TRPCError({ code: "FORBIDDEN", message: "A verified student account is required." });
      const privacy = await getPrivacySettings(student.id);
      const results = await getStudentPublishedResults(student.id);
      const analyses = await getStudentPublishedAnalyses(student.id);
      const achievements = await getStudentAchievements(student.id);
      return { role, student, privacy, results, analyses, achievements };
    }),

    subjectAnalytics: protectedProcedure.input(z.object({ cohortId: z.number().int().positive(), semesterId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const viewerRole = getAppRole(ctx);
      if (viewerRole !== "ADMIN") await requireVerifiedStudent(ctx);
      const rows = await getPublishedSubjectAnalytics(input.cohortId, input.semesterId);
      const visible = viewerRole === "ADMIN" ? rows : rows.filter(row => !row.privacy || (!row.privacy.privateMode && row.privacy.showSubjectStats));
      const grouped = new Map<number, { subjectId: number; code: string; name: string; total: number; passed: number; scoreTotal: number }>();
      for (const row of visible) {
        const current = grouped.get(row.subject.id) ?? { subjectId: row.subject.id, code: row.subject.code, name: row.subject.name, total: 0, passed: 0, scoreTotal: 0 };
        current.total += 1;
        if (row.result.normalizedResult === "PASS") current.passed += 1;
        current.scoreTotal += Number(row.result.normalizedScore ?? row.result.percentage ?? 0);
        grouped.set(row.subject.id, current);
      }
      return Array.from(grouped.values()).map(item => ({ ...item, averageScore: item.total ? Math.round((item.scoreTotal / item.total) * 10) / 10 : 0, passRate: item.total ? Math.round((item.passed / item.total) * 100) : 0 }));
    }),

    profile: protectedProcedure.input(z.object({ studentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const target = await getPeerStudentProfile(input.studentId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Student profile not found." });
      const viewerRole = getAppRole(ctx);
      const viewer = viewerRole === "ADMIN" ? null : await requireVerifiedStudent(ctx);
      const isSelf = viewer?.student?.id === input.studentId;
      const settings = target.privacy;
      if (viewerRole !== "ADMIN" && !isSelf && (!settings || settings.privateMode || !settings.showProfile)) throw new TRPCError({ code: "FORBIDDEN", message: "This profile is private." });
      return { student: target.student, privacy: isSelf ? settings : null, isSelf };
    }),

    rankings: protectedProcedure.input(z.object({
      cohortId: z.number().int().positive(),
      semesterId: z.number().int().positive(),
      rankingType,
    })).query(async ({ ctx, input }) => {
      const viewer = await requireVerifiedStudent(ctx);
      const rankings = await listPublishedRankings(input);
      if (getAppRole(ctx) === "ADMIN" || !viewer.student) return rankings;
      const visible = [];
      for (const item of rankings) {
        if (item.studentId === viewer.student.id) {
          visible.push(item);
          continue;
        }
        const privacy = await getPrivacySettings(item.studentId);
        if (canViewAcademicData({ viewerRole: "STUDENT", isSelf: false, settings: privacy ?? null, field: "rank" })) {
          visible.push(item);
        }
      }
      return visible;
    }),
  }),

  privacy: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { student } = await requireVerifiedStudent(ctx);
      if (!student) throw new TRPCError({ code: "BAD_REQUEST", message: "Admins do not have student privacy settings." });
      return (await getPrivacySettings(student.id)) ?? {
        studentId: student.id,
        privateMode: false,
        showProfile: true,
        showRank: true,
        showSubjectStats: true,
      };
    }),

    update: protectedProcedure.input(z.object({
      privateMode: z.boolean(),
      showProfile: z.boolean(),
      showRank: z.boolean(),
      showSubjectStats: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      const { student } = await requireVerifiedStudent(ctx);
      if (!student) throw new TRPCError({ code: "BAD_REQUEST", message: "Admins do not have student privacy settings." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      await db.insert(privacySettings).values({ studentId: student.id, ...input }).onDuplicateKeyUpdate({ set: input });
      await appendAuditLog({ actorUserId: ctx.user.id, action: "PRIVACY_SETTINGS_UPDATED", entity: "privacy_settings", entityId: String(student.id), newValue: JSON.stringify(input) });
      return { success: true } as const;
    }),
  }),

  imports: importsRouter,
  analyses: analysesRouter,

  admin: router({
    students: adminProcedure.input(studentSearchInput).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const filters = [];
      if (input?.status) filters.push(eq(students.status, input.status));
      if (input?.search) filters.push(or(like(students.studentId, `%${input.search}%`), like(students.fullName, `%${input.search}%`)));
      return db.select({ id: students.id, studentId: students.studentId, fullName: students.fullName, facultyId: students.facultyId, programId: students.programId, cohortId: students.cohortId, currentSemesterId: students.currentSemesterId, status: students.status, createdAt: students.createdAt, updatedAt: students.updatedAt }).from(students).where(filters.length ? and(...filters) : undefined).orderBy(students.fullName).limit(200);
    }),
    createStudent: adminProcedure.input(createStudentInput).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const inserted = await db.insert(students).values(input);
      const id = Number((inserted as unknown as { insertId?: number }).insertId);
      await appendAuditLog({ actorUserId: ctx.user.id, action: "STUDENT_CREATED", entity: "students", entityId: String(id), newValue: JSON.stringify(input) });
      return { id } as const;
    }),
    updateStudent: adminProcedure.input(updateStudentInput).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const [before] = await db.select().from(students).where(eq(students.id, input.id)).limit(1);
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found." });
      const { id, ...changes } = input;
      await db.update(students).set(changes).where(eq(students.id, id));
      await appendAuditLog({ actorUserId: ctx.user.id, action: "STUDENT_UPDATED", entity: "students", entityId: String(id), oldValue: JSON.stringify(before), newValue: JSON.stringify(changes) });
      return { success: true } as const;
    }),
    catalog: adminProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const [programRows, cohortRows, semesterRows, subjectRows, studentRows, links] = await Promise.all([
        db.select({ id: programs.id, code: programs.code, name: programs.name }).from(programs),
        db.select({ id: cohorts.id, code: cohorts.code, name: cohorts.name }).from(cohorts),
        db.select({ id: semesters.id, number: semesters.number, name: semesters.name }).from(semesters),
        db.select({ id: subjects.id, code: subjects.code, name: subjects.name }).from(subjects),
        db.select({ id: students.id, studentId: students.studentId, fullName: students.fullName, status: students.status }).from(students),
        db.select({ studentId: studentAccounts.studentId, userId: studentAccounts.userId, verificationStatus: studentAccounts.verificationStatus }).from(studentAccounts),
      ]);
      return { programs: programRows, cohorts: cohortRows, semesters: semesterRows, subjects: subjectRows, students: studentRows, accountLinks: links };
    }),
    linkStudentAccount: adminProcedure.input(z.object({ studentId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const inserted = await db.insert(studentAccounts).values({ studentId: input.studentId, userId: input.userId, verificationStatus: "pending" });
      const id = Number((inserted as unknown as { insertId?: number }).insertId);
      await appendAuditLog({ actorUserId: ctx.user.id, action: "STUDENT_ACCOUNT_LINKED", entity: "student_accounts", entityId: String(id), newValue: JSON.stringify(input) });
      return { id, status: "pending" } as const;
    }),
    verifyStudent: adminProcedure.input(z.object({ studentId: z.number().int().positive(), userId: z.number().int().positive(), status: z.enum(["pending", "verified", "revoked"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      await db.update(studentAccounts).set({ verificationStatus: input.status }).where(and(eq(studentAccounts.studentId, input.studentId), eq(studentAccounts.userId, input.userId)));
      await appendAuditLog({ actorUserId: ctx.user.id, action: "STUDENT_VERIFICATION_UPDATED", entity: "student_accounts", entityId: String(input.studentId), newValue: JSON.stringify(input) });
      return { success: true } as const;
    }),
    createSubject: adminProcedure.input(z.object({ code: z.string().min(1).max(64), name: z.string().min(1).max(180), subjectType: z.enum(["EXAM", "PASS_FAIL"]), credits: z.number().nonnegative().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const inserted = await db.insert(subjects).values({ ...input, credits: input.credits === undefined ? undefined : String(input.credits) });
      const id = Number((inserted as unknown as { insertId?: number }).insertId);
      await appendAuditLog({ actorUserId: ctx.user.id, action: "SUBJECT_CREATED", entity: "subjects", entityId: String(id), newValue: JSON.stringify(input) });
      return { id } as const;
    }),
    createSemester: adminProcedure.input(z.object({ name: z.string().min(1).max(100), number: z.number().int().min(1).max(20) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const inserted = await db.insert(semesters).values(input);
      const id = Number((inserted as unknown as { insertId?: number }).insertId);
      await appendAuditLog({ actorUserId: ctx.user.id, action: "SEMESTER_CREATED", entity: "semesters", entityId: String(id), newValue: JSON.stringify(input) });
      return { id } as const;
    }),
    createCohort: adminProcedure.input(z.object({ programId: z.number().int().positive(), code: z.string().min(1).max(64), name: z.string().min(1).max(160) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const inserted = await db.insert(cohorts).values(input);
      const id = Number((inserted as unknown as { insertId?: number }).insertId);
      await appendAuditLog({ actorUserId: ctx.user.id, action: "COHORT_CREATED", entity: "cohorts", entityId: String(id), newValue: JSON.stringify(input) });
      return { id } as const;
    }),
    auditLogs: adminProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      return listAuditLogs();
    }),
    scoringConfigs: adminProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      return db.select().from(scoringConfigs);
    }),
    createScoringConfig: adminProcedure.input(z.object({
      version: z.string().min(1).max(64),
      examWeight: z.number().nonnegative(),
      passFailWeight: z.number().nonnegative(),
      creditWeightEnabled: z.boolean(),
      improvementWeight: z.number(),
      consistencyWeight: z.number(),
      firstAttemptWeight: z.number(),
      recentFormWeight: z.number(),
      tieBreakOrder: z.array(z.string().min(1)).min(1),
    })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      await db.insert(scoringConfigs).values({ ...input, examWeight: input.examWeight.toFixed(4), passFailWeight: input.passFailWeight.toFixed(4), improvementWeight: input.improvementWeight.toFixed(4), consistencyWeight: input.consistencyWeight.toFixed(4), firstAttemptWeight: input.firstAttemptWeight.toFixed(4), recentFormWeight: input.recentFormWeight.toFixed(4), tieBreakOrder: JSON.stringify(input.tieBreakOrder), createdBy: ctx.user.id, active: false });
      await appendAuditLog({ actorUserId: ctx.user.id, action: "SCORING_CONFIG_CREATED", entity: "scoring_configs", entityId: input.version, newValue: JSON.stringify(input) });
      return { success: true } as const;
    }),
    createRankingSnapshot: adminProcedure.input(z.object({
      cohortId: z.number().int().positive(),
      semesterId: z.number().int().positive(),
      scoringConfigId: z.number().int().positive(),
      scoringVersion: z.string().min(1).max(64),
      tieBreakOrder: z.union([z.array(z.string().min(1)), z.string().min(1)]),
      rankingType,
      publish: z.boolean().default(false),
      lock: z.boolean().default(false),
      entries: z.array(z.object({ studentId: z.string().min(1), academicScore: z.number(), fantasyScore: z.number(), recentForm: z.number(), firstAttemptSuccess: z.number() })).min(1),
    })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      return createRankingSnapshot({
        cohortId: input.cohortId,
        semesterId: input.semesterId,
        scoringConfig: { id: input.scoringConfigId, version: input.scoringVersion, tieBreakOrder: Array.isArray(input.tieBreakOrder) ? JSON.stringify(input.tieBreakOrder) : input.tieBreakOrder },
        rankingType: input.rankingType,
        publish: input.publish,
        lock: input.lock,
        entries: input.entries,
      }).then(async result => {
        await appendAuditLog({ actorUserId: ctx.user.id, action: input.lock ? "RANKING_SNAPSHOT_PUBLISHED_AND_LOCKED" : "RANKING_SNAPSHOT_CREATED", entity: "rankings", entityId: `${input.cohortId}:${input.semesterId}:${input.rankingType}`, newValue: JSON.stringify({ version: input.scoringVersion, rankingType: input.rankingType, publish: input.publish, lock: input.lock }) });
        return result;
      });
    }),
    stats: adminProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const [studentCount] = await db.select({ count: (await import("drizzle-orm")).sql<number>`count(*)` }).from((await import("../drizzle/schema")).students);
      const [importCount] = await db.select({ count: (await import("drizzle-orm")).sql<number>`count(*)` }).from((await import("../drizzle/schema")).imports);
      return { students: Number(studentCount?.count ?? 0), imports: Number(importCount?.count ?? 0) };
    }),
  }),
});

export type AppRouter = typeof appRouter;

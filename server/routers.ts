import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { privacySettings, scoringConfigs } from "../drizzle/schema";
import { canViewAcademicData } from "../shared/privacy";
import { getAppRole, requireAdmin, requireVerifiedStudent } from "./access";
import { appendAuditLog, getDb, getPrivacySettings, getStudentForUser, getStudentPublishedResults, listAuditLogs, listPublishedRankings } from "./db";
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
      if (role === "ADMIN") return { role, student: null, privacy: null, results: [] };
      const { student } = await requireVerifiedStudent(ctx);
      if (!student) throw new TRPCError({ code: "FORBIDDEN", message: "A verified student account is required." });
      const privacy = await getPrivacySettings(student.id);
      const results = await getStudentPublishedResults(student.id);
      return { role, student, privacy, results };
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

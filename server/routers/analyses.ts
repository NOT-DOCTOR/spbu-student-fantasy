import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { aiAnalyses } from "../../drizzle/schema";
import { appendAuditLog, getDb } from "../db";
import { adminProcedure, router } from "../_core/trpc";

const analysisPayload = z.object({
  title: z.string().min(1).max(180),
  summary: z.string().min(1).max(4000),
  sections: z.array(z.object({ heading: z.string().min(1).max(180), body: z.string().min(1).max(8000) })).min(1).max(20),
  generatedAt: z.string().optional(),
  model: z.string().max(120).optional(),
}).strict();

export function validateAnalysisPayload(value: unknown) {
  return analysisPayload.safeParse(value);
}

export function validatePublicationApproval(note: string) {
  if (note.trim().length < 20) throw new Error("Publication approval note must be at least 20 characters.");
  return note.trim();
}

export function assertDraftAnalysis(status: string | undefined) {
  if (!status) throw new Error("Analysis not found.");
  if (status !== "draft") throw new Error("Only draft analyses can be replaced.");
  return true as const;
}

export const analysesRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    return db.select({ id: aiAnalyses.id, studentId: aiAnalyses.studentId, semesterId: aiAnalyses.semesterId, payload: aiAnalyses.payload, status: aiAnalyses.status, publishedAt: aiAnalyses.publishedAt }).from(aiAnalyses);
  }),
  upload: adminProcedure.input(z.object({
    studentId: z.number().int().positive(),
    semesterId: z.number().int().positive().optional(),
    payloadJson: z.string().min(2),
  })).mutation(async ({ ctx, input }) => {
    const parsed = validateAnalysisPayload(JSON.parse(input.payloadJson));
    if (!parsed.success) throw new Error("Analysis payload must include a title, summary, and structured sections.");
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const inserted = await db.insert(aiAnalyses).values({ studentId: input.studentId, semesterId: input.semesterId, payload: JSON.stringify(parsed.data), status: "draft", createdBy: ctx.user.id });
    const analysisId = Number((inserted as unknown as { insertId?: number }).insertId);
    await appendAuditLog({ actorUserId: ctx.user.id, action: "AI_ANALYSIS_UPLOADED", entity: "ai_analyses", entityId: String(analysisId) });
    return { analysisId, status: "draft" } as const;
  }),

  replace: adminProcedure.input(z.object({ analysisId: z.number().int().positive(), payloadJson: z.string().min(2) })).mutation(async ({ ctx, input }) => {
    const parsed = validateAnalysisPayload(JSON.parse(input.payloadJson));
    if (!parsed.success) throw new Error("Analysis payload must include a title, summary, and structured sections.");
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const found = await db.select({ id: aiAnalyses.id, status: aiAnalyses.status }).from(aiAnalyses).where(eq(aiAnalyses.id, input.analysisId)).limit(1);
    assertDraftAnalysis(found[0]?.status);
    await db.update(aiAnalyses).set({ payload: JSON.stringify(parsed.data) }).where(and(eq(aiAnalyses.id, input.analysisId), eq(aiAnalyses.status, "draft")));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "AI_ANALYSIS_REPLACED", entity: "ai_analyses", entityId: String(input.analysisId) });
    return { success: true } as const;
  }),

  publish: adminProcedure.input(z.object({ analysisId: z.number().int().positive(), approvalNote: z.string().min(20) })).mutation(async ({ ctx, input }) => {
    validatePublicationApproval(input.approvalNote);
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const found = await db.select().from(aiAnalyses).where(eq(aiAnalyses.id, input.analysisId)).limit(1);
    if (!found[0]) throw new Error("Analysis not found.");
    await db.update(aiAnalyses).set({ status: "published", publishedAt: new Date() }).where(eq(aiAnalyses.id, input.analysisId));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "AI_ANALYSIS_PUBLISHED", entity: "ai_analyses", entityId: String(input.analysisId), newValue: JSON.stringify({ approvalNote: input.approvalNote.trim() }) });
    return { success: true } as const;
  }),

  archive: adminProcedure.input(z.object({ analysisId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.update(aiAnalyses).set({ status: "archived" }).where(and(eq(aiAnalyses.id, input.analysisId), eq(aiAnalyses.status, "published")));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "AI_ANALYSIS_ARCHIVED", entity: "ai_analyses", entityId: String(input.analysisId) });
    return { success: true } as const;
  }),
});

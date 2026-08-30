import { and, eq } from "drizzle-orm";
import { read, utils } from "xlsx";
import { z } from "zod";
import { attempts, importErrors, imports, results, subjectOfferings, subjects, students } from "../../drizzle/schema";
import { normalizedAttempt, normalizeImportRows, validateImportRows } from "../../shared/imports";
import { normalizeResult, normalizedScoreFromSource } from "../../shared/scoring";
import { appendAuditLog, getDb } from "../db";
import { storageGetSignedUrl, storagePut } from "../storage";
import { adminProcedure, router } from "../_core/trpc";

const sourceInput = z.object({
  cohortId: z.number().int().positive(),
  semesterId: z.number().int().positive(),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(80),
  dataBase64: z.string().min(1),
});

function parseSource(data: Buffer, fileType: string) {
  if (fileType.includes("json") || fileType.endsWith(".json")) {
    const parsed = JSON.parse(data.toString("utf8")) as unknown;
    if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { rows?: unknown }).rows)) return (parsed as { rows: Array<Record<string, unknown>> }).rows;
    throw new Error("JSON source must be an array of result rows or an object with a rows array.");
  }
  const workbook = read(data, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("The source workbook does not contain a readable sheet.");
  return utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
}

async function getValidationContext(cohortId: number, semesterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const studentRows = await db.select({ studentId: students.studentId }).from(students).where(eq(students.cohortId, cohortId));
  const offeringRows = await db.select({ code: subjects.code }).from(subjectOfferings).innerJoin(subjects, eq(subjectOfferings.subjectId, subjects.id)).where(and(eq(subjectOfferings.cohortId, cohortId), eq(subjectOfferings.semesterId, semesterId)));
  return {
    db,
    knownStudents: new Set(studentRows.map(row => row.studentId)),
    knownOfferings: new Set(offeringRows.map(row => row.code.toUpperCase())),
  };
}

async function loadImportRows(fileKey: string, fileType: string) {
  const signedUrl = await storageGetSignedUrl(fileKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("The stored source file could not be read.");
  return normalizeImportRows(parseSource(Buffer.from(await response.arrayBuffer()), fileType));
}

export const importsRouter = router({
  get: adminProcedure.input(z.object({ importId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const found = await db.select().from(imports).where(eq(imports.id, input.importId)).limit(1);
    if (!found[0]) throw new Error("Import not found.");
    const errors = await db.select().from(importErrors).where(eq(importErrors.importId, input.importId));
    return { import: found[0], errors };
  }),

  resolveError: adminProcedure.input(z.object({ errorId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db.update(importErrors).set({ resolved: true }).where(eq(importErrors.id, input.errorId));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "IMPORT_ERROR_RESOLVED", entity: "import_errors", entityId: String(input.errorId) });
    return { success: true } as const;
  }),

  uploadAndValidate: adminProcedure.input(sourceInput).mutation(async ({ ctx, input }) => {
    const { db, knownStudents, knownOfferings } = await getValidationContext(input.cohortId, input.semesterId);
    const buffer = Buffer.from(input.dataBase64, "base64");
    if (buffer.byteLength > 15 * 1024 * 1024) throw new Error("Source files must be 15 MB or smaller.");
    const stored = await storagePut(`imports/${ctx.user.id}/${input.fileName}`, buffer, input.fileType);
    const rows = normalizeImportRows(parseSource(buffer, input.fileType));
    const validation = validateImportRows(rows, { knownStudents, knownOfferings });
    const created = await db.insert(imports).values({
      cohortId: input.cohortId,
      semesterId: input.semesterId,
      fileName: input.fileName,
      fileKey: stored.key,
      fileUrl: stored.url,
      fileType: input.fileType,
      status: validation.errors.length ? "review" : "validated",
      totalRows: validation.summary.totalRows,
      validRows: validation.summary.validRows,
      errorRows: validation.summary.errorRows,
      uploadedBy: ctx.user.id,
    });
    const importId = Number((created as unknown as { insertId?: number }).insertId);
    if (validation.errors.length) await db.insert(importErrors).values(validation.errors.map(error => ({ importId, rowNumber: error.rowNumber, field: error.field, code: error.code, message: error.message, rawRow: JSON.stringify(error.rawRow) })));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "IMPORT_VALIDATED", entity: "imports", entityId: String(importId), newValue: JSON.stringify(validation.summary) });
    return { importId, status: validation.errors.length ? "review" : "validated", summary: validation.summary, errors: validation.errors.slice(0, 100) };
  }),

  confirm: adminProcedure.input(z.object({ importId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const found = await db.select().from(imports).where(eq(imports.id, input.importId)).limit(1);
    const current = found[0];
    if (!current || !["validated", "review", "confirmed"].includes(current.status)) throw new Error("This import is not ready for confirmation.");
    const unresolved = await db.select().from(importErrors).where(and(eq(importErrors.importId, input.importId), eq(importErrors.resolved, false))).limit(1);
    if (unresolved.length) throw new Error("Resolve all import errors before confirmation.");
    const context = await getValidationContext(current.cohortId, current.semesterId);
    const rows = await loadImportRows(current.fileKey, current.fileType);
    const validation = validateImportRows(rows, { knownStudents: context.knownStudents, knownOfferings: context.knownOfferings });
    if (validation.errors.length) throw new Error("The stored source no longer passes validation.");
    const studentsByCode = new Map((await db.select({ id: students.id, studentId: students.studentId }).from(students).where(eq(students.cohortId, current.cohortId))).map(row => [row.studentId, row.id]));
    const offerings = await db.select({ id: subjectOfferings.id, code: subjects.code }).from(subjectOfferings).innerJoin(subjects, eq(subjectOfferings.subjectId, subjects.id)).where(and(eq(subjectOfferings.cohortId, current.cohortId), eq(subjectOfferings.semesterId, current.semesterId)));
    const offeringsByCode = new Map(offerings.map(row => [row.code.toUpperCase(), row.id]));
    for (const row of validation.validRows) {
      const studentId = studentsByCode.get(row.studentId);
      const subjectOfferingId = offeringsByCode.get(row.subjectCode);
      if (!studentId || !subjectOfferingId) throw new Error("A validated source references a record that is no longer configured.");
      const inserted = await db.insert(results).values({ importId: current.id, studentId, subjectOfferingId, rawGrade: row.rawGrade, rawStatus: row.rawStatus, percentage: row.percentage === null ? null : row.percentage.toFixed(2), normalizedScore: normalizedScoreFromSource(row.percentage, row.rawGrade)?.toFixed(4) ?? null, normalizedResult: normalizeResult(row.rawGrade, row.rawStatus), published: false });
      const resultId = Number((inserted as unknown as { insertId?: number }).insertId);
      const attemptRows = row.attempts.map(normalizedAttempt).filter(attempt => attempt.rawGrade || attempt.rawStatus || attempt.percentage !== null);
      if (attemptRows.length) await db.insert(attempts).values(attemptRows.map((attempt, index) => ({ resultId, attemptNumber: index + 1, ...attempt, percentage: attempt.percentage === null ? null : attempt.percentage.toFixed(2), normalizedScore: attempt.normalizedScore?.toFixed(4) ?? null })));
    }
    await db.update(imports).set({ status: "confirmed" }).where(eq(imports.id, current.id));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "IMPORT_CONFIRMED", entity: "imports", entityId: String(current.id), newValue: JSON.stringify({ rows: validation.validRows.length }) });
    return { success: true, rows: validation.validRows.length } as const;
  }),

  publish: adminProcedure.input(z.object({ importId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const found = await db.select().from(imports).where(eq(imports.id, input.importId)).limit(1);
    const current = found[0];
    if (!current || current.status !== "confirmed") throw new Error("Confirm the import before publication.");
    await db.update(results).set({ published: true }).where(eq(results.importId, current.id));
    await db.update(imports).set({ status: "published" }).where(eq(imports.id, current.id));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "IMPORT_PUBLISHED", entity: "imports", entityId: String(current.id) });
    return { success: true } as const;
  }),

  unpublish: adminProcedure.input(z.object({ importId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const found = await db.select().from(imports).where(eq(imports.id, input.importId)).limit(1);
    const current = found[0];
    if (!current || current.status !== "published") throw new Error("Only a published import can be unpublished.");
    await db.update(results).set({ published: false }).where(eq(results.importId, current.id));
    await db.update(imports).set({ status: "confirmed" }).where(eq(imports.id, current.id));
    await appendAuditLog({ actorUserId: ctx.user.id, action: "IMPORT_UNPUBLISHED", entity: "imports", entityId: String(current.id) });
    return { success: true } as const;
  }),
});

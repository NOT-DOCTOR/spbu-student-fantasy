import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { studentAccounts, students } from "../drizzle/schema";
import { getDb } from "./db";
import { mapStoredRole, type AppRole } from "../shared/privacy";
import type { TrpcContext } from "./_core/context";

export function getAppRole(ctx: TrpcContext): AppRole | null {
  return mapStoredRole(ctx.user?.role);
}

export function requireAdmin(ctx: TrpcContext) {
  if (!ctx.user || getAppRole(ctx) !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "ADMIN authorization is required." });
  }
  return ctx.user;
}

export async function requireVerifiedStudent(ctx: TrpcContext) {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication is required." });
  if (getAppRole(ctx) === "ADMIN") return { user: ctx.user, student: null };
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Academic data service is unavailable." });
  const rows = await db.select({ student: students, account: studentAccounts })
    .from(studentAccounts)
    .innerJoin(students, eq(studentAccounts.studentId, students.id))
    .where(eq(studentAccounts.userId, ctx.user.id))
    .limit(1);
  const match = rows[0];
  if (!match || match.account.verificationStatus !== "verified" || match.student.status === "disabled") {
    throw new TRPCError({ code: "FORBIDDEN", message: "A verified student account is required for academic data." });
  }
  return { user: ctx.user, student: match.student };
}

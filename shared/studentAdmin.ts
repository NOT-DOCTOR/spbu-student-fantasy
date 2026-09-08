import { z } from "zod";

export const studentStatusSchema = z.enum(["active", "disabled", "graduated"]);

export const studentSearchInput = z.object({
  search: z.string().trim().max(120).optional(),
  status: studentStatusSchema.optional(),
}).optional();

export const createStudentInput = z.object({
  studentId: z.string().trim().min(1).max(64),
  fullName: z.string().trim().min(1).max(255),
  facultyId: z.number().int().positive(),
  programId: z.number().int().positive(),
  cohortId: z.number().int().positive(),
  currentSemesterId: z.number().int().positive().optional(),
  status: studentStatusSchema.default("active"),
});

export const updateStudentInput = z.object({
  id: z.number().int().positive(),
  studentId: z.string().trim().min(1).max(64),
  fullName: z.string().trim().min(1).max(255),
  facultyId: z.number().int().positive(),
  programId: z.number().int().positive(),
  cohortId: z.number().int().positive(),
  currentSemesterId: z.number().int().positive().nullable().optional(),
  status: studentStatusSchema,
});

export type CreateStudentInput = z.infer<typeof createStudentInput>;
export type UpdateStudentInput = z.infer<typeof updateStudentInput>;

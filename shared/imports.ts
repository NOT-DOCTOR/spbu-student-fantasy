import { normalizeResult, normalizedScoreFromSource, type NormalizedResult } from "./scoring";

export type ImportRow = {
  studentId: string;
  subjectCode: string;
  percentage: number | null;
  rawGrade: string | null;
  rawStatus: string | null;
  attempts: Array<{ percentage: number | null; rawGrade: string | null; rawStatus: string | null }>;
  raw: Record<string, unknown>;
  rowNumber: number;
};

export type ImportValidationError = {
  rowNumber: number;
  field?: string;
  code: string;
  message: string;
  rawRow: Record<string, unknown>;
};

export type ImportValidationContext = {
  knownStudents: Set<string>;
  knownOfferings: Set<string>;
};

function value(row: Record<string, unknown>, keys: string[]) {
  const entry = keys.find(key => row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "");
  return entry ? row[entry] : undefined;
}

function numberValue(input: unknown): number | null {
  if (input === undefined || input === null || String(input).trim() === "") return null;
  const parsed = Number(String(input).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  const text = String(input).trim();
  return text ? text : null;
}

export function normalizeImportRows(rows: Array<Record<string, unknown>>): ImportRow[] {
  return rows.map((raw, index) => ({
    studentId: String(value(raw, ["studentId", "student_id", "Student ID", "id"]) ?? "").trim(),
    subjectCode: String(value(raw, ["subjectCode", "subject_code", "Subject Code", "subject"]) ?? "").trim().toUpperCase(),
    percentage: numberValue(value(raw, ["percentage", "percent", "score", "Percentage"])),
    rawGrade: textValue(value(raw, ["grade", "rawGrade", "Grade"])),
    rawStatus: textValue(value(raw, ["status", "rawStatus", "Status"])),
    attempts: [1, 2, 3].map(attemptNumber => ({
      percentage: numberValue(value(raw, [`attempt${attemptNumber}Percentage`, `attempt_${attemptNumber}_percentage`])),
      rawGrade: textValue(value(raw, [`attempt${attemptNumber}Grade`, `attempt_${attemptNumber}_grade`])),
      rawStatus: textValue(value(raw, [`attempt${attemptNumber}Status`, `attempt_${attemptNumber}_status`])),
    })),
    raw,
    rowNumber: index + 2,
  }));
}

export function validateImportRows(rows: ImportRow[], context: ImportValidationContext) {
  const errors: ImportValidationError[] = [];
  const seen = new Set<string>();
  const validRows: ImportRow[] = [];

  for (const row of rows) {
    const key = `${row.studentId}::${row.subjectCode}`;
    let valid = true;
    if (!row.studentId) { errors.push({ rowNumber: row.rowNumber, field: "studentId", code: "MISSING_STUDENT_ID", message: "Student ID is required.", rawRow: row.raw }); valid = false; }
    if (!row.subjectCode) { errors.push({ rowNumber: row.rowNumber, field: "subjectCode", code: "MISSING_SUBJECT_CODE", message: "Subject code is required.", rawRow: row.raw }); valid = false; }
    if (row.studentId && !context.knownStudents.has(row.studentId)) { errors.push({ rowNumber: row.rowNumber, field: "studentId", code: "UNKNOWN_STUDENT", message: `Student ${row.studentId} does not exist in the selected cohort.`, rawRow: row.raw }); valid = false; }
    if (row.subjectCode && !context.knownOfferings.has(row.subjectCode)) { errors.push({ rowNumber: row.rowNumber, field: "subjectCode", code: "UNKNOWN_SUBJECT_OFFERING", message: `Subject ${row.subjectCode} is not configured for the selected cohort and semester.`, rawRow: row.raw }); valid = false; }
    if (seen.has(key)) { errors.push({ rowNumber: row.rowNumber, field: "studentId", code: "DUPLICATE_ROW", message: "The student and subject combination appears more than once in this source.", rawRow: row.raw }); valid = false; }
    seen.add(key);

    const score = normalizedScoreFromSource(row.percentage, row.rawGrade);
    if (row.percentage !== null && row.percentage !== undefined && (row.percentage < 0 || row.percentage > 100)) { errors.push({ rowNumber: row.rowNumber, field: "percentage", code: "INVALID_PERCENTAGE", message: "Percentage must be between 0 and 100.", rawRow: row.raw }); valid = false; }
    if (row.rawGrade && score === null) { errors.push({ rowNumber: row.rowNumber, field: "grade", code: "UNRECOGNIZED_GRADE", message: "Grade cannot be normalized to a numeric score.", rawRow: row.raw }); valid = false; }

    let hasAttempt = false;
    for (let index = 0; index < row.attempts.length; index += 1) {
      const attempt = row.attempts[index];
      const hasAny = attempt.percentage !== null || Boolean(attempt.rawGrade) || Boolean(attempt.rawStatus);
      if (!hasAny) continue;
      hasAttempt = true;
      if (attempt.percentage !== null && attempt.percentage !== undefined && (attempt.percentage < 0 || attempt.percentage > 100)) { errors.push({ rowNumber: row.rowNumber, field: `attempt${index + 1}Percentage`, code: "INVALID_ATTEMPT_PERCENTAGE", message: "Attempt percentage must be between 0 and 100.", rawRow: row.raw }); valid = false; }
      if (attempt.rawGrade && normalizedScoreFromSource(attempt.percentage, attempt.rawGrade) === null) { errors.push({ rowNumber: row.rowNumber, field: `attempt${index + 1}Grade`, code: "UNRECOGNIZED_ATTEMPT_GRADE", message: "Attempt grade cannot be normalized.", rawRow: row.raw }); valid = false; }
    }
    if (Object.keys(row.raw).some(key => /attempt[_ ]?4/i.test(key))) { errors.push({ rowNumber: row.rowNumber, code: "ATTEMPT_LIMIT", message: "At most three attempts are supported.", rawRow: row.raw }); valid = false; }
    if (valid) validRows.push(row);
  }

  return { validRows, errors, summary: { totalRows: rows.length, validRows: validRows.length, errorRows: errors.length } };
}

export function normalizedAttempt(attempt: { percentage?: number | null; rawGrade?: string | null; rawStatus?: string | null }) {
  return {
    rawGrade: attempt.rawGrade ?? null,
    rawStatus: attempt.rawStatus ?? null,
    percentage: attempt.percentage ?? null,
    normalizedScore: normalizedScoreFromSource(attempt.percentage, attempt.rawGrade),
    normalizedResult: normalizeResult(attempt.rawGrade, attempt.rawStatus) as NormalizedResult,
  };
}

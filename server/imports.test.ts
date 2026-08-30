import { describe, expect, it } from "vitest";
import { normalizeImportRows, validateImportRows } from "../shared/imports";

describe("result import validation", () => {
  it("normalizes common source column aliases", () => {
    const rows = normalizeImportRows([{ "Student ID": "SP-001", "Subject Code": "ANAT-01", Percentage: "88,5", Grade: "B" }]);
    expect(rows[0]).toMatchObject({ studentId: "SP-001", subjectCode: "ANAT-01", percentage: 88.5, rawGrade: "B" });
  });

  it("rejects unknown records, duplicates, and invalid scores", () => {
    const rows = normalizeImportRows([
      { studentId: "SP-404", subjectCode: "ANAT-01", percentage: 120 },
      { studentId: "SP-001", subjectCode: "ANAT-01", percentage: 80 },
      { studentId: "SP-001", subjectCode: "ANAT-01", percentage: 80 },
    ]);
    const result = validateImportRows(rows, { knownStudents: new Set(["SP-001"]), knownOfferings: new Set(["ANAT-01"]) });
    expect(result.summary.totalRows).toBe(3);
    expect(result.summary.validRows).toBe(1);
    expect(result.errors.map(error => error.code)).toEqual(expect.arrayContaining(["UNKNOWN_STUDENT", "INVALID_PERCENTAGE", "DUPLICATE_ROW"]));
  });

  it("rejects a fourth attempt field", () => {
    const rows = normalizeImportRows([{ studentId: "SP-001", subjectCode: "ANAT-01", attempt4Grade: "A" }]);
    const result = validateImportRows(rows, { knownStudents: new Set(["SP-001"]), knownOfferings: new Set(["ANAT-01"]) });
    expect(result.errors.map(error => error.code)).toContain("ATTEMPT_LIMIT");
  });

  it("keeps a clean row eligible for confirmation", () => {
    const rows = normalizeImportRows([{ studentId: "SP-001", subjectCode: "ANAT-01", percentage: 88, attempt1Percentage: 88 }]);
    const result = validateImportRows(rows, { knownStudents: new Set(["SP-001"]), knownOfferings: new Set(["ANAT-01"]) });
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});

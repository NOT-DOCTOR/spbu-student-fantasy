import { describe, expect, it } from "vitest";
import { createStudentInput, studentSearchInput, updateStudentInput } from "../shared/studentAdmin";
import { requireAdmin } from "./access";

describe("student administration authorization", () => {
  it("rejects an unauthenticated context", () => {
    expect(() => requireAdmin({ user: undefined } as never)).toThrow("ADMIN authorization is required.");
  });

  it("rejects a student session", () => {
    expect(() => requireAdmin({ user: { id: 7, role: "user" } } as never)).toThrow("ADMIN authorization is required.");
  });

  it("accepts an administrator session", () => {
    expect(requireAdmin({ user: { id: 1, role: "admin" } } as never)).toMatchObject({ id: 1, role: "admin" });
  });
});

describe("student administration input contracts", () => {
  it("trims and defaults a valid create payload", () => {
    expect(createStudentInput.parse({ studentId: "  SP-001 ", fullName: "  A Student  ", facultyId: 1, programId: 2, cohortId: 3 })).toMatchObject({ studentId: "SP-001", fullName: "A Student", status: "active" });
  });

  it("rejects invalid identifiers and unsupported statuses", () => {
    expect(() => createStudentInput.parse({ studentId: "", fullName: "Name", facultyId: 1, programId: 2, cohortId: 3 })).toThrow();
    expect(() => updateStudentInput.parse({ id: 1, studentId: "SP-001", fullName: "Name", facultyId: 1, programId: 2, cohortId: 3, status: "pending" })).toThrow();
  });

  it("accepts graduated as an explicit archival status", () => {
    expect(updateStudentInput.parse({ id: 1, studentId: "SP-001", fullName: "Name", facultyId: 1, programId: 2, cohortId: 3, currentSemesterId: null, status: "graduated" }).status).toBe("graduated");
  });

  it("accepts bounded search filters only", () => {
    expect(studentSearchInput.parse({ search: "  SP-001  ", status: "disabled" })).toEqual({ search: "SP-001", status: "disabled" });
    expect(() => studentSearchInput.parse({ search: "x".repeat(121) })).toThrow();
  });
});

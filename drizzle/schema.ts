import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

const id = () => int("id").autoincrement().primaryKey();
const createdAt = () => timestamp("createdAt").defaultNow().notNull();
const updatedAt = () => timestamp("updatedAt").defaultNow().onUpdateNow().notNull();

export const users = mysqlTable("users", {
  id: id(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const faculties = mysqlTable("faculties", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const programs = mysqlTable("programs", {
  id: id(),
  facultyId: int("facultyId").notNull().references(() => faculties.id),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({ facultyIdx: index("programs_faculty_idx").on(table.facultyId) }));

export const academicYears = mysqlTable("academic_years", {
  id: id(),
  label: varchar("label", { length: 32 }).notNull().unique(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: createdAt(),
});

export const cohorts = mysqlTable("cohorts", {
  id: id(),
  programId: int("programId").notNull().references(() => programs.id),
  academicYearId: int("academicYearId").references(() => academicYears.id),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({ programIdx: index("cohorts_program_idx").on(table.programId) }));

export const semesters = mysqlTable("semesters", {
  id: id(),
  academicYearId: int("academicYearId").references(() => academicYears.id),
  number: int("number").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["draft", "published", "locked"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({ uniqueSemester: unique("semesters_year_number_unique").on(table.academicYearId, table.number) }));

export const students = mysqlTable("students", {
  id: id(),
  studentId: varchar("studentId", { length: 64 }).notNull().unique(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  facultyId: int("facultyId").notNull().references(() => faculties.id),
  programId: int("programId").notNull().references(() => programs.id),
  cohortId: int("cohortId").notNull().references(() => cohorts.id),
  currentSemesterId: int("currentSemesterId").references(() => semesters.id),
  status: mysqlEnum("status", ["active", "disabled", "graduated"]).default("active").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({ cohortIdx: index("students_cohort_idx").on(table.cohortId) }));

export const studentAccounts = mysqlTable("student_accounts", {
  id: id(),
  studentId: int("studentId").notNull().unique().references(() => students.id),
  userId: int("userId").notNull().unique().references(() => users.id),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "revoked"]).default("pending").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const subjects = mysqlTable("subjects", {
  id: id(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  subjectType: mysqlEnum("subjectType", ["EXAM", "PASS_FAIL"]).notNull(),
  credits: decimal("credits", { precision: 6, scale: 2 }),
  defaultWeight: decimal("defaultWeight", { precision: 8, scale: 4 }),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const subjectOfferings = mysqlTable("subject_offerings", {
  id: id(),
  subjectId: int("subjectId").notNull().references(() => subjects.id),
  cohortId: int("cohortId").notNull().references(() => cohorts.id),
  semesterId: int("semesterId").notNull().references(() => semesters.id),
  subjectTypeOverride: mysqlEnum("subjectTypeOverride", ["EXAM", "PASS_FAIL"]),
  creditsOverride: decimal("creditsOverride", { precision: 6, scale: 2 }),
  published: boolean("published").default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({ offeringUnique: unique("subject_offerings_unique").on(table.subjectId, table.cohortId, table.semesterId) }));

export const imports = mysqlTable("imports", {
  id: id(),
  cohortId: int("cohortId").notNull().references(() => cohorts.id),
  semesterId: int("semesterId").notNull().references(() => semesters.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl"),
  fileType: varchar("fileType", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["uploaded", "validated", "review", "confirmed", "published", "rejected"]).default("uploaded").notNull(),
  totalRows: int("totalRows").default(0).notNull(),
  validRows: int("validRows").default(0).notNull(),
  errorRows: int("errorRows").default(0).notNull(),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const results = mysqlTable("results", {
  id: id(),
  importId: int("importId").references(() => imports.id),
  studentId: int("studentId").notNull().references(() => students.id),
  subjectOfferingId: int("subjectOfferingId").notNull().references(() => subjectOfferings.id),
  rawGrade: varchar("rawGrade", { length: 64 }),
  rawStatus: varchar("rawStatus", { length: 64 }),
  percentage: decimal("percentage", { precision: 6, scale: 2 }),
  normalizedScore: decimal("normalizedScore", { precision: 8, scale: 4 }),
  normalizedResult: mysqlEnum("normalizedResult", ["PASS", "FAIL", "PENDING", "NOT_TAKEN"]),
  published: boolean("published").default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({ resultUnique: unique("results_student_offering_unique").on(table.studentId, table.subjectOfferingId) }));

export const attempts = mysqlTable("attempts", {
  id: id(),
  resultId: int("resultId").notNull().references(() => results.id),
  attemptNumber: int("attemptNumber").notNull(),
  rawGrade: varchar("rawGrade", { length: 64 }),
  rawStatus: varchar("rawStatus", { length: 64 }),
  percentage: decimal("percentage", { precision: 6, scale: 2 }),
  normalizedScore: decimal("normalizedScore", { precision: 8, scale: 4 }),
  normalizedResult: mysqlEnum("normalizedResult", ["PASS", "FAIL", "PENDING", "NOT_TAKEN"]).notNull(),
  createdAt: createdAt(),
}, table => ({ attemptUnique: unique("attempts_result_number_unique").on(table.resultId, table.attemptNumber) }));

export const scoringConfigs = mysqlTable("scoring_configs", {
  id: id(),
  version: varchar("version", { length: 64 }).notNull().unique(),
  examWeight: decimal("examWeight", { precision: 8, scale: 4 }).default("1").notNull(),
  passFailWeight: decimal("passFailWeight", { precision: 8, scale: 4 }).default("1").notNull(),
  creditWeightEnabled: boolean("creditWeightEnabled").default(false).notNull(),
  improvementWeight: decimal("improvementWeight", { precision: 8, scale: 4 }).default("0").notNull(),
  consistencyWeight: decimal("consistencyWeight", { precision: 8, scale: 4 }).default("0").notNull(),
  firstAttemptWeight: decimal("firstAttemptWeight", { precision: 8, scale: 4 }).default("0").notNull(),
  recentFormWeight: decimal("recentFormWeight", { precision: 8, scale: 4 }).default("0").notNull(),
  tieBreakOrder: text("tieBreakOrder").notNull(),
  active: boolean("active").default(false).notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: createdAt(),
});

export const academicScores = mysqlTable("academic_scores", {
  id: id(),
  studentId: int("studentId").notNull().references(() => students.id),
  semesterId: int("semesterId").notNull().references(() => semesters.id),
  scoringConfigId: int("scoringConfigId").notNull().references(() => scoringConfigs.id),
  score: decimal("score", { precision: 10, scale: 4 }).notNull(),
  percentile: decimal("percentile", { precision: 8, scale: 4 }),
  explanation: text("explanation"),
  createdAt: createdAt(),
}, table => ({ scoreUnique: unique("academic_scores_unique").on(table.studentId, table.semesterId, table.scoringConfigId) }));

export const fantasyScores = mysqlTable("fantasy_scores", {
  id: id(),
  studentId: int("studentId").notNull().references(() => students.id),
  semesterId: int("semesterId").notNull().references(() => semesters.id),
  scoringConfigId: int("scoringConfigId").notNull().references(() => scoringConfigs.id),
  score: decimal("score", { precision: 10, scale: 4 }).notNull(),
  metrics: text("metrics").notNull(),
  explanation: text("explanation"),
  createdAt: createdAt(),
}, table => ({ scoreUnique: unique("fantasy_scores_unique").on(table.studentId, table.semesterId, table.scoringConfigId) }));

export const rankings = mysqlTable("rankings", {
  id: id(),
  cohortId: int("cohortId").notNull().references(() => cohorts.id),
  semesterId: int("semesterId").notNull().references(() => semesters.id),
  scoringConfigId: int("scoringConfigId").notNull().references(() => scoringConfigs.id),
  rankingType: mysqlEnum("rankingType", ["ACADEMIC", "FANTASY", "IMPROVEMENT", "RECENT_FORM", "CONSISTENCY", "SUBJECT"]).notNull(),
  studentId: int("studentId").notNull().references(() => students.id),
  rank: int("rank").notNull(),
  score: decimal("score", { precision: 10, scale: 4 }).notNull(),
  previousRank: int("previousRank"),
  explanation: text("explanation"),
  published: boolean("published").default(false).notNull(),
  locked: boolean("locked").default(false).notNull(),
  createdAt: createdAt(),
}, table => ({ rankingIdx: index("rankings_lookup_idx").on(table.cohortId, table.semesterId, table.rankingType, table.rank) }));

export const achievements = mysqlTable("achievements", {
  id: id(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  ruleConfig: text("ruleConfig").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
});

export const studentAchievements = mysqlTable("student_achievements", {
  id: id(),
  studentId: int("studentId").notNull().references(() => students.id),
  achievementId: int("achievementId").notNull().references(() => achievements.id),
  semesterId: int("semesterId").references(() => semesters.id),
  awardedAt: timestamp("awardedAt").defaultNow().notNull(),
}, table => ({ achievementUnique: unique("student_achievements_unique").on(table.studentId, table.achievementId, table.semesterId) }));

export const aiAnalyses = mysqlTable("ai_analyses", {
  id: id(),
  studentId: int("studentId").notNull().references(() => students.id),
  semesterId: int("semesterId").references(() => semesters.id),
  importId: int("importId").references(() => imports.id),
  payload: text("payload").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const privacySettings = mysqlTable("privacy_settings", {
  id: id(),
  studentId: int("studentId").notNull().unique().references(() => students.id),
  privateMode: boolean("privateMode").default(false).notNull(),
  showProfile: boolean("showProfile").default(true).notNull(),
  showRank: boolean("showRank").default(true).notNull(),
  showSubjectStats: boolean("showSubjectStats").default(true).notNull(),
  updatedAt: updatedAt(),
});

export const importErrors = mysqlTable("import_errors", {
  id: id(),
  importId: int("importId").notNull().references(() => imports.id),
  rowNumber: int("rowNumber"),
  field: varchar("field", { length: 80 }),
  code: varchar("code", { length: 80 }).notNull(),
  message: text("message").notNull(),
  rawRow: text("rawRow"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: createdAt(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: id(),
  actorUserId: int("actorUserId").notNull().references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: createdAt(),
}, table => ({ auditIdx: index("audit_logs_entity_idx").on(table.entity, table.entityId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type Result = typeof results.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type ScoringConfig = typeof scoringConfigs.$inferSelect;

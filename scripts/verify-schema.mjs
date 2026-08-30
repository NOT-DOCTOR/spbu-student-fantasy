import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createConnection } from "mysql2/promise";

const expectedTables = ["users", "faculties", "programs", "academic_years", "cohorts", "semesters", "students", "student_accounts", "subjects", "subject_offerings", "imports", "results", "attempts", "scoring_configs", "academic_scores", "fantasy_scores", "rankings", "achievements", "student_achievements", "ai_analyses", "privacy_settings", "import_errors", "audit_logs"];
const drizzleDir = new URL("../drizzle/", import.meta.url);
const journalMeta = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
const migrationNames = (await readdir(drizzleDir)).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort();
const migrationSources = await Promise.all(migrationNames.map(async name => ({ name, sql: await readFile(new URL(`../drizzle/${name}`, import.meta.url), "utf8") })));
const expectedHashes = migrationSources.map(({ sql }, index) => ({ created_at: String(journalMeta.entries[index]?.when), hash: createHash("sha256").update(sql).digest("hex") }));

function uniqueSorted(items) { return [...new Set(items)].sort(); }
function parseMigrationDefinitions(sql) {
  const foreignKeys = [];
  const indexes = [];
  for (const match of sql.matchAll(/CREATE TABLE `([^`]+)` \(([\s\S]*?)\n\) ENGINE=/g)) {
    const table = match[1];
    const body = match[2];
    for (const fk of body.matchAll(/CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)`\s*\(`([^`]+)`\)/g)) {
      foreignKeys.push(`${fk[1]}|${table}|${fk[2]}|${fk[3]}|${fk[4]}`);
      indexes.push(`INDEX|${table}|${fk[1]}|${fk[2]}`);
    }
    const primary = body.match(/PRIMARY KEY \(([^)]+)\)/);
    if (primary) indexes.push(`PRIMARY|${table}|PRIMARY|${primary[1].replaceAll("`", "").replaceAll(" ", "")}`);
    for (const key of body.matchAll(/UNIQUE KEY `([^`]+)` \(([^)]+)\)/g)) indexes.push(`UNIQUE|${table}|${key[1]}|${key[2].replaceAll("`", "").replaceAll(" ", "")}`);
    for (const key of body.matchAll(/KEY `([^`]+)` \(([^)]+)\)/g)) indexes.push(`INDEX|${table}|${key[1]}|${key[2].replaceAll("`", "").replaceAll(" ", "")}`);
  }
  for (const fk of sql.matchAll(/ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)`\s*\(`([^`]+)`\)/g)) {
    foreignKeys.push(`${fk[2]}|${fk[1]}|${fk[3]}|${fk[4]}|${fk[5]}`);
    indexes.push(`INDEX|${fk[1]}|${fk[2]}|${fk[3]}`);
  }
  return { foreignKeys, indexes };
}
const definitions = migrationSources.map(source => parseMigrationDefinitions(source.sql));
const expectedForeignKeys = uniqueSorted(definitions.flatMap(item => item.foreignKeys));
const expectedIndexes = uniqueSorted([
  "INDEX|audit_logs|audit_logs_entity_idx|entity,entityId", "INDEX|cohorts|cohorts_program_idx|programId", "INDEX|programs|programs_faculty_idx|facultyId", "INDEX|rankings|rankings_lookup_idx|cohortId,semesterId,rankingType,rank", "INDEX|students|students_cohort_idx|cohortId",
  ...expectedTables.map(table => `PRIMARY|${table}|PRIMARY|id`),
  "UNIQUE|academic_scores|academic_scores_unique|studentId,semesterId,scoringConfigId", "UNIQUE|academic_years|academic_years_label_unique|label", "UNIQUE|achievements|achievements_code_unique|code", "UNIQUE|attempts|attempts_result_number_unique|resultId,attemptNumber", "UNIQUE|cohorts|cohorts_code_unique|code", "UNIQUE|faculties|faculties_code_unique|code", "UNIQUE|fantasy_scores|fantasy_scores_unique|studentId,semesterId,scoringConfigId", "UNIQUE|privacy_settings|privacy_settings_studentId_unique|studentId", "UNIQUE|programs|programs_code_unique|code", "UNIQUE|results|results_student_offering_unique|studentId,subjectOfferingId", "UNIQUE|scoring_configs|scoring_configs_version_unique|version", "UNIQUE|semesters|semesters_year_number_unique|academicYearId,number", "UNIQUE|student_accounts|student_accounts_studentId_unique|studentId", "UNIQUE|student_accounts|student_accounts_userId_unique|userId", "UNIQUE|student_achievements|student_achievements_unique|studentId,achievementId,semesterId", "UNIQUE|students|students_studentId_unique|studentId", "UNIQUE|subject_offerings|subject_offerings_unique|subjectId,cohortId,semesterId", "UNIQUE|subjects|subjects_code_unique|code", "UNIQUE|users|users_openId_unique|openId"
]);

const connection = await createConnection(process.env.DATABASE_URL);
const [tableRows] = await connection.query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'");
const actualTables = uniqueSorted(tableRows.map(row => row.TABLE_NAME ?? row.table_name).filter(table => expectedTables.includes(table)));
const [foreignKeyRows] = await connection.query("SELECT constraint_name, table_name, column_name, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL ORDER BY table_name, constraint_name, ordinal_position");
const actualForeignKeys = uniqueSorted(foreignKeyRows.map(row => `${row.CONSTRAINT_NAME ?? row.constraint_name}|${row.TABLE_NAME ?? row.table_name}|${row.COLUMN_NAME ?? row.column_name}|${row.REFERENCED_TABLE_NAME ?? row.referenced_table_name}|${row.REFERENCED_COLUMN_NAME ?? row.referenced_column_name}`));
const [indexRows] = await connection.query("SELECT table_name, index_name, non_unique, column_name, seq_in_index FROM information_schema.statistics WHERE table_schema = DATABASE() ORDER BY table_name, index_name, seq_in_index");
const indexGroups = new Map();
for (const row of indexRows) {
  const table = row.TABLE_NAME ?? row.table_name;
  if (!expectedTables.includes(table)) continue;
  const name = row.INDEX_NAME ?? row.index_name;
  if (name.endsWith("_fk")) continue;
  const key = `${table}|${row.NON_UNIQUE ?? row.non_unique}|${name}`;
  const list = indexGroups.get(key) ?? [];
  list.push(`${row.SEQ_IN_INDEX ?? row.seq_in_index}:${row.COLUMN_NAME ?? row.column_name}`);
  indexGroups.set(key, list);
}
const actualIndexes = uniqueSorted([...indexGroups.entries()].map(([key, columns]) => {
  const [table, nonUnique, name] = key.split("|");
  const type = name === "PRIMARY" ? "PRIMARY" : nonUnique === "0" ? "UNIQUE" : "INDEX";
  return `${type}|${table}|${name}|${columns.sort().map(value => value.slice(value.indexOf(":") + 1)).join(",")}`;
}));
const [journalRows] = await connection.query("SELECT created_at, hash FROM __drizzle_migrations ORDER BY created_at");
const actualHashes = journalRows.map(row => ({ created_at: String(row.created_at ?? row.CREATED_AT), hash: row.hash ?? row.HASH }));
const [rankingColumns] = await connection.query("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rankings'");
const rankingHasLock = rankingColumns.some(row => (row.COLUMN_NAME ?? row.column_name) === "locked");
await connection.end();
const diff = (expected, actual) => ({ missing: expected.filter(item => !actual.includes(item)), unexpected: actual.filter(item => !expected.includes(item)) });
const result = { ok: expectedTables.every(table => actualTables.includes(table)) && rankingHasLock && JSON.stringify(diff(expectedForeignKeys, actualForeignKeys)) === JSON.stringify({ missing: [], unexpected: [] }) && JSON.stringify(diff(expectedIndexes, actualIndexes)) === JSON.stringify({ missing: [], unexpected: [] }) && JSON.stringify(expectedHashes) === JSON.stringify(actualHashes), missingTables: expectedTables.filter(table => !actualTables.includes(table)), rankingHasLock, foreignKeys: diff(expectedForeignKeys, actualForeignKeys), indexes: diff(expectedIndexes, actualIndexes), migrations: { expected: expectedHashes, actual: actualHashes } };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

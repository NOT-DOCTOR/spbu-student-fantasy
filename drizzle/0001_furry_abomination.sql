CREATE TABLE `academic_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`semesterId` int NOT NULL,
	`scoringConfigId` int NOT NULL,
	`score` decimal(10,4) NOT NULL,
	`percentile` decimal(8,4),
	`explanation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academic_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_scores_unique` UNIQUE(`studentId`,`semesterId`,`scoringConfigId`)
);
--> statement-breakpoint
CREATE TABLE `academic_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(32) NOT NULL,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academic_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_years_label_unique` UNIQUE(`label`)
);
--> statement-breakpoint
CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`ruleConfig` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievements_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `ai_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`semesterId` int,
	`importId` int,
	`payload` text NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resultId` int NOT NULL,
	`attemptNumber` int NOT NULL,
	`rawGrade` varchar(64),
	`rawStatus` varchar(64),
	`percentage` decimal(6,2),
	`normalizedScore` decimal(8,4),
	`normalizedResult` enum('PASS','FAIL','PENDING','NOT_TAKEN') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `attempts_result_number_unique` UNIQUE(`resultId`,`attemptNumber`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(120) NOT NULL,
	`entity` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cohorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`academicYearId` int,
	`name` varchar(160) NOT NULL,
	`code` varchar(64) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cohorts_id` PRIMARY KEY(`id`),
	CONSTRAINT `cohorts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `faculties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(32) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faculties_id` PRIMARY KEY(`id`),
	CONSTRAINT `faculties_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `fantasy_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`semesterId` int NOT NULL,
	`scoringConfigId` int NOT NULL,
	`score` decimal(10,4) NOT NULL,
	`metrics` text NOT NULL,
	`explanation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fantasy_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `fantasy_scores_unique` UNIQUE(`studentId`,`semesterId`,`scoringConfigId`)
);
--> statement-breakpoint
CREATE TABLE `import_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` int NOT NULL,
	`rowNumber` int,
	`field` varchar(80),
	`code` varchar(80) NOT NULL,
	`message` text NOT NULL,
	`rawRow` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cohortId` int NOT NULL,
	`semesterId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text,
	`fileType` varchar(80) NOT NULL,
	`status` enum('uploaded','validated','review','confirmed','published','rejected') NOT NULL DEFAULT 'uploaded',
	`totalRows` int NOT NULL DEFAULT 0,
	`validRows` int NOT NULL DEFAULT 0,
	`errorRows` int NOT NULL DEFAULT 0,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `privacy_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`privateMode` boolean NOT NULL DEFAULT false,
	`showProfile` boolean NOT NULL DEFAULT true,
	`showRank` boolean NOT NULL DEFAULT true,
	`showSubjectStats` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `privacy_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `privacy_settings_studentId_unique` UNIQUE(`studentId`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facultyId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(32) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `programs_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cohortId` int NOT NULL,
	`semesterId` int NOT NULL,
	`scoringConfigId` int NOT NULL,
	`rankingType` enum('ACADEMIC','FANTASY','IMPROVEMENT','RECENT_FORM','CONSISTENCY','SUBJECT') NOT NULL,
	`studentId` int NOT NULL,
	`rank` int NOT NULL,
	`score` decimal(10,4) NOT NULL,
	`previousRank` int,
	`explanation` text,
	`published` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rankings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` int,
	`studentId` int NOT NULL,
	`subjectOfferingId` int NOT NULL,
	`rawGrade` varchar(64),
	`rawStatus` varchar(64),
	`percentage` decimal(6,2),
	`normalizedScore` decimal(8,4),
	`normalizedResult` enum('PASS','FAIL','PENDING','NOT_TAKEN'),
	`published` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `results_id` PRIMARY KEY(`id`),
	CONSTRAINT `results_student_offering_unique` UNIQUE(`studentId`,`subjectOfferingId`)
);
--> statement-breakpoint
CREATE TABLE `scoring_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(64) NOT NULL,
	`examWeight` decimal(8,4) NOT NULL DEFAULT '1',
	`passFailWeight` decimal(8,4) NOT NULL DEFAULT '1',
	`creditWeightEnabled` boolean NOT NULL DEFAULT false,
	`improvementWeight` decimal(8,4) NOT NULL DEFAULT '0',
	`consistencyWeight` decimal(8,4) NOT NULL DEFAULT '0',
	`firstAttemptWeight` decimal(8,4) NOT NULL DEFAULT '0',
	`recentFormWeight` decimal(8,4) NOT NULL DEFAULT '0',
	`tieBreakOrder` text NOT NULL,
	`active` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scoring_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scoring_configs_version_unique` UNIQUE(`version`)
);
--> statement-breakpoint
CREATE TABLE `semesters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int,
	`number` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`status` enum('draft','published','locked') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `semesters_id` PRIMARY KEY(`id`),
	CONSTRAINT `semesters_year_number_unique` UNIQUE(`academicYearId`,`number`)
);
--> statement-breakpoint
CREATE TABLE `student_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`userId` int NOT NULL,
	`verificationStatus` enum('pending','verified','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_accounts_studentId_unique` UNIQUE(`studentId`),
	CONSTRAINT `student_accounts_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `student_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`achievementId` int NOT NULL,
	`semesterId` int,
	`awardedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_achievements_unique` UNIQUE(`studentId`,`achievementId`,`semesterId`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` varchar(64) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`facultyId` int NOT NULL,
	`programId` int NOT NULL,
	`cohortId` int NOT NULL,
	`currentSemesterId` int,
	`status` enum('active','disabled','graduated') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_studentId_unique` UNIQUE(`studentId`)
);
--> statement-breakpoint
CREATE TABLE `subject_offerings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`cohortId` int NOT NULL,
	`semesterId` int NOT NULL,
	`subjectTypeOverride` enum('EXAM','PASS_FAIL'),
	`creditsOverride` decimal(6,2),
	`published` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subject_offerings_id` PRIMARY KEY(`id`),
	CONSTRAINT `subject_offerings_unique` UNIQUE(`subjectId`,`cohortId`,`semesterId`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(180) NOT NULL,
	`subjectType` enum('EXAM','PASS_FAIL') NOT NULL,
	`credits` decimal(6,2),
	`defaultWeight` decimal(8,4),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `academic_scores` ADD CONSTRAINT `academic_scores_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `academic_scores` ADD CONSTRAINT `academic_scores_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `academic_scores` ADD CONSTRAINT `academic_scores_scoringConfigId_scoring_configs_id_fk` FOREIGN KEY (`scoringConfigId`) REFERENCES `scoring_configs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_analyses` ADD CONSTRAINT `ai_analyses_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_analyses` ADD CONSTRAINT `ai_analyses_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_analyses` ADD CONSTRAINT `ai_analyses_importId_imports_id_fk` FOREIGN KEY (`importId`) REFERENCES `imports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_analyses` ADD CONSTRAINT `ai_analyses_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_resultId_results_id_fk` FOREIGN KEY (`resultId`) REFERENCES `results`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cohorts` ADD CONSTRAINT `cohorts_programId_programs_id_fk` FOREIGN KEY (`programId`) REFERENCES `programs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cohorts` ADD CONSTRAINT `cohorts_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_scores` ADD CONSTRAINT `fantasy_scores_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_scores` ADD CONSTRAINT `fantasy_scores_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fantasy_scores` ADD CONSTRAINT `fantasy_scores_scoringConfigId_scoring_configs_id_fk` FOREIGN KEY (`scoringConfigId`) REFERENCES `scoring_configs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_errors` ADD CONSTRAINT `import_errors_importId_imports_id_fk` FOREIGN KEY (`importId`) REFERENCES `imports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imports` ADD CONSTRAINT `imports_cohortId_cohorts_id_fk` FOREIGN KEY (`cohortId`) REFERENCES `cohorts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imports` ADD CONSTRAINT `imports_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imports` ADD CONSTRAINT `imports_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `privacy_settings` ADD CONSTRAINT `privacy_settings_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `programs` ADD CONSTRAINT `programs_facultyId_faculties_id_fk` FOREIGN KEY (`facultyId`) REFERENCES `faculties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rankings` ADD CONSTRAINT `rankings_cohortId_cohorts_id_fk` FOREIGN KEY (`cohortId`) REFERENCES `cohorts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rankings` ADD CONSTRAINT `rankings_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rankings` ADD CONSTRAINT `rankings_scoringConfigId_scoring_configs_id_fk` FOREIGN KEY (`scoringConfigId`) REFERENCES `scoring_configs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rankings` ADD CONSTRAINT `rankings_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_importId_imports_id_fk` FOREIGN KEY (`importId`) REFERENCES `imports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_subjectOfferingId_subject_offerings_id_fk` FOREIGN KEY (`subjectOfferingId`) REFERENCES `subject_offerings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoring_configs` ADD CONSTRAINT `scoring_configs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `semesters` ADD CONSTRAINT `semesters_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_accounts` ADD CONSTRAINT `student_accounts_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_accounts` ADD CONSTRAINT `student_accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_achievements` ADD CONSTRAINT `student_achievements_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_achievements` ADD CONSTRAINT `student_achievements_achievementId_achievements_id_fk` FOREIGN KEY (`achievementId`) REFERENCES `achievements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_achievements` ADD CONSTRAINT `student_achievements_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_facultyId_faculties_id_fk` FOREIGN KEY (`facultyId`) REFERENCES `faculties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_programId_programs_id_fk` FOREIGN KEY (`programId`) REFERENCES `programs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_cohortId_cohorts_id_fk` FOREIGN KEY (`cohortId`) REFERENCES `cohorts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_currentSemesterId_semesters_id_fk` FOREIGN KEY (`currentSemesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subject_offerings` ADD CONSTRAINT `subject_offerings_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subject_offerings` ADD CONSTRAINT `subject_offerings_cohortId_cohorts_id_fk` FOREIGN KEY (`cohortId`) REFERENCES `cohorts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subject_offerings` ADD CONSTRAINT `subject_offerings_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity`,`entityId`);--> statement-breakpoint
CREATE INDEX `cohorts_program_idx` ON `cohorts` (`programId`);--> statement-breakpoint
CREATE INDEX `programs_faculty_idx` ON `programs` (`facultyId`);--> statement-breakpoint
CREATE INDEX `rankings_lookup_idx` ON `rankings` (`cohortId`,`semesterId`,`rankingType`,`rank`);--> statement-breakpoint
CREATE INDEX `students_cohort_idx` ON `students` (`cohortId`);
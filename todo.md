# Project TODO

- [x] Document the approved SPBU Student Fantasy requirements and implementation assumptions
- [x] Map the existing template structure and reusable components
- [x] Design scalable tables for faculties, programs, cohorts, students, semesters, subjects, offerings, results, attempts, scores, rankings, achievements, AI analyses, imports, errors, privacy, scoring configurations, and audit logs
- [x] Generate and apply the database schema migration safely
- [x] Add server-side STUDENT and ADMIN authorization helpers
- [x] Add privacy visibility and private-mode enforcement to academic data procedures
- [x] Implement grade/status normalization while preserving raw imported values
- [x] Implement deterministic academic scoring with configurable subject weights and optional credit weighting
- [x] Implement explainable fantasy scoring with configurable factors
- [x] Implement configurable deterministic tie-breaking and versioned ranking snapshots
- [x] Implement rule-based achievement evaluation
- [x] Implement CSV/XLSX import parsing and import metadata storage
- [x] Implement import validation for duplicates, unknown records, invalid values, attempts, subjects, semesters, and missing classifications
- [x] Implement import review, confirmation, publishing, and unpublishing workflow
- [x] Implement audit logging for sensitive administrative actions
- [x] Build the premium cyberpunk SPBU-branded landing page
- [x] Build the authenticated student dashboard with score, rank, movement, trends, form, subjects, achievements, and AI analysis
- [x] Build permission-aware leaderboards and subject analytics
- [x] Build student profile views with privacy-aware visibility
- [x] Complete admin management for subjects, semesters, student-account linking/verification, and end-to-end import publication controls; full student CRUD remains out of scope
- [x] Implement structured pre-generated AI analysis upload, validation, publishing, replacement, and rendering
- [x] Add responsive mobile, tablet, and desktop layouts
- [x] Add Vitest coverage for normalization, scoring, ranking, privacy, validation, and authorization behavior
- [x] Run type checks, tests, production build, and visual preview verification
- [x] Save the completed first project checkpoint
- [x] Deliver the project version and implementation summary

## Decisions intentionally kept configurable

- [x] Exact EXAM versus PASS/FAIL weighting
- [x] Whether credits affect scoring
- [x] Fantasy Score formula factors and weights
- [x] Attempt weighting — explicitly no attempt-count modifier in the initial release
- [x] Tie-breaking policy details
- [x] Student verification mechanism
- [x] Privacy visibility policy
- [x] Document and visibly confirm the provisional SPBU//FANTASY branding state used by the first release

## Out of scope for the first implementation

- [x] Keep payments or premium monetization out of the first implementation
- [x] Keep live AI generation out of the first implementation
- [x] Keep public unauthenticated academic data out of the first implementation
- [x] Add explicit governance/moderation evidence for uploaded AI analyses and prohibit fabricated academic/user-generated content
- [x] Keep automatic publication of imported academic data out of the first implementation
- [x] Add release-scope enforcement/documentation for unsupported future-faculty source data

## Evidence log

- Requirements source: /home/ubuntu/upload/SPBU_Student_Fantasy_Project_Spec.md
- Concise requirements source: /home/ubuntu/upload/pasted_content.txt
- Project scaffold: /home/ubuntu/spbu-student-fantasy
- Initial checkpoint: a072c91e
- Initial implementation begins after this checklist is recorded.

- [x] Reconcile Drizzle migration state with the live database after the interrupted migration application
- [x] Verify all expected tables, foreign keys, indexes, and migration records match drizzle/schema.ts
- [x] Document a repeatable schema verification step to prevent partial or duplicate migrations
- [x] Implement ranking snapshot generation and persistence using a selected scoring configuration, including publish and lock semantics
- [x] Add tests for ranking snapshot versioning, deterministic ordering, and publication boundaries
- [x] Add an exact schema verification script comparing expected tables, foreign keys, constraints, indexes, and migration hashes with the live database
- [x] Document the migration recovery and validation procedure so the Drizzle ledger remains trustworthy

- [x] Reapply the authenticated student dashboard wiring and published result analytics after checkpoint recovery
- [x] Reapply permission-aware leaderboard, subject analytics, and peer-profile routes after checkpoint recovery
- [x] Reapply admin catalog, cohort management, and student-account linking workflows after checkpoint recovery
- [x] Reapply structured AI analysis listing, publish, replace, archive, and student rendering after checkpoint recovery
- [x] Re-run security tests, production build, and responsive previews after recovery changes

- [x] مراجعة موقع SPBU الرسمي وتوثيق الهوية المرئية والأصول المرجعية المتاحة علنًا؛ لم تُثبت صلاحية استخدام الشعار الرسمي أو وجود دليل ألوان رسمي منشور
- [x] توثيق قرار هوية SPBU//FANTASY المستوحاة من SPBU وتطبيق نظام accent مؤسسي مستوحى، دون ادعاء أنه palette رسمي
- [x] تنفيذ سجل طلاب إداري جزئي: بحث وإنشاء وتعديل الحالة مع حماية admin وتدقيق؛ يبقى محرر الحقول الكامل وسياسة الأرشفة/الحذف قرارًا لاحقًا
- [ ] تجهيز مسار بيانات مؤسسية حقيقية مع معاينة واستيراد آمنين قبل النشر
- [ ] تنفيذ التحقق النهائي وحفظ نسخة جديدة قبل ربط الدومين
- [ ] الحصول على مصدر رسمي معتمد للـ SPBU palette أو اعتماد نطاق SPBU-inspired فقط دون استخدام الشعار الرسمي
- [x] إضافة اختبارات لعقود مدخلات الطلاب والبحث وحدود صلاحية admin؛ اختبارات الإجراءات الفعلية، NOT_FOUND، انتقالات الحالة، وتدقيق قاعدة البيانات ما زالت معلّقة حتى تجهيز fixtures تكاملية
- [ ] تحديد وإكمال محرر حقول الطالب وسياسة الأرشفة بدل الحذف النهائي
- [x] إضافة إجراءات admin لبحث الطلاب وإنشاء الطالب وتحديث بياناته وتغيير حالته مع تسجيل التدقيق
- [x] إضافة اختبار Vitest لحدود صلاحية إدارة الطلاب؛ تغطية قيود CRUD التفصيلية والتدقيق تستكمل قبل اعتماد CRUD الكامل
- [x] إضافة واجهة سجل الطلاب الإداري للبحث والإنشاء وتفعيل/تعطيل السجل

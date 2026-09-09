<?php
declare(strict_types=1);

function positive_int(mixed $value, string $field): int {
    if (is_int($value)) $number = $value;
    elseif (is_string($value) && ctype_digit($value)) $number = (int)$value;
    else $number = 0;
    if ($number <= 0) json_response(['error' => $field . ' must be a positive integer'], 400);
    return $number;
}

function required_text(mixed $value, string $field, int $max): string {
    if (!is_string($value)) json_response(['error' => $field . ' is required'], 400);
    $text = trim($value);
    if ($text === '' || mb_strlen($text) > $max) json_response(['error' => $field . ' is invalid'], 400);
    return $text;
}

function enum_value(mixed $value, string $field, array $allowed): string {
    if (!is_string($value) || !in_array($value, $allowed, true)) json_response(['error' => $field . ' is invalid'], 400);
    return $value;
}

function audit_admin(PDO $pdo, int $actorId, string $action, string $entity, string $entityId, ?string $oldValue, ?string $newValue): void {
    $stmt = $pdo->prepare('INSERT INTO audit_logs (actorUserId, action, entity, entityId, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$actorId, $action, $entity, $entityId, $oldValue, $newValue]);
}

function admin_catalog(array $config, PDO $pdo): never {
    require_method('GET');
    require_admin($config, $pdo);
    $queries = [
        'programs' => 'SELECT id, code, name FROM programs ORDER BY name',
        'cohorts' => 'SELECT id, code, name FROM cohorts ORDER BY name',
        'semesters' => 'SELECT id, number, name FROM semesters ORDER BY number',
        'subjects' => 'SELECT id, code, name, subjectType, credits FROM subjects ORDER BY code',
        'students' => 'SELECT id, studentId, fullName, status FROM students ORDER BY fullName LIMIT 500',
        'accountLinks' => 'SELECT studentId, userId, verificationStatus FROM student_accounts ORDER BY studentId',
    ];
    $result = [];
    foreach ($queries as $key => $sql) {
        $result[$key] = $pdo->query($sql)->fetchAll();
    }
    json_response($result);
}

function admin_students(array $config, PDO $pdo): never {
    require_method('GET');
    require_admin($config, $pdo);
    $search = trim((string)($_GET['search'] ?? ''));
    $status = $_GET['status'] ?? null;
    if ($status !== null && $status !== '') enum_value($status, 'status', ['active', 'disabled', 'graduated']);
    if (mb_strlen($search) > 120) json_response(['error' => 'search is too long'], 400);
    $sql = 'SELECT id, studentId, fullName, facultyId, programId, cohortId, currentSemesterId, status, createdAt, updatedAt FROM students';
    $params = [];
    $where = [];
    if ($search !== '') {
        $where[] = '(studentId LIKE ? OR fullName LIKE ?)';
        $params[] = '%' . $search . '%';
        $params[] = '%' . $search . '%';
    }
    if (is_string($status) && $status !== '') {
        $where[] = 'status = ?';
        $params[] = $status;
    }
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY fullName LIMIT 200';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

function admin_create_student(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $studentId = required_text($body['studentId'] ?? null, 'studentId', 64);
    $fullName = required_text($body['fullName'] ?? null, 'fullName', 255);
    $facultyId = positive_int($body['facultyId'] ?? null, 'facultyId');
    $programId = positive_int($body['programId'] ?? null, 'programId');
    $cohortId = positive_int($body['cohortId'] ?? null, 'cohortId');
    $semesterId = array_key_exists('currentSemesterId', $body) && $body['currentSemesterId'] !== null
        ? positive_int($body['currentSemesterId'], 'currentSemesterId') : null;
    $status = enum_value($body['status'] ?? 'active', 'status', ['active', 'disabled', 'graduated']);

    $stmt = $pdo->prepare('INSERT INTO students (studentId, fullName, facultyId, programId, cohortId, currentSemesterId, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$studentId, $fullName, $facultyId, $programId, $cohortId, $semesterId, $status]);
    $id = (int)$pdo->lastInsertId();
    audit_admin($pdo, (int)$admin['id'], 'STUDENT_CREATED', 'students', (string)$id, null, json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['id' => $id]);
}

function admin_update_student(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $id = positive_int($body['id'] ?? null, 'id');
    $stmt = $pdo->prepare('SELECT * FROM students WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $before = $stmt->fetch();
    if (!$before) json_response(['error' => 'Student record not found'], 404);

    $values = [
        required_text($body['studentId'] ?? null, 'studentId', 64),
        required_text($body['fullName'] ?? null, 'fullName', 255),
        positive_int($body['facultyId'] ?? null, 'facultyId'),
        positive_int($body['programId'] ?? null, 'programId'),
        positive_int($body['cohortId'] ?? null, 'cohortId'),
        array_key_exists('currentSemesterId', $body) && $body['currentSemesterId'] !== null ? positive_int($body['currentSemesterId'], 'currentSemesterId') : null,
        enum_value($body['status'] ?? null, 'status', ['active', 'disabled', 'graduated']),
        $id,
    ];
    $update = $pdo->prepare('UPDATE students SET studentId = ?, fullName = ?, facultyId = ?, programId = ?, cohortId = ?, currentSemesterId = ?, status = ? WHERE id = ?');
    $update->execute($values);
    audit_admin($pdo, (int)$admin['id'], 'STUDENT_UPDATED', 'students', (string)$id, json_encode($before, JSON_UNESCAPED_UNICODE), json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['success' => true]);
}

function admin_link_student(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $studentId = positive_int($body['studentId'] ?? null, 'studentId');
    $userId = positive_int($body['userId'] ?? null, 'userId');
    $stmt = $pdo->prepare('INSERT INTO student_accounts (studentId, userId, verificationStatus) VALUES (?, ?, "pending")');
    $stmt->execute([$studentId, $userId]);
    $id = (int)$pdo->lastInsertId();
    audit_admin($pdo, (int)$admin['id'], 'STUDENT_ACCOUNT_LINKED', 'student_accounts', (string)$id, null, json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['id' => $id, 'status' => 'pending']);
}

function admin_verify_student(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $studentId = positive_int($body['studentId'] ?? null, 'studentId');
    $userId = positive_int($body['userId'] ?? null, 'userId');
    $status = enum_value($body['status'] ?? null, 'status', ['pending', 'verified', 'revoked']);
    $stmt = $pdo->prepare('UPDATE student_accounts SET verificationStatus = ? WHERE studentId = ? AND userId = ?');
    $stmt->execute([$status, $studentId, $userId]);
    if ($stmt->rowCount() === 0) json_response(['error' => 'Student account link not found'], 404);
    audit_admin($pdo, (int)$admin['id'], 'STUDENT_VERIFICATION_UPDATED', 'student_accounts', (string)$studentId, null, json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['success' => true]);
}

function admin_create_subject(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $code = required_text($body['code'] ?? null, 'code', 64);
    $name = required_text($body['name'] ?? null, 'name', 180);
    $type = enum_value($body['subjectType'] ?? null, 'subjectType', ['EXAM', 'PASS_FAIL']);
    $credits = array_key_exists('credits', $body) && $body['credits'] !== null ? (float)$body['credits'] : null;
    if ($credits !== null && ($credits < 0 || !is_finite($credits))) json_response(['error' => 'credits is invalid'], 400);
    $stmt = $pdo->prepare('INSERT INTO subjects (code, name, subjectType, credits) VALUES (?, ?, ?, ?)');
    $stmt->execute([$code, $name, $type, $credits]);
    $id = (int)$pdo->lastInsertId();
    audit_admin($pdo, (int)$admin['id'], 'SUBJECT_CREATED', 'subjects', (string)$id, null, json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['id' => $id]);
}

function admin_create_semester(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $name = required_text($body['name'] ?? null, 'name', 100);
    $number = positive_int($body['number'] ?? null, 'number');
    if ($number > 20) json_response(['error' => 'number must be at most 20'], 400);
    $stmt = $pdo->prepare('INSERT INTO semesters (name, number) VALUES (?, ?)');
    $stmt->execute([$name, $number]);
    $id = (int)$pdo->lastInsertId();
    audit_admin($pdo, (int)$admin['id'], 'SEMESTER_CREATED', 'semesters', (string)$id, null, json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['id' => $id]);
}

function admin_create_cohort(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $programId = positive_int($body['programId'] ?? null, 'programId');
    $code = required_text($body['code'] ?? null, 'code', 64);
    $name = required_text($body['name'] ?? null, 'name', 160);
    $stmt = $pdo->prepare('INSERT INTO cohorts (programId, code, name) VALUES (?, ?, ?)');
    $stmt->execute([$programId, $code, $name]);
    $id = (int)$pdo->lastInsertId();
    audit_admin($pdo, (int)$admin['id'], 'COHORT_CREATED', 'cohorts', (string)$id, null, json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['id' => $id]);
}

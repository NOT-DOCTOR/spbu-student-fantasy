<?php
declare(strict_types=1);

function require_verified_student(array $config, PDO $pdo): array {
    $user = require_user($config, $pdo);
    $stmt = $pdo->prepare(
        'SELECT s.*, sa.verificationStatus
         FROM student_accounts sa
         INNER JOIN students s ON s.id = sa.studentId
         WHERE sa.userId = ? AND sa.verificationStatus = "verified"
         LIMIT 1'
    );
    $stmt->execute([(int)$user['id']]);
    $student = $stmt->fetch();
    if (!$student || $student['status'] !== 'active') {
        json_response(['error' => 'A verified active student account is required'], 403);
    }
    return [$user, $student];
}

function academic_me(array $config, PDO $pdo): never {
    require_method('GET');
    [$user, $student] = require_verified_student($config, $pdo);

    $privacyStmt = $pdo->prepare(
        'SELECT privateMode, showProfile, showRank, showSubjectStats
         FROM privacy_settings WHERE studentId = ? LIMIT 1'
    );
    $privacyStmt->execute([(int)$student['id']]);
    $privacy = $privacyStmt->fetch() ?: [
        'privateMode' => 0,
        'showProfile' => 1,
        'showRank' => 1,
        'showSubjectStats' => 1,
    ];

    $resultsStmt = $pdo->prepare(
        'SELECT r.id, r.rawGrade, r.rawStatus, r.percentage, r.normalizedScore,
                r.normalizedResult, so.subjectId, so.semesterId,
                sub.code AS subjectCode, sub.name AS subjectName,
                sem.number AS semesterNumber, sem.name AS semesterName
         FROM results r
         INNER JOIN subject_offerings so ON so.id = r.subjectOfferingId
         INNER JOIN subjects sub ON sub.id = so.subjectId
         INNER JOIN semesters sem ON sem.id = so.semesterId
         WHERE r.studentId = ? AND r.published = 1
         ORDER BY sem.number ASC, sub.code ASC'
    );
    $resultsStmt->execute([(int)$student['id']]);

    $achievementsStmt = $pdo->prepare(
        'SELECT sa.id, sa.awardedAt, a.code, a.name, a.description, sa.semesterId
         FROM student_achievements sa
         INNER JOIN achievements a ON a.id = sa.achievementId
         WHERE sa.studentId = ?
         ORDER BY sa.awardedAt DESC'
    );
    $achievementsStmt->execute([(int)$student['id']]);

    $analysesStmt = $pdo->prepare(
        'SELECT id, semesterId, payload, publishedAt
         FROM ai_analyses WHERE studentId = ? AND status = "published"
         ORDER BY publishedAt DESC'
    );
    $analysesStmt->execute([(int)$student['id']]);

    json_response([
        'role' => ($user['role'] ?? '') === 'admin' ? 'ADMIN' : 'STUDENT',
        'student' => $student,
        'privacy' => $privacy,
        'results' => $resultsStmt->fetchAll(),
        'achievements' => $achievementsStmt->fetchAll(),
        'analyses' => $analysesStmt->fetchAll(),
    ]);
}

function privacy_get(array $config, PDO $pdo): never {
    require_method('GET');
    [, $student] = require_verified_student($config, $pdo);
    $stmt = $pdo->prepare('SELECT studentId, privateMode, showProfile, showRank, showSubjectStats FROM privacy_settings WHERE studentId = ? LIMIT 1');
    $stmt->execute([(int)$student['id']]);
    json_response($stmt->fetch() ?: [
        'studentId' => (int)$student['id'],
        'privateMode' => 0,
        'showProfile' => 1,
        'showRank' => 1,
        'showSubjectStats' => 1,
    ]);
}

function privacy_update(array $config, PDO $pdo): never {
    require_method('POST');
    [$user, $student] = require_verified_student($config, $pdo);
    $body = request_json();
    foreach (['privateMode', 'showProfile', 'showRank', 'showSubjectStats'] as $field) {
        if (!array_key_exists($field, $body) || !is_bool($body[$field])) {
            json_response(['error' => $field . ' must be boolean'], 400);
        }
    }
    $values = [
        $body['privateMode'] ? 1 : 0,
        $body['showProfile'] ? 1 : 0,
        $body['showRank'] ? 1 : 0,
        $body['showSubjectStats'] ? 1 : 0,
    ];
    $stmt = $pdo->prepare(
        'INSERT INTO privacy_settings (studentId, privateMode, showProfile, showRank, showSubjectStats)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE privateMode = VALUES(privateMode), showProfile = VALUES(showProfile), showRank = VALUES(showRank), showSubjectStats = VALUES(showSubjectStats)'
    );
    $stmt->execute([(int)$student['id'], ...$values]);
    $audit = $pdo->prepare('INSERT INTO audit_logs (actorUserId, action, entity, entityId, newValue) VALUES (?, ?, ?, ?, ?)');
    $audit->execute([(int)$user['id'], 'PRIVACY_SETTINGS_UPDATED', 'privacy_settings', (string)$student['id'], json_encode($body, JSON_UNESCAPED_UNICODE)]);
    json_response(['success' => true]);
}

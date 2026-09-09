<?php
declare(strict_types=1);

function ranking_type(mixed $value): string {
    return enum_value($value, 'rankingType', ['ACADEMIC', 'FANTASY', 'IMPROVEMENT', 'RECENT_FORM', 'CONSISTENCY', 'SUBJECT']);
}

function tie_break_order(mixed $value): array {
    if (is_array($value)) $items = $value;
    elseif (is_string($value)) {
        $decoded = json_decode($value, true);
        $items = is_array($decoded) ? $decoded : explode(',', $value);
    } else $items = [];
    $items = array_values(array_filter(array_map(static fn($item) => is_string($item) ? trim($item) : '', $items)));
    if (!$items) $items = ['academicScore', 'fantasyScore', 'recentForm', 'firstAttemptSuccess', 'studentId'];
    return $items;
}

function ranking_entries(array $entries, array $tieBreak): array {
    usort($entries, static function (array $a, array $b) use ($tieBreak): int {
        foreach ($tieBreak as $key) {
            if ($key === 'studentId') {
                $comparison = strcmp((string)$a['studentId'], (string)$b['studentId']);
            } else {
                $comparison = ((float)($b[$key] ?? 0)) <=> ((float)($a[$key] ?? 0));
            }
            if ($comparison !== 0) return $comparison;
        }
        return strcmp((string)$a['studentId'], (string)$b['studentId']);
    });
    foreach ($entries as $index => &$entry) $entry['rank'] = $index + 1;
    unset($entry);
    return $entries;
}

function admin_create_ranking_snapshot(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $cohortId = positive_int($body['cohortId'] ?? null, 'cohortId');
    $semesterId = positive_int($body['semesterId'] ?? null, 'semesterId');
    $scoringConfigId = positive_int($body['scoringConfigId'] ?? null, 'scoringConfigId');
    $version = required_text($body['scoringVersion'] ?? null, 'scoringVersion', 64);
    $type = ranking_type($body['rankingType'] ?? null);
    $publish = ($body['publish'] ?? false) === true;
    $lock = ($body['lock'] ?? false) === true;
    if (!is_array($body['entries'] ?? null) || count($body['entries']) < 1) json_response(['error' => 'entries must contain at least one row'], 400);
    $tieBreak = tie_break_order($body['tieBreakOrder'] ?? null);

    $entries = [];
    foreach ($body['entries'] as $entry) {
        if (!is_array($entry)) json_response(['error' => 'Invalid ranking entry'], 400);
        $studentId = required_text($entry['studentId'] ?? null, 'studentId', 64);
        foreach (['academicScore', 'fantasyScore', 'recentForm', 'firstAttemptSuccess'] as $field) {
            if (!isset($entry[$field]) || !is_numeric($entry[$field]) || !is_finite((float)$entry[$field])) json_response(['error' => $field . ' is invalid'], 400);
        }
        $entries[] = [
            'studentId' => $studentId,
            'academicScore' => (float)$entry['academicScore'],
            'fantasyScore' => (float)$entry['fantasyScore'],
            'recentForm' => (float)$entry['recentForm'],
            'firstAttemptSuccess' => (float)$entry['firstAttemptSuccess'],
        ];
    }
    $entries = ranking_entries($entries, $tieBreak);

    $previousStmt = $pdo->prepare('SELECT studentId, rank, locked FROM rankings WHERE cohortId = ? AND semesterId = ? AND rankingType = ? AND published = 1');
    $previousStmt->execute([$cohortId, $semesterId, $type]);
    $previous = [];
    foreach ($previousStmt->fetchAll() as $row) {
        if ((int)$row['locked'] === 1) json_response(['error' => 'A locked published snapshot already exists'], 409);
        $previous[(string)$row['studentId']] = (int)$row['rank'];
    }

    $pdo->beginTransaction();
    try {
        if ($publish) {
            $clear = $pdo->prepare('UPDATE rankings SET published = 0 WHERE cohortId = ? AND semesterId = ? AND rankingType = ? AND published = 1 AND locked = 0');
            $clear->execute([$cohortId, $semesterId, $type]);
        }
        $insert = $pdo->prepare('INSERT INTO rankings (cohortId, semesterId, scoringConfigId, rankingType, studentId, `rank`, score, previousRank, explanation, published, locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($entries as $entry) {
            $score = $type === 'FANTASY' ? $entry['fantasyScore'] : $entry['academicScore'];
            $explanation = json_encode(['scoringVersion' => $version, 'tieBreakOrder' => $tieBreak, 'rankingType' => $type], JSON_UNESCAPED_UNICODE);
            $insert->execute([$cohortId, $semesterId, $scoringConfigId, $type, (int)$entry['studentId'], $entry['rank'], number_format($score, 4, '.', ''), $previous[$entry['studentId']] ?? null, $explanation, $publish ? 1 : 0, $lock ? 1 : 0]);
        }
        audit_admin($pdo, (int)$admin['id'], $lock ? 'RANKING_SNAPSHOT_PUBLISHED_AND_LOCKED' : 'RANKING_SNAPSHOT_CREATED', 'rankings', $cohortId . ':' . $semesterId . ':' . $type, null, json_encode(['version' => $version, 'published' => $publish, 'lock' => $lock], JSON_UNESCAPED_UNICODE));
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('[SPBU] Ranking snapshot failed: ' . $error->getMessage());
        json_response(['error' => 'Ranking snapshot could not be created'], 500);
    }
    json_response(['version' => $version, 'published' => $publish, 'rows' => count($entries)]);
}

function academic_rankings(array $config, PDO $pdo): never {
    require_method('GET');
    [, $student] = require_verified_student($config, $pdo);
    $cohortId = positive_int($_GET['cohortId'] ?? null, 'cohortId');
    $semesterId = positive_int($_GET['semesterId'] ?? null, 'semesterId');
    $type = ranking_type($_GET['rankingType'] ?? null);
    $stmt = $pdo->prepare('SELECT * FROM rankings WHERE cohortId = ? AND semesterId = ? AND rankingType = ? AND published = 1 ORDER BY `rank` LIMIT 100');
    $stmt->execute([$cohortId, $semesterId, $type]);
    $rows = $stmt->fetchAll();
    $visible = [];
    foreach ($rows as $row) {
        if ((int)$row['studentId'] === (int)$student['id']) {
            $visible[] = $row;
            continue;
        }
        $privacy = $pdo->prepare('SELECT privateMode, showRank FROM privacy_settings WHERE studentId = ? LIMIT 1');
        $privacy->execute([(int)$row['studentId']]);
        $settings = $privacy->fetch();
        if (!$settings || ((int)$settings['privateMode'] === 0 && (int)$settings['showRank'] === 1)) $visible[] = $row;
    }
    json_response($visible);
}

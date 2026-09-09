<?php
declare(strict_types=1);

function scoring_configs(array $config, PDO $pdo): never {
    require_method('GET');
    require_admin($config, $pdo);
    json_response($pdo->query('SELECT id, version, examWeight, passFailWeight, creditWeightEnabled, improvementWeight, consistencyWeight, firstAttemptWeight, recentFormWeight, tieBreakOrder, active, createdAt FROM scoring_configs ORDER BY createdAt DESC')->fetchAll());
}

function decimal_value(mixed $value, string $field, bool $nonNegative = false): float {
    if (!is_numeric($value) || !is_finite((float)$value)) json_response(['error' => $field . ' is invalid'], 400);
    $number = (float)$value;
    if ($nonNegative && $number < 0) json_response(['error' => $field . ' cannot be negative'], 400);
    return $number;
}

function admin_create_scoring_config(array $config, PDO $pdo): never {
    require_method('POST');
    $admin = require_admin($config, $pdo);
    $body = request_json();
    $version = required_text($body['version'] ?? null, 'version', 64);
    $examWeight = decimal_value($body['examWeight'] ?? null, 'examWeight', true);
    $passFailWeight = decimal_value($body['passFailWeight'] ?? null, 'passFailWeight', true);
    $improvementWeight = decimal_value($body['improvementWeight'] ?? null, 'improvementWeight');
    $consistencyWeight = decimal_value($body['consistencyWeight'] ?? null, 'consistencyWeight');
    $firstAttemptWeight = decimal_value($body['firstAttemptWeight'] ?? null, 'firstAttemptWeight');
    $recentFormWeight = decimal_value($body['recentFormWeight'] ?? null, 'recentFormWeight');
    if (!is_bool($body['creditWeightEnabled'] ?? null)) json_response(['error' => 'creditWeightEnabled must be boolean'], 400);
    if (!is_array($body['tieBreakOrder'] ?? null) || count($body['tieBreakOrder']) < 1) json_response(['error' => 'tieBreakOrder must contain at least one item'], 400);
    $tieBreak = tie_break_order($body['tieBreakOrder']);
    if (!$tieBreak) json_response(['error' => 'tieBreakOrder is invalid'], 400);

    $stmt = $pdo->prepare('INSERT INTO scoring_configs (version, examWeight, passFailWeight, creditWeightEnabled, improvementWeight, consistencyWeight, firstAttemptWeight, recentFormWeight, tieBreakOrder, active, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
    $stmt->execute([
        $version,
        number_format($examWeight, 4, '.', ''),
        number_format($passFailWeight, 4, '.', ''),
        $body['creditWeightEnabled'] ? 1 : 0,
        number_format($improvementWeight, 4, '.', ''),
        number_format($consistencyWeight, 4, '.', ''),
        number_format($firstAttemptWeight, 4, '.', ''),
        number_format($recentFormWeight, 4, '.', ''),
        json_encode($tieBreak, JSON_UNESCAPED_UNICODE),
        (int)$admin['id'],
    ]);
    audit_admin($pdo, (int)$admin['id'], 'SCORING_CONFIG_CREATED', 'scoring_configs', $version, null, json_encode($body, JSON_UNESCAPED_UNICODE));
    json_response(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
}

<?php
declare(strict_types=1);

function db(array $config): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $db = $config['db'] ?? [];
    $host = (string)($db['host'] ?? '');
    $name = (string)($db['name'] ?? '');
    $user = (string)($db['user'] ?? '');
    $password = (string)($db['password'] ?? '');
    $charset = (string)($db['charset'] ?? 'utf8mb4');
    if ($host === '' || $name === '' || $user === '') {
        json_response(['error' => 'Database configuration is incomplete'], 500);
    }
    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";
    try {
        $pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (PDOException $error) {
        error_log('[SPBU] Database connection failed: ' . $error->getMessage());
        json_response(['error' => 'Database unavailable'], 503);
    }
}

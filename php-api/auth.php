<?php
declare(strict_types=1);

function start_app_session(array $config): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $name = (string)($config['app']['session_name'] ?? 'spbu_session');
    session_name($name);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function current_user(array $config, PDO $pdo): ?array {
    start_app_session($config);
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_int($userId) && !ctype_digit((string)$userId)) return null;
    $stmt = $pdo->prepare('SELECT id, openId, name, email, role, lastSignedIn FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$userId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_user(array $config, PDO $pdo): array {
    $user = current_user($config, $pdo);
    if ($user === null) json_response(['error' => 'Authentication required'], 401);
    return $user;
}

function require_admin(array $config, PDO $pdo): array {
    $user = require_user($config, $pdo);
    if (($user['role'] ?? '') !== 'admin') json_response(['error' => 'Administrator access required'], 403);
    return $user;
}

function login_user(array $config, PDO $pdo, int $userId): void {
    start_app_session($config);
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['created_at'] = time();
}

function logout_user(array $config): void {
    start_app_session($config);
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool)$params['secure'], (bool)$params['httponly']);
    }
    session_destroy();
}

<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/academic.php';
require __DIR__ . '/admin.php';
require __DIR__ . '/rankings.php';

$path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');
$path = preg_replace('#^api(?:/php)?/?#', '', $path) ?? $path;

if ($path === '' || $path === 'health') {
    json_response(['ok' => true, 'service' => 'spbu-php-api']);
}

$pdo = db($config);

if ($path === 'auth/me') {
    require_method('GET');
    json_response(current_user($config, $pdo));
}

if ($path === 'auth/logout') {
    require_method('POST');
    logout_user($config);
    json_response(['success' => true]);
}

if ($path === 'auth/login') {
    require_method('POST');
    $body = request_json();
    $email = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    if ($email === false || $password === '') json_response(['error' => 'Valid email and password are required'], 400);
    $stmt = $pdo->prepare('SELECT id, password_hash, role FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $candidate = $stmt->fetch();
    if (!$candidate || !password_verify($password, (string)$candidate['password_hash'])) {
        json_response(['error' => 'Invalid credentials'], 401);
    }
    if (password_needs_rehash((string)$candidate['password_hash'], PASSWORD_DEFAULT)) {
        $update = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $update->execute([password_hash($password, PASSWORD_DEFAULT), (int)$candidate['id']]);
    }
    login_user($config, $pdo, (int)$candidate['id']);
    json_response(['success' => true, 'user' => current_user($config, $pdo)]);
}

if ($path === 'academic/me') {
    academic_me($config, $pdo);
}

if ($path === 'privacy/get') {
    privacy_get($config, $pdo);
}

if ($path === 'privacy/update') {
    privacy_update($config, $pdo);
}

$adminRoutes = [
    'admin/catalog' => 'admin_catalog',
    'admin/students' => 'admin_students',
    'admin/students/create' => 'admin_create_student',
    'admin/students/update' => 'admin_update_student',
    'admin/students/link' => 'admin_link_student',
    'admin/students/verify' => 'admin_verify_student',
    'admin/subjects/create' => 'admin_create_subject',
    'admin/semesters/create' => 'admin_create_semester',
    'admin/cohorts/create' => 'admin_create_cohort',
];
if (isset($adminRoutes[$path])) {
    $adminRoutes[$path]($config, $pdo);
}

if ($path === 'academic/rankings') {
    academic_rankings($config, $pdo);
}

if ($path === 'admin/rankings/snapshot') {
    admin_create_ranking_snapshot($config, $pdo);
}

json_response(['error' => 'Not found'], 404);

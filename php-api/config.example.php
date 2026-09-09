<?php
declare(strict_types=1);

// Copy to config.php on the server and fill with the InfinityFree MySQL values.
// Never commit config.php or real credentials.
return [
    'db' => [
        'host' => 'YOUR_MYSQL_HOST',
        'name' => 'YOUR_DATABASE_NAME',
        'user' => 'YOUR_DATABASE_USER',
        'password' => 'YOUR_DATABASE_PASSWORD',
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'session_name' => 'spbu_session',
        'allowed_origin' => 'https://spbu.is-great.net',
    ],
];

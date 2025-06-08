<?php
// Improved login.php with better error handling
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

// Enable error logging for debugging
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__FILE__) . '/error.log');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize session with proper settings
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_lifetime' => 3600, // 1 hour
        'cookie_secure' => true,
        'cookie_httponly' => true,
        'cookie_samesite' => 'Strict'
    ]);
}

try {
    // Rate Limiting
    $maxAttempts = 5;
    $timeWindow = 300; // 5 minutes

    if (!isset($_SESSION['login_attempts'])) {
        $_SESSION['login_attempts'] = [];
    }

    // Clean old attempts
    $_SESSION['login_attempts'] = array_filter($_SESSION['login_attempts'], function($timestamp) use ($timeWindow) {
        return (time() - $timestamp) < $timeWindow;
    });

    if (count($_SESSION['login_attempts']) >= $maxAttempts) {
        http_response_code(429);
        echo json_encode([
            "success" => false, 
            "message" => "Zu viele Anmeldeversuche. Bitte warten Sie 5 Minuten.",
            "retry_after" => 300
        ]);
        exit;
    }

    // The correct hashed password (SHA-256)
    // For production: Use a secure configuration file or environment variable!
    $correctHash = "9db623f8b84efb6cd12fca05c34f1cb26f7e0ac6477c757d80ed4f30d1707697";

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get password hash from request
        $inputHash = $_POST['password_hash'] ?? '';
        
        // Validate hash format
        if (empty($inputHash) || !preg_match('/^[a-f0-9]{64}$/i', $inputHash)) {
            $_SESSION['login_attempts'][] = time();
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "message" => "Ungültiges Hash-Format.",
                "error_code" => "INVALID_HASH_FORMAT"
            ]);
            exit;
        }

        // Check if the hash is correct
        if (hash_equals($correctHash, strtolower($inputHash))) {
            // Successful login - reset attempts
            $_SESSION['login_attempts'] = [];
            $_SESSION['authenticated'] = true;
            $_SESSION['auth_time'] = time();
            $_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $_SESSION['ip_address'] = $_SERVER['REMOTE_ADDR'] ?? '';
            
            echo json_encode([
                "success" => true,
                "message" => "Anmeldung erfolgreich",
                "expires_in" => 3600
            ]);
        } else {
            // Failed login
            $_SESSION['login_attempts'][] = time();
            
            http_response_code(401);
            echo json_encode([
                "success" => false, 
                "message" => "Falsches Passwort.",
                "attempts_remaining" => max(0, $maxAttempts - count($_SESSION['login_attempts']))
            ]);
        }
        exit;
    }

    // Invalid request method
    http_response_code(405);
    echo json_encode([
        "success" => false, 
        "message" => "Nur POST-Methode erlaubt.",
        "error_code" => "METHOD_NOT_ALLOWED"
    ]);

} catch (Exception $e) {
    // Log the error
    error_log("Login error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    
    // Return generic error to client
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Serverfehler beim Anmelden",
        "error_code" => "INTERNAL_SERVER_ERROR"
    ]);
} finally {
    // Ensure output is sent
    if (ob_get_level()) {
        ob_end_flush();
    }
}
?>
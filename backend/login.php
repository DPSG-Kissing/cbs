<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();
include("mysql_con.php");

// Rate Limiting aus Datenbank laden
$settings = loadSettings($conn);
$maxAttempts = intval($settings['rate_limit_attempts'] ?? 5);
$timeWindow = intval($settings['rate_limit_window'] ?? 300);

if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = [];
}

// Alte Versuche entfernen
$_SESSION['login_attempts'] = array_filter($_SESSION['login_attempts'], function($timestamp) use ($timeWindow) {
    return (time() - $timestamp) < $timeWindow;
});

if (count($_SESSION['login_attempts']) >= $maxAttempts) {
    http_response_code(429);
    echo json_encode([
        "success" => false, 
        "message" => "Zu viele Anmeldeversuche. Bitte warten Sie " . ($timeWindow / 60) . " Minuten."
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputHash = $_POST['password_hash'] ?? '';
    
    // Hash validieren
    if (empty($inputHash) || !preg_match('/^[a-f0-9]{64}$/i', $inputHash)) {
        $_SESSION['login_attempts'][] = time();
        http_response_code(400);
        echo json_encode([
            "success" => false, 
            "message" => "Ungültiges Hash-Format."
        ]);
        exit;
    }

    // Passwort-Hash aus Datenbank laden
    $correctHash = getPasswordHashFromDB($conn);
    
    if (!$correctHash) {
        error_log("CBS Tool: Kein Admin-Passwort in Datenbank gefunden!");
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "message" => "Konfigurationsfehler. Bitte Administrator kontaktieren."
        ]);
        exit;
    }

    // Überprüfen, ob der Hash korrekt ist
    if (hash_equals($correctHash, $inputHash)) {
        // Erfolgreiche Anmeldung
        $_SESSION['login_attempts'] = [];
        $_SESSION['authenticated'] = true;
        $_SESSION['auth_time'] = time();
        
        // Optional: Login in Datenbank protokollieren
        logSuccessfulLogin($conn);
        
        echo json_encode([
            "success" => true,
            "message" => "Anmeldung erfolgreich"
        ]);
    } else {
        // Fehlgeschlagene Anmeldung
        $_SESSION['login_attempts'][] = time();
        
        http_response_code(401);
        echo json_encode([
            "success" => false, 
            "message" => "Falsches Passwort."
        ]);
    }
    
    $conn->close();
    exit;
}

// Fallback
http_response_code(405);
echo json_encode([
    "success" => false, 
    "message" => "Nur POST-Methode erlaubt."
]);

/**
 * Lädt das Passwort-Hash aus der Datenbank
 */
function getPasswordHashFromDB($conn) {
    // Option A: Aus settings-Tabelle
    $sql = "SELECT setting_value FROM settings WHERE setting_key = 'admin_password_hash' LIMIT 1";
    
    // Option B: Aus admin_users-Tabelle
    // $sql = "SELECT password_hash FROM admin_users WHERE username = 'admin' LIMIT 1";
    
    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return $row['setting_value'] ?? $row['password_hash'];
    }
    
    return false;
}

/**
 * Lädt alle Einstellungen aus der Datenbank
 */
function loadSettings($conn) {
    $settings = [];
    $sql = "SELECT setting_key, setting_value FROM settings";
    $result = $conn->query($sql);
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
    }
    
    return $settings;
}

/**
 * Protokolliert erfolgreiche Logins
 */
function logSuccessfulLogin($conn) {
    // Option A: In settings-Tabelle
    $sql = "UPDATE settings SET setting_value = NOW() WHERE setting_key = 'last_admin_login'";
    
    // Option B: In admin_users-Tabelle
    // $sql = "UPDATE admin_users SET last_login = NOW(), login_attempts = 0 WHERE username = 'admin'";
    
    $conn->query($sql);
}
?>
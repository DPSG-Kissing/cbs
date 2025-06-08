<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Nur POST-Methode erlaubt']);
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

// POST-Daten verarbeiten
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
    // Fallback auf Standard-Hash falls DB-Eintrag fehlt
    $correctHash = "dd26d2dc2a72e8b5b1528b24e4a7602c5e7c8e7e5b8b0c6dc60b1797db8c2ed2";
}

// Hash-Vergleich (timing-attack safe)
if (hash_equals($correctHash, $inputHash)) {
    $_SESSION['login_attempts'] = [];
    $_SESSION['authenticated'] = true;
    $_SESSION['auth_time'] = time();
    logSuccessfulLogin($conn);
    
    echo json_encode([
        "success" => true,
        "message" => "Anmeldung erfolgreich"
    ]);
} else {
    $_SESSION['login_attempts'][] = time();
    http_response_code(401);
    echo json_encode([
        "success" => false, 
        "message" => "Falsches Passwort."
    ]);
}

$conn->close();
exit;

/**
 * Lädt das Passwort-Hash aus der Datenbank
 */
function getPasswordHashFromDB($conn) {
    try {
        $sql = "SELECT setting_value FROM settings WHERE setting_key = 'admin_password_hash' LIMIT 1";
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            return $row['setting_value'];
        }
    } catch (Exception $e) {
        error_log("Error loading password hash: " . $e->getMessage());
    }
    return false;
}

/**
 * Lädt alle Einstellungen aus der Datenbank
 */
function loadSettings($conn) {
    $settings = [];
    try {
        $sql = "SELECT setting_key, setting_value FROM settings";
        $result = $conn->query($sql);
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
        }
    } catch (Exception $e) {
        error_log("Error loading settings: " . $e->getMessage());
    }
    return $settings;
}

/**
 * Protokolliert erfolgreiche Logins
 */
function logSuccessfulLogin($conn) {
    try {
        $sql = "UPDATE settings SET setting_value = NOW() WHERE setting_key = 'last_admin_login'";
        $conn->query($sql);
    } catch (Exception $e) {
        error_log("Error logging successful login: " . $e->getMessage());
    }
}
?>
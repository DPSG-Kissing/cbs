<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Rate Limiting (einfache Implementierung)
session_start();
$maxAttempts = 5;
$timeWindow = 300; // 5 Minuten

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
        "message" => "Zu viele Anmeldeversuche. Bitte warten Sie 5 Minuten."
    ]);
    exit;
}

// Das korrekt gehashte Passwort (SHA-256)
// Für Produktionsumgebung: Verwenden Sie eine sichere Konfigurationsdatei!
$correctHash = "9db623f8b84efb6cd12fca05c34f1cb26f7e0ac6477c757d80ed4f30d1707697";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Passwort-Hash aus der Anfrage lesen
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

    // Überprüfen, ob der Hash korrekt ist
    if (hash_equals($correctHash, $inputHash)) {
        // Erfolgreiche Anmeldung - Versuche zurücksetzen
        $_SESSION['login_attempts'] = [];
        $_SESSION['authenticated'] = true;
        $_SESSION['auth_time'] = time();
        
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
    exit;
}

// Fallback bei ungültigen Anfragen
http_response_code(405);
echo json_encode([
    "success" => false, 
    "message" => "Nur POST-Methode erlaubt."
]);
?>

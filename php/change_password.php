<?php
header("Content-Type: application/json; charset=utf-8");

// Nur über Kommandozeile oder mit speziellem Token erlauben
if (php_sapi_name() !== 'cli' && (!isset($_GET['token']) || $_GET['token'] !== 'CHANGE_THIS_SECRET_TOKEN')) {
    http_response_code(403);
    die(json_encode(['error' => 'Zugriff verweigert']));
}

include("mysql_con.php");

// Neues Passwort ermitteln
$newPassword = null;
if (php_sapi_name() === 'cli') {
    $newPassword = $argv[1] ?? null;
} else {
    $newPassword = $_POST['new_password'] ?? $_GET['new_password'] ?? null;
}

if (!$newPassword) {
    die(json_encode(['error' => 'Bitte neues Passwort angeben']));
}

// Hash generieren (SHA-256)
$newHash = hash('sha256', $newPassword);

// Option A: Update in settings-Tabelle
$sql = "UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'admin_password_hash'";

// Option B: Update in admin_users-Tabelle (auskommentiert)
// $sql = "UPDATE admin_users SET password_hash = ? WHERE username = 'admin'";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    die(json_encode([
        'success' => false,
        'error' => 'Prepare Statement fehlgeschlagen: ' . $conn->error
    ]));
}

$stmt->bind_param("s", $newHash);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Passwort erfolgreich geändert',
        'hash' => $newHash,
        'info' => [
            'password_length' => strlen($newPassword),
            'hash_algorithm' => 'SHA-256',
            'updated_at' => date('Y-m-d H:i:s')
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Fehler beim Ändern des Passworts: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();

/**
 * VERWENDUNG:
 * 
 * 1. Über Kommandozeile:
 *    php change_password.php "neuesPasswort123"
 * 
 * 2. Über Web mit Token (GET):
 *    https://cbs.pfadfinder-kissing.de/backend/change_password.php?token=CHANGE_THIS_SECRET_TOKEN&new_password=neuesPasswort123
 * 
 * 3. Über Web mit Token (POST):
 *    POST an change_password.php?token=CHANGE_THIS_SECRET_TOKEN
 *    Body: new_password=neuesPasswort123
 * 
 * SICHERHEIT:
 * - Ändern Sie CHANGE_THIS_SECRET_TOKEN zu einem sicheren Wert
 * - Oder fügen Sie die Datei zu .htaccess hinzu um Web-Zugriff zu blockieren
 */
?>
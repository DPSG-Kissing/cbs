<?php
// Geheimes Token, um die Anfrage zu validieren
$secret = 'YWYNvMU3It3YVStdhfLsvXBJzVJ/vhJmB9eLMvdGdK0';

// Signatur aus dem GitHub-Request-Header extrahieren
$hubSignature = $_SERVER['HTTP_X_HUB_SIGNATURE'];
list($algo, $hash) = explode('=', $hubSignature, 2);

// Raw-Post-Daten aus der Anfrage holen
$payload = file_get_contents('php://input');

// Signatur berechnen, um die Anfrage zu verifizieren
$payloadHash = hash_hmac($algo, $payload, $secret);

// Signaturen vergleichen
if ($hash === $payloadHash) {
    // Befehl ausführen, um die neuesten Änderungen zu holen
    // Der Benutzer, der den Webserver ausführt (z.B. www-data), benötigt die entsprechenden Berechtigungen
    $output = shell_exec('git pull 2>&1');
    // Optional: Loggen Sie den Output für Debugging-Zwecke
    file_put_contents('git-log.txt', $output . PHP_EOL, FILE_APPEND);
    http_response_code(200);
    echo "Update erfolgreich!";
} else {
    // Bei ungültiger Signatur den Zugriff verweigern
    http_response_code(403);
    echo "Fehler: Ungültiges Secret!";
}
?>

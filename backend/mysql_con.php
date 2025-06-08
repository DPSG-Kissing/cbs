<?php
// Fehlerberichterstattung für Entwicklungsumgebungen aktivieren
if (getenv('ENVIRONMENT') === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Setzt den Content-Type Header für alle Antworten, die dieses Skript verwenden
header("Content-Type: application/json; charset=utf-8");

// Datenbankverbindungsparameter
// WICHTIG: Diese Werte sollten in einer sicheren Umgebungsvariable oder Config-Datei stehen!
$servername = "127.0.0.1";
$username = "cbsammlung";
$password = "ZZTTrs2rTQpJl5OmUPFv"; // Das zuletzt funktionierende Passwort
$dbname = "cbsammlung";

// mysqli initialisieren
$conn = new mysqli();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT); // Aktiviert Exception-Handling für mysqli

try {
    // Verbindung herstellen
    $conn->real_connect($servername, $username, $password, $dbname);
    
    // Setze Zeichensatz auf UTF-8
    $conn->set_charset("utf8mb4");
    
    // Setze Zeitzone und SQL-Modus
    $conn->query("SET time_zone = '+01:00'");
    $conn->query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    
} catch (mysqli_sql_exception $e) {
    // Bei einem Verbindungsfehler, sende eine strukturierte JSON-Antwort
    http_response_code(500); // Internal Server Error
    
    // Logge den genauen Fehler serverseitig
    error_log("Datenbankverbindungsfehler: " . $e->getMessage());
    
    // Sende eine generische Fehlermeldung an den Client
    echo json_encode([
        'success' => false,
        'message' => 'Datenbankverbindungsfehler. Bitte kontaktieren Sie den Administrator.',
        'error_code' => $e->getCode()
    ]);
    
    exit; // Beende die Skriptausführung nach dem Fehler
}

// Funktion zum sicheren Schließen der Verbindung (optional, da PHP dies am Ende tut)
register_shutdown_function(function() use ($conn) {
    if ($conn instanceof mysqli && !$conn->connect_error) {
        $conn->close();
    }
});

?>
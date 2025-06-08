<?php
// Fehlerberichterstattung für Produktion deaktivieren
if (getenv('ENVIRONMENT') !== 'development') {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Datenbankverbindungsparameter
// WICHTIG: Diese Werte sollten in einer sicheren Umgebungsvariable oder Config-Datei stehen!
$servername = "127.0.0.1";
$username = "cbsammlung";
$password = "Ca0WGf7gnjtF4TuAP6yz"; // TODO: In Umgebungsvariable verschieben
$dbname = "cbsammlung";

// Verbindungsoptionen für erhöhte Sicherheit
$options = [
    MYSQLI_OPT_CONNECT_TIMEOUT => 5,
    MYSQLI_INIT_COMMAND => "SET sql_mode='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'",
    MYSQLI_OPT_SSL_VERIFY_SERVER_CERT => true,
];

try {
    // Erstelle MySQLi-Verbindung mit Optionen
    $conn = new mysqli();
    
    // Setze Verbindungsoptionen
    foreach ($options as $option => $value) {
        $conn->options($option, $value);
    }
    
    // Stelle Verbindung her
    $conn->real_connect($servername, $username, $password, $dbname);
    
    // Prüfe Verbindung
    if ($conn->connect_error) {
        throw new Exception("Datenbankverbindung fehlgeschlagen: " . $conn->connect_error);
    }
    
    // Setze Zeichensatz auf UTF-8
    if (!$conn->set_charset("utf8mb4")) {
        throw new Exception("Fehler beim Setzen des UTF-8 Zeichensatzes: " . $conn->error);
    }
    
    // Setze Zeitzone
    $conn->query("SET time_zone = '+01:00'");
    
    // Aktiviere strikte SQL-Modi für bessere Datenintegrität
    $conn->query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'");
    
} catch (Exception $e) {
    // Log den Fehler (in Produktion sollte das in eine Log-Datei geschrieben werden)
    if (getenv('ENVIRONMENT') === 'development') {
        error_log("Database connection error: " . $e->getMessage());
        die("Datenbankverbindung fehlgeschlagen. Bitte versuchen Sie es später erneut.");
    } else {
        // In Produktion keine Details preisgeben
        die("Service temporär nicht verfügbar. Bitte versuchen Sie es später erneut.");
    }
}

// Funktion für sichere Datenbankabfragen
function executeSecureQuery($conn, $query, $types = "", $params = []) {
    try {
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        return $stmt;
    } catch (Exception $e) {
        error_log("Query execution error: " . $e->getMessage());
        throw $e;
    }
}

// Funktion zum sicheren Schließen der Verbindung
function closeConnection($conn) {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

// Register shutdown function für automatisches Schließen
register_shutdown_function(function() use ($conn) {
    closeConnection($conn);
});

// Setze Umgebungsvariable für Entwicklung
putenv('ENVIRONMENT=development');
?>

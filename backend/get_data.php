<?php
// Fehlerberichterstattung für Produktion deaktivieren
error_reporting(0);
ini_set('display_errors', 0);

// Headers setzen
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

// OPTIONS-Request behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Nur GET erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Nur GET-Methode erlaubt']);
    exit;
}

try {
    // Datenbankverbindung einbinden
    if (!file_exists(__DIR__ . '/mysql_con.php')) {
        throw new Exception('Konfigurationsdatei fehlt');
    }
    
    include("mysql_con.php");
    
    // Verbindung prüfen
    if (!isset($conn) || $conn->connect_error) {
        throw new Exception('Datenbankverbindung fehlgeschlagen');
    }
    
    // Query ausführen mit Prepared Statement für zusätzliche Sicherheit
    $sql = "SELECT id, name, strasse, telefonnummer, lat, lng, cb_anzahl, geld, status, created_at, updated_at 
            FROM anmeldungen 
            ORDER BY strasse ASC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception('Datenbankabfrage fehlgeschlagen');
    }
    
    // Daten sammeln
    $output = [];
    while ($row = $result->fetch_assoc()) {
        // Datentypen sicherstellen
        $row['id'] = (int) $row['id'];
        $row['lat'] = (float) $row['lat'];
        $row['lng'] = (float) $row['lng'];
        $row['cb_anzahl'] = (int) $row['cb_anzahl'];
        $row['geld'] = (float) $row['geld'];
        $row['status'] = (int) $row['status'];
        
        $output[] = $row;
    }
    
    // Ressourcen freigeben
    $result->free();
    $conn->close();
    
    // Erfolgreiche Ausgabe
    echo json_encode($output, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Fehlerprotokollierung
    error_log('CBS get_data.php Error: ' . $e->getMessage());
    
    // Generische Fehlermeldung für den Client
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Serverfehler beim Abrufen der Daten'
    ]);
}
?>
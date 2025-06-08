<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Stellt sicher, dass die Datenbankverbindung eingebunden wird.
// Die mysql_con.php fängt Verbindungsfehler bereits ab.
include("mysql_con.php");

try {
    // 1. Performance: Nur die Spalten auswählen, die benötigt werden.
    $sql = "SELECT id, name, strasse, telefonnummer, lat, lng, cb_anzahl, geld, status, notizen, created_at, updated_at 
            FROM anmeldungen 
            ORDER BY strasse ASC";

    // 2. Sicherheit & Stabilität: Prepared Statements verwenden.
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        // Wirft eine Exception, die vom catch-Block gefangen wird.
        throw new Exception('Datenbank-Vorbereitung fehlgeschlagen: ' . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    // 3. Effizienteres Auslesen aller Datenzeilen in ein Array.
    $output = $result->fetch_all(MYSQLI_ASSOC);

    $stmt->close();
    $conn->close();
    
    // Erfolg: JSON-Daten ausgeben.
    echo json_encode($output, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // 4. Zentrale Fehlerbehandlung für den gesamten Prozess.
    http_response_code(500); // Internal Server Error
    
    // Loggt den genauen Fehler auf dem Server, ohne ihn dem Client zu zeigen.
    error_log("Fehler in get_data.php: " . $e->getMessage());
    
    // Gibt eine generische und sichere Fehlermeldung an den Client zurück.
    echo json_encode([
        'success' => false,
        'message' => 'Ein interner Serverfehler ist aufgetreten.'
    ]);
}
?>
<?php
// Einbinden der Datenbankverbindung. 
// Das Skript wird beendet, wenn mysql_con.php einen Fehler hat.
include("mysql_con.php");

try {
    // 1. Nur die benötigten Spalten auswählen.
    $sql = "SELECT id, name, strasse, telefonnummer, lat, lng, cb_anzahl, geld, status, notizen, created_at, updated_at 
            FROM anmeldungen 
            ORDER BY strasse ASC";

    // 2. Prepared Statements für Sicherheit und Stabilität verwenden.
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Datenbank-Vorbereitung fehlgeschlagen: ' . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    // 3. Alle Datenzeilen effizient in ein Array auslesen.
    $output = $result->fetch_all(MYSQLI_ASSOC);

    $stmt->close();
    
    // Erfolg: JSON-Daten ausgeben.
    http_response_code(200);
    echo json_encode($output, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // 4. Zentrale Fehlerbehandlung für den gesamten Prozess.
    http_response_code(500); // Internal Server Error
    
    // Loggt den genauen Fehler auf dem Server.
    error_log("Fehler in get_data.php: " . $e->getMessage());
    
    // Gibt eine generische und sichere Fehlermeldung an den Client zurück.
    echo json_encode([
        'success' => false,
        'message' => 'Ein interner Serverfehler ist beim Abrufen der Daten aufgetreten.'
    ]);
}
?>
<?php
// Debug-Version von get_data.php
// Zeigt detaillierte Fehlerinformationen

// Temporär Fehler anzeigen für Debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers zuerst, bevor irgendeine Ausgabe erfolgt
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug-Array für Fehlersammlung
$debug = [
    'step' => 'start',
    'errors' => [],
    'data' => null
];

try {
    // Schritt 1: MySQL-Verbindung laden
    $debug['step'] = 'loading mysql_con.php';
    
    if (!file_exists('mysql_con.php')) {
        throw new Exception('mysql_con.php nicht gefunden');
    }
    
    include("mysql_con.php");
    $debug['step'] = 'mysql_con.php loaded';
    
    // Schritt 2: Verbindung prüfen
    if (!isset($conn)) {
        throw new Exception('$conn Variable nicht definiert');
    }
    
    if ($conn->connect_error) {
        throw new Exception('Datenbankverbindung fehlgeschlagen: ' . $conn->connect_error);
    }
    
    $debug['step'] = 'database connected';
    
    // Schritt 3: Query ausführen
    $sql = "SELECT * FROM anmeldungen ORDER BY strasse ASC";
    $result = mysqli_query($conn, $sql);
    
    if (!$result) {
        throw new Exception('Query fehlgeschlagen: ' . mysqli_error($conn));
    }
    
    $debug['step'] = 'query executed';
    
    // Schritt 4: Daten sammeln
    $output = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $output[] = $row;
    }
    
    $debug['step'] = 'data fetched';
    $debug['data'] = ['count' => count($output), 'success' => true];
    
    // Schritt 5: Verbindung schließen und Daten ausgeben
    $conn->close();
    
    // Im Debug-Modus: Zeige Debug-Infos mit den Daten
    if (isset($_GET['debug']) && $_GET['debug'] === '1') {
        echo json_encode([
            'debug' => $debug,
            'data' => $output
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        // Normale Ausgabe
        echo json_encode($output, JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    // Fehlerbehandlung
    $debug['errors'][] = $e->getMessage();
    
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'debug' => $debug
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>
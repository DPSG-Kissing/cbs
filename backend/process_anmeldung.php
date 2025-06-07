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

include("mysql_con.php");

// JSON-Daten dekodieren
$data = json_decode(file_get_contents("php://input"), true);

// Validierung der Eingabedaten
$errors = [];
$response = ["success" => false, "message" => "Fehler bei der Validierung"];

if (empty($data['name']) || strlen(trim($data['name'])) < 2) {
    $errors['name'] = 'Name ist erforderlich (mindestens 2 Zeichen)';
}
if (empty($data['strasse']) || strlen(trim($data['strasse'])) < 5) {
    $errors['strasse'] = 'Straße ist erforderlich (mindestens 5 Zeichen)';
}
if (empty($data['telefonnummer']) || !preg_match('/^[\d\s\-\+\(\)]{8,}$/', $data['telefonnummer'])) {
    $errors['telefonnummer'] = 'Gültige Telefonnummer ist erforderlich';
}
if (!isset($data['cb_anzahl']) || !is_numeric($data['cb_anzahl']) || intval($data['cb_anzahl']) < 1 || intval($data['cb_anzahl']) > 10) {
    $errors['cb_anzahl'] = 'Anzahl Bäume muss zwischen 1 und 10 liegen';
}
if (!isset($data['money']) || !is_numeric($data['money']) || floatval($data['money']) < 0) {
    $errors['money'] = 'Gültiger Geldbetrag ist erforderlich';
}
if (!isset($data['lat']) || !is_numeric($data['lat']) || abs(floatval($data['lat'])) > 90) {
    $errors['lat'] = 'Gültige Latitude erforderlich';
}
if (!isset($data['lng']) || !is_numeric($data['lng']) || abs(floatval($data['lng'])) > 180) {
    $errors['lng'] = 'Gültige Longitude erforderlich';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Validierungsfehler',
        'errors' => $errors
    ]);
    exit;
}

try {
    // Sanitize input data
    $name = trim($data['name']);
    $strasse = trim($data['strasse']);
    $telefonnummer = trim($data['telefonnummer']);
    $lat = floatval($data['lat']);
    $lng = floatval($data['lng']);
    $cb_anzahl = intval($data['cb_anzahl']);
    $money = floatval($data['money']);

    // Prüfen ob ähnlicher Eintrag bereits existiert (Duplikatschutz)
    $duplicateCheck = $conn->prepare("SELECT id FROM anmeldungen WHERE name = ? AND strasse = ? AND telefonnummer = ?");
    $duplicateCheck->bind_param("sss", $name, $strasse, $telefonnummer);
    $duplicateCheck->execute();
    $duplicateResult = $duplicateCheck->get_result();
    
    if ($duplicateResult->num_rows > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Ein ähnlicher Eintrag existiert bereits!'
        ]);
        $duplicateCheck->close();
        $conn->close();
        exit;
    }
    $duplicateCheck->close();

    // Daten in Datenbank einfügen
    $sql = $conn->prepare("INSERT INTO anmeldungen (name, strasse, telefonnummer, lat, lng, cb_anzahl, geld, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())");
    $sql->bind_param("sssddid", $name, $strasse, $telefonnummer, $lat, $lng, $cb_anzahl, $money);

    if ($sql->execute()) {
        $insertId = $conn->insert_id;
        echo json_encode([
            'success' => true,
            'message' => 'Anmeldung erfolgreich gespeichert!',
            'id' => $insertId
        ]);
    } else {
        throw new Exception('Fehler beim Speichern in der Datenbank');
    }
    
    $sql->close();
} catch (Exception $e) {
    error_log("Process anmeldung error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Serverfehler beim Speichern der Anmeldung'
    ]);
} finally {
    $conn->close();
}
?>

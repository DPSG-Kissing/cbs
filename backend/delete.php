<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Nur POST und DELETE Methoden erlauben
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Methode nicht erlaubt']);
    exit;
}

include("mysql_con.php");

// ID validieren
$id = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = isset($_POST['id']) ? intval($_POST['id']) : null;
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? intval($input['id']) : null;
}

if (!$id || $id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ungültige ID']);
    exit;
}

try {
    // Prüfen ob Eintrag existiert
    $checkSql = $conn->prepare("SELECT id FROM anmeldungen WHERE id = ?");
    $checkSql->bind_param("i", $id);
    $checkSql->execute();
    $result = $checkSql->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Eintrag nicht gefunden']);
        $checkSql->close();
        $conn->close();
        exit;
    }
    $checkSql->close();

    // Eintrag löschen
    $sql = $conn->prepare("DELETE FROM anmeldungen WHERE id = ?");
    $sql->bind_param("i", $id);
    
    if ($sql->execute()) {
        $success = $sql->affected_rows > 0;
        $message = $success ? 'Eintrag erfolgreich gelöscht!' : 'Kein Eintrag gelöscht';
        
        echo json_encode([
            'success' => $success,
            'message' => $message
        ]);
    } else {
        throw new Exception('Datenbankfehler beim Löschen');
    }
    
    $sql->close();
} catch (Exception $e) {
    error_log("Delete error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Serverfehler beim Löschen des Eintrags'
    ]);
} finally {
    $conn->close();
}
?>

<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de"); // Nur diese Domain erlauben
header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); // Erlaubte Methoden
header("Access-Control-Allow-Headers: Content-Type"); // Erlaubte Header

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Behandelt Preflight-Anfragen
    http_response_code(200);
    exit;
}

include("mysql_con.php");

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'], $_POST['status'])) {
    $id = intval($_POST['id']); // Nur Integer-Werte erlauben
    $status = intval($_POST['status']); // Nur 0 oder 1 erlauben

    $sql = $conn->prepare("UPDATE anmeldungen SET status=? WHERE id=?");
    $sql->bind_param("ii", $status, $id);

    $sql->execute();
    $success = $sql->affected_rows > 0;

    $sql->close();
    $conn->close();

    echo json_encode([
        'success' => $success,
        'message' => $success ? 'Änderung erfolgreich' : 'Änderung fehlgeschlagen',
    ]);
}
?>

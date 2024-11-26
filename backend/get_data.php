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

$sql = "SELECT * FROM anmeldungen ORDER BY strasse ASC";

$query = mysqli_query($conn, $sql);
$output = [];

while ($row = $query->fetch_assoc()) {
    $output[] = $row;
}
$conn->close();

// JSON-Ausgabe
header('Content-Type: application/json; charset=utf-8');
echo json_encode($output, JSON_UNESCAPED_UNICODE);
?>

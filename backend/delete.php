<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de"); // Erlaubte Domain
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE"); // Erlaubte Methoden
header("Access-Control-Allow-Headers: Content-Type"); // Erlaubte Header

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); // OPTIONS-Anfrage akzeptieren
    exit;
}

include("mysql_con.php");

$sql = $conn->prepare("DELETE FROM anmeldungen WHERE id=?");
$sql->bind_param("i", $id);

$id = $_POST['id'];

$sql->execute();
$sql->close();
$conn->close();

// Json Output
$data = [
    'success' => true,
    'message' => 'Eintrag erfolgreich gelöscht!',
];

echo json_encode($data);
?>

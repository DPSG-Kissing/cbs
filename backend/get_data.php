<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include("mysql_con.php");

$sql = "SELECT * FROM anmeldungen ORDER BY strasse ASC";
$result = mysqli_query($conn, $sql);
$output = [];

while ($row = mysqli_fetch_assoc($result)) {
    $output[] = $row;
}

$conn->close();
echo json_encode($output, JSON_UNESCAPED_UNICODE);
?>
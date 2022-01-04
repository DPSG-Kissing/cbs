<?php
$servername = "db5006048456.hosting-data.io";
$username = "dbu1208048";
$password = "!xk?5Q4ry$!dL9Qk";
$dbname = "dbs5065641";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
mysqli_set_charset($conn, "utf8");

$sql = $conn->prepare("UPDATE anmeldungen SET status=? WHERE id=?");
$sql->bind_param("ii", $status, $id);

$id = $_POST['id'];
$status = $_POST['status'];

$sql->execute();
$sql->close();
$conn->close();

// Json Output
$data = [];

    $data['success'] = true;
    $data['message'] = 'Success!';

echo json_encode($data);
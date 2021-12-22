<?php
/**
 * Created by IntelliJ IDEA.
 * User: Luca
 * Date: 16.05.2019
 * Time: 19:37
 */
$servername = "db5006048456.hosting-data.io";
$username = "dbu1208048";
$password = "!xk?5Q4ry$!dL9Qk";
$dbname = "dbs5065641";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
mysqli_set_charset($conn, "utf8");

$sql = "SELECT * FROM anmeldungen ORDER BY name ASC";

$query = mysqli_query($conn,$sql);

while($row = $query->fetch_assoc()){
    $output[]=$row;
}
$conn->close();
// Json Output
echo json_encode($output,JSON_UNESCAPED_UNICODE);

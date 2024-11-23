<?php
include("mysql_con.php");


$sql = "SELECT * FROM anmeldungen ORDER BY strasse ASC";

$query = mysqli_query($conn,$sql);

while($row = $query->fetch_assoc()){
    $output[]=$row;
}
$conn->close();
// Json Output
echo json_encode($output,JSON_UNESCAPED_UNICODE);

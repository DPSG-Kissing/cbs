<?php
include("mysql_con.php");


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
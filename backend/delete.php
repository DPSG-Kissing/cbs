<?php
include("mysql_con.php");


$sql = $conn->prepare("DELETE FROM anmeldungen WHERE id=?");
$sql->bind_param("i", $id);

$id = $_POST['id'];

$sql->execute();
$sql->close();
$conn->close();

// Json Output
$data = [];

    $data['success'] = true;
    $data['message'] = 'Success!';

echo json_encode($data);
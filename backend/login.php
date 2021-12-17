<?php
$errors = [];
$data = [];

$password=$_POST['password_hash'];

if ($password != "b0c5f417a5a9c8af7e19cfb341d9fad0869baa9d473652fcba4ae5a872db6b30") {
    $errors['password_hash'] = "Password Hash is false";
}

if (!empty($errors)) {
    $data['success'] = false;
    $data['errors'] = $errors;
} else {
    $data['success'] = true;
    $data['message'] = 'Success!';
}

echo json_encode($data);
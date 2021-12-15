<?php

$errors = [];
$data = [];

if (empty($_POST['name'])) {
    $errors['name'] = 'Name is required.';
}

if (empty($_POST['strasse'])) {
    $errors['strass'] = 'Strasse is required.';
}

if (empty($_POST['cb_anzahl'])) {
    $errors['cb_anzahl'] = 'Anzahl Bäume is required.';
}

if (!empty($errors)) {
    $data['success'] = false;
    $data['errors'] = $errors;
} else {
    $data['success'] = true;
    $data['message'] = 'Success!';
}

echo json_encode($data);
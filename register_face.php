<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $face_description = $_POST['face_description'] ?? '';
    
    if (empty($name) || empty($email)) {
        echo json_encode(['success' => false, 'error' => 'Name and email are required']);
        exit;
    }
    
    try {
        // Check if student already exists by email
        $stmt = $pdo->prepare("SELECT id FROM students WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Email already registered. Please use a different email or contact admin.']);
            exit;
        }
        
        // Create uploads directory if not exists
        $uploadDir = '../uploads/faces/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        // Save face image using email as filename
        $emailSafe = preg_replace('/[^a-zA-Z0-9]/', '_', $email);
        $imagePath = $uploadDir . $emailSafe . '_' . time() . '.jpg';
        move_uploaded_file($_FILES['face_image']['tmp_name'], $imagePath);
        
        // Insert NEW student (auto-increment ID will be generated)
        $sql = "INSERT INTO students (name, email, face_description, face_image_path, registered, registration_date) 
                VALUES (?, ?, ?, ?, 1, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$name, $email, $face_description, $imagePath]);
        
        $newId = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Face registered successfully! You can now use face recognition.',
            'student_id' => $newId,
            'name' => $name,
            'email' => $email
        ]);
        
    } catch(Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}
?>
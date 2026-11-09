<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);
$student_id = $data['student_id'] ?? null;
$student_name = $data['student_name'] ?? null;

if (!$student_id && !$student_name) {
    echo json_encode(['success' => false, 'error' => 'Student ID or name required']);
    exit;
}

try {
    // Find student by ID or name
    if ($student_id) {
        $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
        $stmt->execute([$student_id]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM students WHERE name = ?");
        $stmt->execute([$student_name]);
    }
    
    $student = $stmt->fetch();
    
    if (!$student) {
        echo json_encode(['success' => false, 'error' => 'Student not found']);
        exit;
    }
    
    $today = date('Y-m-d');
    $now = new DateTime();
    $current_time = $now->format('H:i:s');
    
    // Check if already marked today
    $stmt = $pdo->prepare("SELECT id FROM attendance WHERE student_id = ? AND checkin_date = ?");
    $stmt->execute([$student['id'], $today]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        echo json_encode(['success' => false, 'error' => 'Already marked present today', 'already_marked' => true]);
        exit;
    }
    
    // Mark attendance
    $status = $now->format('H:i') > '10:00' ? 'late' : 'present';
    $stmt = $pdo->prepare("INSERT INTO attendance (student_id, student_name, status, checkin_time, checkin_date) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$student['id'], $student['name'], $status, $current_time, $today]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Attendance marked successfully',
        'student' => $student['name'],
        'time' => $now->format('h:i A'),
        'status' => $status
    ]);
    
} catch(Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
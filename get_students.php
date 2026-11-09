<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

try {
    // Get ONLY registered students
    $stmt = $pdo->query("SELECT id, name, email, registered, registration_date FROM students WHERE registered = 1 ORDER BY registration_date DESC");
    $students = $stmt->fetchAll();
    
    // Get today's attendance for these students
    $today = date('Y-m-d');
    foreach($students as &$student) {
        $stmt = $pdo->prepare("SELECT status, checkin_time FROM attendance WHERE student_id = ? AND checkin_date = ?");
        $stmt->execute([$student['id'], $today]);
        $attendance = $stmt->fetch();
        
        $student['todayStatus'] = $attendance ? $attendance['status'] : 'absent';
        $student['checkinTime'] = $attendance ? date('h:i A', strtotime($attendance['checkin_time'])) : null;
    }
    
    echo json_encode([
        'success' => true, 
        'students' => $students,
        'total_registered' => count($students)
    ]);
    
} catch(Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
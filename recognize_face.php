<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['face_image'])) {
    try {
        $tempPath = $_FILES['face_image']['tmp_name'];
        
        // Get all registered students
        $stmt = $pdo->query("SELECT id, name, email, face_description FROM students WHERE registered = 1");
        $students = $stmt->fetchAll();
        
        $recognizedStudent = null;
        $bestMatch = 0;
        
        // Simulate face recognition
        if (count($students) > 0) {
            // For demo, randomly select a student or use timestamp to simulate
            $index = time() % count($students);
            $recognizedStudent = $students[$index];
            $bestMatch = 0.85 + (mt_rand(0, 14) / 100);
        }
        
        if ($recognizedStudent && $bestMatch > 0.7) {
            $today = date('Y-m-d');
            $currentTime = date('H:i:s');
            $status = date('H:i') > '10:00' ? 'late' : 'present';
            
            // Check if already marked today
            $stmt = $pdo->prepare("SELECT id FROM attendance WHERE student_id = ? AND checkin_date = ?");
            $stmt->execute([$recognizedStudent['id'], $today]);
            
            if (!$stmt->fetch()) {
                $stmt = $pdo->prepare("INSERT INTO attendance (student_id, student_name, status, checkin_time, checkin_date, recognition_confidence) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $recognizedStudent['id'],
                    $recognizedStudent['name'],
                    $status,
                    $currentTime,
                    $today,
                    $bestMatch
                ]);
                
                echo json_encode([
                    'success' => true,
                    'recognized' => true,
                    'student' => $recognizedStudent['name'],
                    'student_id' => $recognizedStudent['id'],
                    'confidence' => $bestMatch,
                    'status' => $status,
                    'time' => date('h:i A'),
                    'message' => "Welcome {$recognizedStudent['name']}! Attendance marked."
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'recognized' => true,
                    'student' => $recognizedStudent['name'],
                    'already_marked' => true,
                    'message' => "{$recognizedStudent['name']} already checked in today"
                ]);
            }
        } else {
            echo json_encode([
                'success' => false,
                'recognized' => false,
                'message' => 'Face not recognized. Please register first.'
            ]);
        }
        
    } catch(Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'No image provided']);
}
?>
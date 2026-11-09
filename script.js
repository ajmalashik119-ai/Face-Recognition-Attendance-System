// API Configuration
const API_BASE = 'http://localhost/faceattend/api/';

// Global state
let students = [];

// API Calls
async function fetchStats() {
    try {
        const response = await fetch(API_BASE + 'get_stats.php');
        const data = await response.json();
        if (data.success) {
            renderStats(data);
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function fetchStudents() {
    try {
        const response = await fetch(API_BASE + 'get_students.php');
        const data = await response.json();
        if (data.success) {
            students = data.students;
            renderAdminTable();
            renderLiveLog();
            buildQuickStudentList();
            updateKioskLiveCounter();

            // Show message if no students
            if (students.length === 0) {
                const adminBody = document.getElementById('adminTableBody');
                if (adminBody) {
                    adminBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">📭 No students registered yet.<br>Students need to scan QR code and register their face first.</td></tr>';
                }
            }
        }
    } catch (error) {
        console.error('Error fetching students:', error);
    }
}

async function markAttendance(studentId, studentName) {
    try {
        const response = await fetch(API_BASE + 'mark_attendance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, student_name: studentName })
        });
        const data = await response.json();

        if (data.success) {
            await fetchStudents(); // Refresh data
            showTemporaryMessage('recogHint', `✅ ${data.student} marked ${data.status} at ${data.time}`);
            return true;
        } else if (data.already_marked) {
            showTemporaryMessage('recogHint', `⚠️ Already marked present today`);
            return false;
        } else {
            showTemporaryMessage('recogHint', `❌ ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        showTemporaryMessage('recogHint', `❌ Network error`);
        return false;
    }
}

async function resetAllData() {
    if (confirm('⚠️ This will reset ALL attendance records for today. Are you sure?')) {
        try {
            const response = await fetch(API_BASE + 'reset_all.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: true })
            });
            const data = await response.json();
            if (data.success) {
                await fetchStudents();
                await fetchStats();
                showTemporaryMessage('recogHint', '✅ All attendance reset successfully');
            }
        } catch (error) {
            console.error('Error resetting:', error);
        }
    }
}

async function registerStudent() {
    // This function is now handled by register.html
    window.location.href = 'register.html';
}

// Render functions
function renderStats(stats) {
    const container = document.getElementById('statsContainer');
    if (container) {
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.totalReg}</div>
                <div class="stat-label">Total Registered</div>
                ${stats.totalReg === 0 ? '<div class="badge-verify">📭 Empty - Register first</div>' : ''}
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.presentToday}</div>
                <div class="stat-label">Present Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.absentToday}</div>
                <div class="stat-label">Absent Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.avgVerify}s</div>
                <div class="stat-label">Avg Verify Time <span class="badge-verify">⚡ real-time</span></div>
            </div>
        `;
    }
    const totalRegDisplay = document.getElementById('totalRegDisplay');
    if (totalRegDisplay) totalRegDisplay.innerText = stats.totalReg;
}

function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:40px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                    <div style="font-size: 16px; color: #666;">No students registered yet</div>
                    <div style="font-size: 14px; color: #999; margin-top: 8px;">
                        Students need to scan the QR code and register their face first
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    students.forEach(s => {
        const row = tbody.insertRow();
        row.insertCell(0).innerHTML = `<strong>${s.name}</strong><div style="font-size:12px;">ID: ${s.id}</div>`;
        row.insertCell(1).innerText = s.email;
        row.insertCell(2).innerHTML = `<span class="${s.todayStatus === 'present' ? 'status-present' : 'status-absent'}" style="padding:4px 12px; border-radius:60px;">${s.todayStatus === 'present' ? '✅ Present' : '❌ Absent'}</span>`;
        row.insertCell(3).innerText = s.checkinTime || '--:-- --';

        const actionCell = row.insertCell(4);
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = s.todayStatus === 'present' ? 'Mark Absent' : 'Mark Present';
        toggleBtn.style.background = '#f0f2f5';
        toggleBtn.style.border = 'none';
        toggleBtn.style.borderRadius = '40px';
        toggleBtn.style.padding = '6px 14px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.onclick = () => markAttendance(s.id, s.name);
        actionCell.appendChild(toggleBtn);
    });
}

function renderLiveLog() {
    const logContainer = document.getElementById('liveLogList');
    if (!logContainer) return;

    if (students.length === 0) {
        logContainer.innerHTML = '<div style="padding: 20px; text-align:center; color:gray;">No students registered yet.<br>Use QR code to register first student.</div>';
        return;
    }

    const presentStudents = students.filter(s => s.todayStatus === 'present').sort((a, b) => {
        if (a.checkinTime && b.checkinTime) {
            return b.checkinTime.localeCompare(a.checkinTime);
        }
        return 0;
    });

    if (presentStudents.length === 0) {
        logContainer.innerHTML = '<div style="padding: 20px; text-align:center; color:gray;">No check-ins yet today.<br>Students need to scan their face at kiosk.</div>';
        return;
    }

    logContainer.innerHTML = presentStudents.map(s => `
        <div class="log-item">
            <div><span class="student-info">${s.name}</span><div class="student-detail">${s.email}</div></div>
            <div class="time-badge">${s.checkinTime || 'Just now'}</div>
        </div>
    `).join('');
}

function updateKioskLiveCounter() {
    const cnt = students.filter(s => s.todayStatus === 'present').length;
    const el = document.getElementById('liveMarkCount');
    if (el) el.innerText = `${cnt} marked present`;
}

function buildQuickStudentList() {
    const container = document.getElementById('quickStudentList');
    if (!container) return;
    container.innerHTML = '';

    if (students.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align:center; color:#999;">No registered students yet.<br>First student needs to register via QR code.</div>';
        return;
    }

    students.slice(0, 6).forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'student-sim';
        btn.innerText = s.name;
        btn.onclick = async () => {
            await markAttendance(s.id, s.name);
            const cameraMsg = document.getElementById('cameraStatusMsg');
            if (cameraMsg) {
                cameraMsg.innerHTML = '🎥 Face detected!';
                setTimeout(() => { if (cameraMsg) cameraMsg.innerHTML = 'Camera feed ready'; }, 1000);
            }
        };
        container.appendChild(btn);
    });
}

function showTemporaryMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = message;
        setTimeout(() => {
            if (element && element.innerHTML === message) {
                element.innerHTML = 'Looking for a face...';
            }
        }, 2000);
    }
}

// Kiosk Face Recognition
let kioskVideo = null;

async function initKioskCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        kioskVideo = document.getElementById('kioskWebcam');
        if (kioskVideo) {
            kioskVideo.srcObject = stream;
        }
    } catch (error) {
        console.error('Camera error:', error);
        showTemporaryMessage('recogHint', '❌ Camera access denied');
    }
}

async function recognizeFace() {
    if (!kioskVideo || !kioskVideo.videoWidth) {
        showTemporaryMessage('recogHint', '❌ Please start camera first');
        return;
    }

    showTemporaryMessage('recogHint', '🔍 Analyzing face...');

    const canvas = document.createElement('canvas');
    canvas.width = kioskVideo.videoWidth;
    canvas.height = kioskVideo.videoHeight;
    canvas.getContext('2d').drawImage(kioskVideo, 0, 0);

    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('face_image', blob, 'scan.jpg');

        try {
            const response = await fetch(API_BASE + 'recognize_face.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success && result.recognized) {
                if (result.already_marked) {
                    showTemporaryMessage('recogHint', `⚠️ ${result.student} - Already checked in today`);
                } else {
                    showTemporaryMessage('recogHint', `✅ ${result.message} (${Math.round(result.confidence * 100)}% match)`);
                    await fetchStudents();
                }
            } else {
                showTemporaryMessage('recogHint', `❌ ${result.message || 'Face not recognized'}`);
            }
        } catch (error) {
            console.error('Recognition error:', error);
            showTemporaryMessage('recogHint', '❌ Recognition failed');
        }
    }, 'image/jpeg');
}

// Panel toggling
function hideAllPanels() {
    const admin = document.getElementById('adminPanel');
    const kiosk = document.getElementById('kioskPanel');
    const student = document.getElementById('studentPortalPanel');
    if (admin) admin.style.display = 'none';
    if (kiosk) kiosk.style.display = 'none';
    if (student) student.style.display = 'none';
}

function showAdmin() {
    hideAllPanels();
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) adminPanel.style.display = 'block';
    fetchStudents();
}

function showKiosk() {
    hideAllPanels();
    const kioskPanel = document.getElementById('kioskPanel');
    if (kioskPanel) kioskPanel.style.display = 'block';
    fetchStudents();
    initKioskCamera();
}

function showStudentPortal() {
    hideAllPanels();
    const studentPanel = document.getElementById('studentPortalPanel');
    if (studentPanel) studentPanel.style.display = 'block';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Portal buttons
    document.getElementById('openAdminBtn')?.addEventListener('click', showAdmin);
    document.getElementById('openKioskBtn')?.addEventListener('click', showKiosk);
    document.getElementById('openStudentPortalBtn')?.addEventListener('click', showStudentPortal);

    // Close buttons
    document.getElementById('closeAdminBtn')?.addEventListener('click', hideAllPanels);
    document.getElementById('closeKioskBtn')?.addEventListener('click', () => {
        if (kioskVideo && kioskVideo.srcObject) {
            kioskVideo.srcObject.getTracks().forEach(track => track.stop());
        }
        hideAllPanels();
    });
    document.getElementById('closeStudentBtn')?.addEventListener('click', hideAllPanels);

    // Action buttons
    document.getElementById('resetAllDataBtn')?.addEventListener('click', resetAllData);
    document.getElementById('continueOnDeviceBtn')?.addEventListener('click', () => {
        window.location.href = 'register.html';
    });
    document.getElementById('simulateScanBtn')?.addEventListener('click', () => {
        if (students.length > 0) {
            const randomStudent = students[Math.floor(Math.random() * students.length)];
            markAttendance(randomStudent.id, randomStudent.name);
        } else {
            showTemporaryMessage('recogHint', '❌ No students registered yet. Please register first.');
        }
    });

    document.getElementById('startRecognitionBtn')?.addEventListener('click', () => {
        recognizeFace();
    });

    // Initial load
    fetchStats();
    fetchStudents();
});
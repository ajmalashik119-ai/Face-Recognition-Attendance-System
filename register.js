// JavaScript source code
// Face Registration Logic
// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const capturedImage = document.getElementById('capturedImage');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const registerBtn = document.getElementById('registerBtn');
const spinner = document.getElementById('spinner');
const statusDiv = document.getElementById('status');
const previewInfo = document.getElementById('previewInfo');

// Global variables
let capturedPhoto = null;
let faceDescriptor = null;
let stream = null;
let isProcessing = false;

// API Configuration
const API_BASE_URL = 'http://localhost/faceattend/api/';

// Initialize webcam on page load
async function initWebcam() {
    try {
        // Request camera access
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        showStatus('info', '✅ Camera ready. Please capture your photo.');
        console.log('Webcam initialized successfully');

    } catch (error) {
        console.error('Camera error:', error);

        if (error.name === 'NotAllowedError') {
            showStatus('error', 'Camera access denied. Please allow camera access and refresh the page.');
        } else if (error.name === 'NotFoundError') {
            showStatus('error', 'No camera found. Please connect a camera and refresh.');
        } else {
            showStatus('error', 'Unable to access camera. Please check your permissions.');
        }
    }
}

// Capture photo from webcam
captureBtn.addEventListener('click', async () => {
    if (isProcessing) {
        showStatus('info', 'Please wait, processing...');
        return;
    }

    // Check if video is ready
    if (!video.videoWidth || !video.videoHeight) {
        showStatus('error', 'Camera not ready. Please wait a moment.');
        return;
    }

    try {
        isProcessing = true;
        captureBtn.disabled = true;
        showStatus('info', '📸 Capturing photo...');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to base64 image
        capturedPhoto = canvas.toDataURL('image/jpeg', 0.9);

        // Display captured image
        capturedImage.src = capturedPhoto;
        capturedImage.style.display = 'block';
        video.style.display = 'none';

        // Update UI
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'block';
        previewInfo.innerHTML = '✅ Photo captured! Analyzing face...';

        // Extract face features for registration
        await extractFaceFeatures(capturedPhoto);

    } catch (error) {
        console.error('Capture error:', error);
        showStatus('error', 'Failed to capture photo. Please try again.');
        captureBtn.disabled = false;
    } finally {
        isProcessing = false;
    }
});

// Retake photo
retakeBtn.addEventListener('click', () => {
    // Reset UI
    capturedImage.style.display = 'none';
    video.style.display = 'block';
    retakeBtn.style.display = 'none';
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;
    registerBtn.disabled = true;
    previewInfo.innerHTML = '';

    // Reset data
    capturedPhoto = null;
    faceDescriptor = null;

    showStatus('info', 'Please capture your photo again.');
});

// Extract face features using backend API
async function extractFaceFeatures(imageDataURL) {
    showStatus('info', '🔍 Analyzing face features...');
    previewInfo.innerHTML = '🔍 Analyzing face... Please wait';

    try {
        // Convert base64 to blob
        const blob = await dataURLtoBlob(imageDataURL);

        // Create form data for upload
        const formData = new FormData();
        formData.append('face_image', blob, 'face_capture.jpg');

        // Send to backend for face detection
        const response = await fetch(API_BASE_URL + 'extract_face_features.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success && result.has_face) {
            faceDescriptor = result.face_descriptor;
            showStatus('success', '✅ Face detected successfully! You can now register.');
            previewInfo.innerHTML = '✅ Face detected! Ready for registration.';
            registerBtn.disabled = false;
        } else {
            showStatus('error', '❌ No face detected or poor quality. Please retake photo with better lighting.');
            previewInfo.innerHTML = '❌ Face not detected. Please retake.';
            // Auto retake after 2 seconds
            setTimeout(() => {
                retakeBtn.click();
            }, 2000);
        }

    } catch (error) {
        console.error('Face extraction error:', error);
        showStatus('error', 'Error processing face. Please check your connection and try again.');
        previewInfo.innerHTML = '❌ Processing failed. Please retake.';
    }
}

// Helper function: Convert dataURL to Blob
function dataURLtoBlob(dataURL) {
    return new Promise((resolve, reject) => {
        try {
            const parts = dataURL.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);

            for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }

            resolve(new Blob([uInt8Array], { type: contentType }));
        } catch (error) {
            reject(error);
        }
    });
}

// Register student with face data
document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form values
    const name = document.getElementById('studentName').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const email = document.getElementById('studentEmail').value.trim();

    // Validation
    if (!name || !studentId || !email) {
        showStatus('error', 'Please fill in all fields.');
        return;
    }

    if (!capturedPhoto || !faceDescriptor) {
        showStatus('error', 'Please capture your photo first.');
        return;
    }

    // Validate student ID format
    if (!/^[A-Za-z0-9]+$/.test(studentId)) {
        showStatus('error', 'Student ID should contain only letters and numbers.');
        return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatus('error', 'Please enter a valid email address.');
        return;
    }

    // Confirm registration
    const confirmMsg = `Please confirm your details:\n\nName: ${name}\nStudent ID: ${studentId}\nEmail: ${email}\n\nDo you want to register this face?`;
    if (!confirm(confirmMsg)) {
        return;
    }

    // Show loading
    spinner.style.display = 'block';
    registerBtn.disabled = true;
    showStatus('info', '📤 Registering your face to the system...');

    try {
        // Convert captured photo to blob
        const photoBlob = await dataURLtoBlob(capturedPhoto);

        // Create form data for registration
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);  // No student_id anymore
        formData.append('face_image', photoBlob, `${email}.jpg`);
        formData.append('face_description', JSON.stringify(faceDescription));

        // Send registration request
        const response = await fetch(API_BASE_URL + 'register_face.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showStatus('success', '✅ Registration successful! You can now use face recognition for attendance.');

            // Play success sound (optional)
            playSuccessSound();

            // Redirect after 3 seconds
            setTimeout(() => {
                if (confirm('Registration successful! Do you want to go to the main portal?')) {
                    window.location.href = 'index.html';
                } else {
                    // Reset form for another registration
                    resetForm();
                }
            }, 3000);
        } else {
            showStatus('error', 'Registration failed: ' + (result.error || 'Unknown error'));
            registerBtn.disabled = false;
        }

    } catch (error) {
        console.error('Registration error:', error);
        showStatus('error', 'Network error. Please check your connection and try again.');
        registerBtn.disabled = false;
    } finally {
        spinner.style.display = 'none';
    }
});

// Reset form for new registration
function resetForm() {
    // Reset form fields
    document.getElementById('studentName').value = '';
    document.getElementById('studentId').value = '';
    document.getElementById('studentEmail').value = '';

    // Reset photo capture
    capturedImage.style.display = 'none';
    video.style.display = 'block';
    retakeBtn.style.display = 'none';
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;
    registerBtn.disabled = true;
    previewInfo.innerHTML = '';

    // Reset data
    capturedPhoto = null;
    faceDescriptor = null;

    showStatus('info', 'Form reset. You can register another student.');
}

// Show status message
function showStatus(type, message) {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    // Auto hide after 5 seconds for success/info, 8 seconds for error
    const duration = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
        if (statusDiv.className === `status ${type}`) {
            statusDiv.style.display = 'none';
        }
    }, duration);
}

// Play success sound (optional)
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.1;

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
        oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
        // Silent fail if audio not supported
        console.log('Audio not supported');
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    initWebcam();

    // Add input validation feedback
    document.getElementById('studentId').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Za-z0-9]/g, '');
    });

    document.getElementById('studentName').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '');
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Press 'c' to capture
    if (e.key === 'c' && captureBtn.style.display !== 'none' && !captureBtn.disabled) {
        e.preventDefault();
        captureBtn.click();
    }
    // Press 'r' to retake
    if (e.key === 'r' && retakeBtn.style.display === 'block') {
        e.preventDefault();
        retakeBtn.click();
    }
    // Press 'Enter' to submit when form is ready
    if (e.key === 'Enter' && !registerBtn.disabled && registerBtn.style.display !== 'none') {
        e.preventDefault();
        if (document.getElementById('registrationForm').checkValidity()) {
            registerBtn.click();
        }
    }
});
// AWS Configuration - Replace with your actual API endpoints
const API_ENDPOINT = 'YOUR_API_GATEWAY_ENDPOINT_HERE'; // e.g., https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
const STATUS_ENDPOINT = `${API_ENDPOINT}/status`;
const OUTPUT_BUCKET = 'YOUR_SUBTITLES_BUCKET_NAME'; // e.g., autosub-subtitles-v2
const AWS_REGION = 'us-east-1';

// Global variables
let currentFile = null;
let s3Key = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const downloadSection = document.getElementById('downloadSection');
const errorSection = document.getElementById('errorSection');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadBtn = document.getElementById('uploadBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');
const tryAgainBtn = document.getElementById('tryAgainBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // File selection
    selectFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // Upload controls
    uploadBtn.addEventListener('click', handleUpload);
    cancelBtn.addEventListener('click', resetUpload);
    tryAgainBtn.addEventListener('click', resetUpload);
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Validate file type
    if (!file.type.includes('video/mp4') && !file.name.endsWith('.mp4')) {
        showError('Please select an MP4 video file');
        return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > maxSize) {
        showError('File size must be less than 500MB');
        return;
    }

    currentFile = file;
    displayFileInfo(file);
}

function displayFileInfo(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    uploadSection.classList.remove('hidden');
    dropZone.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function handleUpload() {
    if (!currentFile) return;

    try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';

        // Show processing section
        uploadSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        updateStep(1, 'active');

        // Upload to S3
        await uploadToS3(currentFile);
        updateStep(1, 'completed');

        // Start processing
        updateStep(2, 'active');
        await simulateProcessing();

    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message || 'Upload failed. Please try again.');
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Video';
    }
}

async function uploadToS3(file) {
    try {
        // Get presigned URL from API
        const response = await fetch(`${API_ENDPOINT}/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: file.name,
                contentType: file.type
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get upload URL');
        }

        const data = await response.json();
        const { uploadUrl, s3Key: key } = data;
        s3Key = key;

        // Upload file to S3 using presigned URL
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file');
        }

        console.log('File uploaded successfully:', s3Key);

    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload video. Please try again.');
    }
}

async function simulateProcessing() {
    try {
        // Processing Lambda is triggered automatically by S3 event
        // Poll for completion
        updateStep(2, 'completed');
        updateStep(3, 'active');

        // Wait for transcription to complete
        const result = await waitForTranscription();

        updateStep(3, 'completed');
        updateStep(4, 'active');

        // Show download section
        await sleep(1000);
        updateStep(4, 'completed');

        showDownloadSection(result.downloadUrl);

    } catch (error) {
        console.error('Processing error:', error);
        throw new Error('Processing failed. Please try again.');
    }
}

async function waitForTranscription() {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            // Call status API
            const response = await fetch(`${STATUS_ENDPOINT}?s3Key=${encodeURIComponent(s3Key)}`);

            if (!response.ok) {
                throw new Error('Failed to check status');
            }

            const data = await response.json();

            if (data.status === 'COMPLETED') {
                return {
                    downloadUrl: data.downloadUrl,
                    language: data.language
                };
            } else if (data.status === 'FAILED') {
                throw new Error('Transcription failed');
            }

            // Still in progress, wait and retry
            await sleep(5000); // Poll every 5 seconds
            attempts++;

        } catch (error) {
            console.error('Status check error:', error);
            await sleep(5000);
            attempts++;
        }
    }

    throw new Error('Transcription timeout. Please try again later.');
}

function showDownloadSection(downloadUrl) {
    processingSection.classList.add('hidden');
    downloadSection.classList.remove('hidden');

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.onclick = () => handleDownload(downloadUrl);
}

function handleDownload(downloadUrl) {
    // Download the subtitle file
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = currentFile.name.replace('.mp4', '.srt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateStep(stepNumber, status) {
    const step = document.querySelector(`[data-step="${stepNumber}"]`);
    if (!step) return;

    const icon = step.querySelector('.step-icon');
    const text = step.querySelector('.step-text');

    // Remove all status classes
    step.classList.remove('active', 'completed');
    icon.classList.remove('fa-spinner', 'fa-spin', 'fa-check', 'fa-circle');

    if (status === 'active') {
        step.classList.add('active');
        icon.classList.add('fa-spinner', 'fa-spin');
    } else if (status === 'completed') {
        step.classList.add('completed');
        icon.classList.add('fa-check');
    } else {
        icon.classList.add('fa-circle');
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
    uploadSection.classList.add('hidden');
    processingSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
}

function resetUpload() {
    currentFile = null;
    s3Key = null;
    fileInput.value = '';

    uploadSection.classList.add('hidden');
    processingSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    dropZone.style.display = 'flex';

    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Video';

    // Reset all steps
    for (let i = 1; i <= 4; i++) {
        updateStep(i, 'pending');
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

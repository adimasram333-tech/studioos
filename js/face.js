// face.js
// Core Face Recognition Engine (StudioOS)
// FIXED VERSION (Browser Compatible - No Export Errors)

let faceModelsLoaded = false;

// ==============================
// LOAD MODELS
// ==============================
async function loadFaceModels() {
    if (faceModelsLoaded) return;

    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js/models";

    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    faceModelsLoaded = true;
    console.log("✅ Face models loaded");
}

// ==============================
// DETECT FACES FROM IMAGE
// ==============================
async function detectFacesFromImage(imageElement) {
    if (!faceModelsLoaded) {
        throw new Error("Face models not loaded");
    }

    const detections = await faceapi
        .detectAllFaces(imageElement)
        .withFaceLandmarks()
        .withFaceDescriptors();

    return detections;
}

// ==============================
// GET DESCRIPTORS (ENCODINGS)
// ==============================
function extractFaceEncodings(detections) {
    return detections.map(d => Array.from(d.descriptor));
}

// ==============================
// DETECT SINGLE FACE (SELFIE)
// ==============================
async function detectSingleFace(imageElement) {
    if (!faceModelsLoaded) {
        throw new Error("Face models not loaded");
    }

    const detection = await faceapi
        .detectSingleFace(imageElement)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) return null;

    return Array.from(detection.descriptor);
}

// ==============================
// MATCH FACES
// ==============================
function matchFaces(selfieEncoding, storedEncodings, threshold = 0.5) {
    const matchedImages = [];

    for (let item of storedEncodings) {
        const distance = faceapi.euclideanDistance(
            new Float32Array(selfieEncoding),
            new Float32Array(item.face_encoding)
        );

        if (distance < threshold) {
            matchedImages.push(item.image_url);
        }
    }

    return matchedImages;
}

// ==============================
// LOAD IMAGE FROM URL
// ==============================
function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;

        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

// ==============================
// PROCESS IMAGE (UPLOAD SIDE)
// ==============================
async function processImageForFaces(imageUrl) {
    try {
        await loadFaceModels();

        const img = await loadImageFromUrl(imageUrl);

        const detections = await detectFacesFromImage(img);

        if (!detections || detections.length === 0) {
            console.log("⚠️ No face detected");
            return [];
        }

        const encodings = extractFaceEncodings(detections);

        return encodings;

    } catch (error) {
        console.error("Face processing error:", error);
        return [];
    }
}

// ==============================
// PROCESS SELFIE (CLIENT SIDE)
// ==============================
async function processSelfie(imageFile) {
    try {
        await loadFaceModels();

        const img = await faceapi.bufferToImage(imageFile);

        const encoding = await detectSingleFace(img);

        if (!encoding) {
            console.log("❌ No face found in selfie");
            return null;
        }

        return encoding;

    } catch (error) {
        console.error("Selfie processing error:", error);
        return null;
    }
}

// ==============================
// 🔥 MAIN FUNCTION (VERY IMPORTANT FIX)
// ==============================

async function getFaceEncoding(imageUrl) {
    try {
        const encodings = await processImageForFaces(imageUrl);

        if (!encodings || encodings.length === 0) {
            return null;
        }

        return encodings[0]; // first face only

    } catch (err) {
        console.error("Encoding error:", err);
        return null;
    }
}

// ==============================
// MAKE GLOBAL (VERY IMPORTANT)
// ==============================

window.loadFaceModels = loadFaceModels;
window.detectFacesFromImage = detectFacesFromImage;
window.extractFaceEncodings = extractFaceEncodings;
window.detectSingleFace = detectSingleFace;
window.matchFaces = matchFaces;
window.loadImageFromUrl = loadImageFromUrl;
window.processImageForFaces = processImageForFaces;
window.processSelfie = processSelfie;
window.getFaceEncoding = getFaceEncoding; // ✅ FIXED
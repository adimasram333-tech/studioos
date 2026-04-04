// face.js
// Core Face Recognition Engine (StudioOS)
// FINAL FIXED VERSION (Browser Safe + Local Models)

let faceModelsLoaded = false;

// ==============================
// LOAD MODELS
// ==============================
async function loadFaceModels() {
    if (faceModelsLoaded) return;

    try {
        // ✅ FIX: LOCAL MODEL PATH
        const MODEL_URL = "/studioos/models";

        console.log("Loading models from:", MODEL_URL);

        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        faceModelsLoaded = true;
        console.log("✅ Face models loaded");

    } catch (err) {
        console.error("❌ Face load error:", err);
        faceModelsLoaded = false;
    }
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
// DETECT FACES
// ==============================
async function detectFacesFromImage(imageElement) {
    if (!faceModelsLoaded) {
        throw new Error("Face models not loaded");
    }

    return await faceapi
        .detectAllFaces(imageElement)
        .withFaceLandmarks()
        .withFaceDescriptors();
}

// ==============================
// EXTRACT ENCODINGS
// ==============================
function extractFaceEncodings(detections) {
    return detections.map(d => Array.from(d.descriptor));
}

// ==============================
// SINGLE FACE (SELFIE)
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
// MATCH
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
// PROCESS IMAGE (UPLOAD)
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

        return extractFaceEncodings(detections);

    } catch (error) {
        console.error("Face processing error:", error);
        return [];
    }
}

// ==============================
// PROCESS SELFIE (CLIENT)
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
// MAIN FUNCTION
// ==============================
async function getFaceEncoding(imageUrl) {
    try {
        const encodings = await processImageForFaces(imageUrl);

        if (!encodings || encodings.length === 0) {
            return null;
        }

        return encodings[0];

    } catch (err) {
        console.error("Encoding error:", err);
        return null;
    }
}

// ==============================
// ✅ GLOBAL EXPORT (IMPORTANT)
// ==============================
window.faceEngine = {
    loadFaceModels,
    detectFacesFromImage,
    extractFaceEncodings,
    detectSingleFace,
    matchFaces,
    loadImageFromUrl,
    processImageForFaces,
    processSelfie,
    getFaceEncoding
};

// ==============================
// ✅ AUTO LOAD MODELS (IMPORTANT FIX)
// ==============================
window.addEventListener("load", () => {
    loadFaceModels();
});
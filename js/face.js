// face.js
// Core Face Recognition Engine (StudioOS)
// DO NOT MODIFY EXISTING SYSTEM — this is standalone module

let faceModelsLoaded = false;

// ==============================
// LOAD MODELS
// ==============================
export async function loadFaceModels() {
    if (faceModelsLoaded) return;

    const MODEL_URL = "/models"; // make sure models folder exists

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
export async function detectFacesFromImage(imageElement) {
    if (!faceModelsLoaded) {
        throw new Error("Face models not loaded");
    }

    const detections = await faceapi
        .detectAllFaces(imageElement)
        .withFaceLandmarks()
        .withFaceDescriptors();

    return detections; // array
}

// ==============================
// GET DESCRIPTORS (ENCODINGS)
// ==============================
export function extractFaceEncodings(detections) {
    return detections.map(d => Array.from(d.descriptor));
}

// ==============================
// DETECT SINGLE FACE (SELFIE)
// ==============================
export async function detectSingleFace(imageElement) {
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
export function matchFaces(selfieEncoding, storedEncodings, threshold = 0.5) {
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
export function loadImageFromUrl(url) {
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
export async function processImageForFaces(imageUrl) {
    try {
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
export async function processSelfie(imageFile) {
    try {
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
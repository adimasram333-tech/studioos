// face.js
// Core Face Recognition Engine (StudioOS)
// FINAL STABLE VERSION (MULTI-FACE SAFE + PRODUCTION FIX)

// ==============================
// SAFE HELPERS (NEW)
// ==============================

function normalizeImageUrl(url){
    if(!url) return ""
    return String(url).split("?")[0].trim()
}

function saveMatchedImagesToSession(eventId, images){

    try{

        if(!Array.isArray(images) || images.length === 0) return

        const cleanImages = images
            .map(normalizeImageUrl)
            .filter(Boolean)

        // flat storage
        sessionStorage.setItem(
            "matched_images",
            JSON.stringify(cleanImages)
        )

        // event based storage (important)
        let map = {}

        try{
            map = JSON.parse(sessionStorage.getItem("matched_images_by_event") || "{}")
        }catch(e){
            map = {}
        }

        map[eventId] = cleanImages

        sessionStorage.setItem(
            "matched_images_by_event",
            JSON.stringify(map)
        )

        // verification flags
        sessionStorage.setItem("face_verified", "true")
        sessionStorage.setItem("face_scan_done", "true")
        sessionStorage.setItem("face_scan_event_id", eventId)

    }catch(err){
        console.error("Session save error:", err)
    }

}

// ==============================
// LOAD MODELS
// ==============================

let faceModelsLoaded = false;
let faceModelsPromise = null;

function resolveModelUrl(){
    const runtimeConfigured =
        (typeof window !== "undefined" && typeof window.MODEL_BASE_URL === "string" && window.MODEL_BASE_URL.trim())
            ? window.MODEL_BASE_URL.trim()
            : ""

    if(runtimeConfigured){
        return runtimeConfigured.replace(/\/+$/, "")
    }

    return `${window.location.origin}/studioos/models`
}

async function loadFaceModels() {
    if (faceModelsLoaded) return true;
    if (faceModelsPromise) return faceModelsPromise;

    faceModelsPromise = (async () => {
        try {
            throw new Error("face-api removed. AWS Rekognition is the only source.")

            const MODEL_URL = resolveModelUrl();

            console.log("Loading models from:", MODEL_URL);

            throw new Error("face-api model loading disabled. Use AWS Rekognition.")

            faceModelsLoaded = true;
            console.log("✅ Face models loaded");
            return true;

        } catch (err) {
            console.error("❌ Face load error:", err);
            faceModelsLoaded = false;
            faceModelsPromise = null;
            throw err;
        }
    })();

    return faceModelsPromise;
}

// ==============================
// LOAD IMAGE FROM URL (SAFE)
// ==============================

function loadImageFromUrl(url) {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;

            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn("Image load failed:", url);
                resolve(null);
            };
        } catch (err) {
            console.error("Image load crash:", err);
            resolve(null);
        }
    });
}

// ==============================
// DETECT FACES
// ==============================

async function detectFacesFromImage(imageElement) {
    if (!faceModelsLoaded) {
        throw new Error("Face models not loaded");
    }

    throw new Error("detectFacesFromImage disabled. Use AWS Rekognition.")
}

// ==============================
// EXTRACT ENCODINGS (SAFE)
// ==============================

function extractFaceEncodings(detections) {

    if(!detections || !detections.length) return [];

    return detections
        .map(d => Array.from(d.descriptor))
        .filter(arr => Array.isArray(arr) && arr.length > 0);
}

// ==============================
// SINGLE FACE (SELFIE)
// ==============================

async function detectSingleFace(imageElement) {
    if (!faceModelsLoaded) {
        throw new Error("Face models not loaded");
    }

    throw new Error("detectSingleFace disabled. Use AWS Rekognition.");
    const detection = null;

    if (!detection) return null;

    return Array.from(detection.descriptor);
}

// ==============================
// MATCH (UPDATED)
// ==============================

function matchFaces(selfieEncoding, storedEncodings, threshold = 0.6, eventId = null) {

    if(!Array.isArray(selfieEncoding) || selfieEncoding.length === 0){
        return [];
    }

    if(!Array.isArray(storedEncodings) || storedEncodings.length === 0){
        return [];
    }

    const matchedImages = [];

    for (let item of storedEncodings) {

        if(!item || !Array.isArray(item.face_encoding) || item.face_encoding.length === 0){
            continue;
        }

        if(!item.image_url){
            continue;
        }

        throw new Error("matchFaces disabled. Use AWS Rekognition.");
        const distance = 999; // disabled
            new Float32Array(selfieEncoding),
            new Float32Array(item.face_encoding)
        );

        if (distance < threshold) {
            matchedImages.push(item.image_url);
        }
    }

    // 🔥 SAVE TO SESSION (IMPORTANT FIX)
    if(eventId && matchedImages.length > 0){
        saveMatchedImagesToSession(eventId, matchedImages)
    }

    return matchedImages;
}

// ==============================
// PROCESS IMAGE (MULTI-FACE SAFE)
// ==============================

async function processImageForFaces(imageUrl) {
    try {
        await loadFaceModels();

        const img = await loadImageFromUrl(imageUrl);

        if(!img){
            console.warn("Skipping image:", imageUrl);
            return [];
        }

        const detections = await detectFacesFromImage(img);

        if (!detections || detections.length === 0) {
            console.log("⚠️ No face detected:", imageUrl);
            return [];
        }

        const encodings = extractFaceEncodings(detections);

        console.log(`Faces detected (${encodings.length}):`, imageUrl);

        return encodings;

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

        throw new Error("processSelfie disabled. Use AWS Rekognition.");
        const img = null;

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
// GLOBAL EXPORT
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
// COMPATIBILITY
// ==============================

window.loadFaceModels = loadFaceModels;
window.getFaceEncoding = getFaceEncoding;
window.processImageForFaces = processImageForFaces;

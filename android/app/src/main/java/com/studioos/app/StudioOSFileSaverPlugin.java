package com.studioos.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.ClipData;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Locale;

@CapacitorPlugin(name = "StudioOSFileSaver")
public class StudioOSFileSaverPlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String base64Data = readBase64Data(call);
        String fileName = sanitizeFileName(call.getString("fileName", "studioos-file"));
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String target = call.getString("target", "downloads");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Missing file data");
            return;
        }

        try {
            byte[] bytes = decodeBase64(base64Data);

            if (bytes.length == 0) {
                call.reject("Empty file data");
                return;
            }

            Uri savedUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                savedUri = saveWithMediaStore(bytes, fileName, mimeType, target);
            } else {
                savedUri = saveLegacy(bytes, fileName, target);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("uri", savedUri != null ? savedUri.toString() : "");
            result.put("fileName", fileName);

            call.resolve(result);
        } catch (Exception error) {
            call.reject("File save failed: " + safeErrorMessage(error), error);
        }
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        String base64Data = readBase64Data(call);
        String fileName = sanitizeFileName(call.getString("fileName", "studioos-file"));
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String text = call.getString("text", "");
        String title = call.getString("title", "Share with StudioOS");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Missing file data");
            return;
        }

        try {
            byte[] bytes = decodeBase64(base64Data);

            if (bytes.length == 0) {
                call.reject("Empty file data");
                return;
            }

            Uri shareUri = writeShareCacheFile(bytes, fileName);

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            prepareShareIntent(shareIntent, shareUri, fileName, mimeType, text);

            Intent chooser = Intent.createChooser(shareIntent, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("uri", shareUri.toString());
            result.put("fileName", fileName);

            call.resolve(result);
        } catch (Exception error) {
            call.reject("File share failed: " + safeErrorMessage(error), error);
        }
    }

    @PluginMethod
    public void saveAndShareFile(PluginCall call) {
        String base64Data = readBase64Data(call);
        String fileName = sanitizeFileName(call.getString("fileName", "studioos-file"));
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String target = call.getString("target", "downloads");
        String text = call.getString("text", "");
        String title = call.getString("title", "Share with StudioOS");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Missing file data");
            return;
        }

        try {
            byte[] bytes = decodeBase64(base64Data);

            if (bytes.length == 0) {
                call.reject("Empty file data");
                return;
            }

            Uri savedUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                savedUri = saveWithMediaStore(bytes, fileName, mimeType, target);
            } else {
                savedUri = saveLegacy(bytes, fileName, target);
            }

            Uri shareUri = writeShareCacheFile(bytes, fileName);

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            prepareShareIntent(shareIntent, shareUri, fileName, mimeType, text);

            Intent chooser = Intent.createChooser(shareIntent, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("savedUri", savedUri != null ? savedUri.toString() : "");
            result.put("shareUri", shareUri.toString());
            result.put("fileName", fileName);

            call.resolve(result);
        } catch (Exception error) {
            call.reject("File save/share failed: " + safeErrorMessage(error), error);
        }
    }

    private String readBase64Data(PluginCall call) {
        String base64Data = call.getString("base64Data", "");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            base64Data = call.getString("dataUrl", "");
        }

        if (base64Data == null || base64Data.trim().isEmpty()) {
            base64Data = call.getString("fileData", "");
        }

        if (base64Data == null || base64Data.trim().isEmpty()) {
            base64Data = call.getString("base64", "");
        }

        return base64Data;
    }

    private byte[] decodeBase64(String value) {
        String safeValue = String.valueOf(value == null ? "" : value).trim();

        if (safeValue.contains(",")) {
            safeValue = safeValue.substring(safeValue.indexOf(",") + 1);
        }

        safeValue = safeValue.replaceAll("\\s+", "");

        return Base64.decode(safeValue, Base64.DEFAULT);
    }

    private Uri saveWithMediaStore(byte[] bytes, String fileName, String mimeType, String target) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();

        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri collection;

        if (isImageTarget(target, mimeType)) {
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/StudioOS");
            collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        } else {
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/StudioOS");
            collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        }

        Uri itemUri = resolver.insert(collection, values);

        if (itemUri == null) {
            throw new Exception("Unable to create file");
        }

        try (OutputStream outputStream = resolver.openOutputStream(itemUri)) {
            if (outputStream == null) {
                throw new Exception("Unable to open output stream");
            }

            outputStream.write(bytes);
            outputStream.flush();
        } catch (Exception error) {
            try {
                resolver.delete(itemUri, null, null);
            } catch (Exception ignored) {
                // Ignore cleanup failure.
            }

            throw error;
        }

        values.clear();
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(itemUri, values, null, null);

        return itemUri;
    }

    private Uri saveLegacy(byte[] bytes, String fileName, String target) throws Exception {
        File baseDir;

        if (String.valueOf(target).toLowerCase(Locale.ROOT).contains("image")) {
            baseDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "StudioOS");
        } else {
            baseDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "StudioOS");
        }

        if (!baseDir.exists() && !baseDir.mkdirs()) {
            throw new Exception("Unable to create folder");
        }

        File outputFile = new File(baseDir, fileName);

        try (FileOutputStream outputStream = new FileOutputStream(outputFile)) {
            outputStream.write(bytes);
            outputStream.flush();
        }

        return Uri.fromFile(outputFile);
    }

    private Uri writeShareCacheFile(byte[] bytes, String fileName) throws Exception {
        File shareDir = new File(getContext().getCacheDir(), "studioos_share");

        if (!shareDir.exists() && !shareDir.mkdirs()) {
            throw new Exception("Unable to create share folder");
        }

        File outputFile = new File(shareDir, fileName);

        try (FileOutputStream outputStream = new FileOutputStream(outputFile)) {
            outputStream.write(bytes);
            outputStream.flush();
        }

        return FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            outputFile
        );
    }

    private boolean isImageTarget(String target, String mimeType) {
        String safeTarget = String.valueOf(target).toLowerCase(Locale.ROOT);
        String safeMime = String.valueOf(mimeType).toLowerCase(Locale.ROOT);

        return safeTarget.contains("image") || safeTarget.contains("picture") || safeMime.startsWith("image/");
    }

    private String sanitizeFileName(String value) {
        String safe = String.valueOf(value == null ? "studioos-file" : value)
            .replaceAll("[\\\\/:*?\"<>|\\x00-\\x1F]", "_")
            .replaceAll("\\s+", "_")
            .trim();

        if (safe.isEmpty()) {
            safe = "studioos-file";
        }

        if (!safe.contains(".")) {
            safe = safe + ".bin";
        }

        return safe;
    }


    private void prepareShareIntent(Intent shareIntent, Uri shareUri, String fileName, String mimeType, String text) {
        shareIntent.setType(mimeType);
        shareIntent.putExtra(Intent.EXTRA_STREAM, shareUri);

        String safeText = text == null ? "" : text.trim();

        if (!safeText.isEmpty()) {
            shareIntent.putExtra(Intent.EXTRA_TEXT, safeText);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "StudioOS");
            shareIntent.putExtra(Intent.EXTRA_TITLE, safeText);
        }

        try {
            shareIntent.setClipData(
                ClipData.newUri(
                    getContext().getContentResolver(),
                    fileName,
                    shareUri
                )
            );
        } catch (Exception ignored) {
            // Some Android versions can still share using EXTRA_STREAM alone.
        }

        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }


    private String safeErrorMessage(Exception error) {
        String message = error != null ? error.getMessage() : null;
        return message == null || message.trim().isEmpty() ? "Unknown error" : message;
    }
}

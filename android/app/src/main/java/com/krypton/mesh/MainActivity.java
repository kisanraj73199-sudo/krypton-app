package com.krypton.mesh;

import android.Manifest;
import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String CHANNEL_ID = "krypton_native_alerts";
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ActivityResultLauncher<Intent> biometricLauncher;
    private PermissionRequest pendingWebRtcRequest;
    private boolean isCallFlagSecureActive = false;
    private String pendingUpdateApkUrl = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    String dataString = result.getData().getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    } else if (result.getData().getClipData() != null) {
                        int count = result.getData().getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = result.getData().getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        );

        biometricLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (this.bridge != null && this.bridge.getWebView() != null) {
                    if (result.getResultCode() == Activity.RESULT_OK) {
                        this.bridge.getWebView().evaluateJavascript(
                            "window.onKryptonNativeBiometricResult && window.onKryptonNativeBiometricResult(true);",
                            null
                        );
                    } else {
                        this.bridge.getWebView().evaluateJavascript(
                            "window.onKryptonNativeBiometricResult && window.onKryptonNativeBiometricResult(false);",
                            null
                        );
                    }
                }
            }
        );

        super.onCreate(savedInstanceState);

        int obsidianBg = Color.parseColor("#06080F");
        getWindow().getDecorView().setBackgroundColor(obsidianBg);
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(obsidianBg));
        getWindow().setStatusBarColor(obsidianBg);
        getWindow().setNavigationBarColor(obsidianBg);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
        }

        createNativeNotificationChannel();
        checkAndRequestPermissions();

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();

            webView.setBackgroundColor(obsidianBg);
            if (webView.getParent() instanceof android.view.View) {
                ((android.view.View) webView.getParent()).setBackgroundColor(obsidianBg);
            }
            if (webView.getRootView() != null) {
                webView.getRootView().setBackgroundColor(obsidianBg);
            }

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            // CRITICAL: Disable HTTP disk cache so upgraded APK ALWAYS loads new HTML, CSS & JS immediately!
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

            // Clear WebView disk cache whenever APK versionCode increases (preserves localStorage / login!)
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                int curCode = pInfo.versionCode;
                SharedPreferences prefs = getSharedPreferences("krypton_apk_meta", MODE_PRIVATE);
                int lastCode = prefs.getInt("last_version_code", -1);
                if (curCode != lastCode) {
                    webView.clearCache(true);
                    prefs.edit().putInt("last_version_code", curCode).apply();
                }
            } catch (Exception ignored) {}

            webView.addJavascriptInterface(new KryptonNativeBridge(), "KryptonNative");

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        boolean hasCam = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                        boolean hasMic = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                        if (hasCam && hasMic) {
                            request.grant(request.getResources());
                        } else {
                            pendingWebRtcRequest = request;
                            checkAndRequestPermissions();
                        }
                    });
                }

                @Override
                public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallbackParam,
                    FileChooserParams fileChooserParams
                ) {
                    if (MainActivity.this.filePathCallback != null) {
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                    }
                    MainActivity.this.filePathCallback = filePathCallbackParam;

                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    String[] acceptTypes = fileChooserParams != null ? fileChooserParams.getAcceptTypes() : null;
                    if (acceptTypes != null && acceptTypes.length > 0 && acceptTypes[0] != null && !acceptTypes[0].isEmpty() && !acceptTypes[0].contains(".")) {
                        intent.setType(acceptTypes[0]);
                    } else {
                        intent.setType("image/*");
                    }

                    Intent chooserIntent = Intent.createChooser(intent, "Select Photo or File");
                    try {
                        fileChooserLauncher.launch(chooserIntent);
                    } catch (Exception e) {
                        MainActivity.this.filePathCallback = null;
                        return false;
                    }
                    return true;
                }
            });
        }
    }

    private void applyCallOnlyFlagSecure(boolean blockCapture) {
        isCallFlagSecureActive = blockCapture;
        runOnUiThread(() -> {
            if (blockCapture) {
                getWindow().setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                );
            } else {
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
        });
    }

    private void createNativeNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Krypton Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for messages and incoming calls");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE && pendingWebRtcRequest != null) {
            runOnUiThread(() -> {
                try {
                    pendingWebRtcRequest.grant(pendingWebRtcRequest.getResources());
                } catch (Exception ignored) {}
                pendingWebRtcRequest = null;
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applyCallOnlyFlagSecure(isCallFlagSecureActive);
        if (pendingUpdateApkUrl != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (getPackageManager().canRequestPackageInstalls()) {
                String urlToResume = pendingUpdateApkUrl;
                pendingUpdateApkUrl = null;
                new KryptonNativeBridge().downloadAndInstallUpdate(urlToResume);
            }
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyCallOnlyFlagSecure(isCallFlagSecureActive);
        }
    }

    private void checkAndRequestPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    public class KryptonNativeBridge {
        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public void setCallCaptureBlock(boolean blockOnCall) {
            applyCallOnlyFlagSecure(blockOnCall);
        }

        @JavascriptInterface
        public String getAppVersionName() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionName != null ? pInfo.versionName : "2.5.0";
            } catch (Exception e) {
                return "2.5.0";
            }
        }

        // Native HTTP Manifest Fetcher (Reads version.json from GitHub Releases following 302 redirects without CORS!)
        @JavascriptInterface
        public void checkUpdateManifestNative(String manifestUrl) {
            new Thread(() -> {
                try {
                    String currentUrl = manifestUrl + (manifestUrl.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis();
                    HttpURLConnection conn = null;

                    for (int redirects = 0; redirects < 6; redirects++) {
                        conn = (HttpURLConnection) new URL(currentUrl).openConnection();
                        conn.setInstanceFollowRedirects(false);
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(15000);
                        conn.setRequestProperty("User-Agent", "Krypton-Android-Updater");
                        conn.setRequestProperty("Cache-Control", "no-cache");
                        conn.connect();

                        int code = conn.getResponseCode();
                        if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                            String loc = conn.getHeaderField("Location");
                            conn.disconnect();
                            if (loc == null || loc.isEmpty()) break;
                            currentUrl = loc;
                        } else {
                            break;
                        }
                    }

                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    final String b64Json = Base64.encodeToString(sb.toString().getBytes("UTF-8"), Base64.NO_WRAP);
                    runOnUiThread(() -> {
                        if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                            MainActivity.this.bridge.getWebView().evaluateJavascript(
                                "window.onKryptonNativeManifestResult && window.onKryptonNativeManifestResult('" + b64Json + "');",
                                null
                            );
                        }
                    });
                } catch (Exception e) {
                    runOnUiThread(() -> {
                        if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                            MainActivity.this.bridge.getWebView().evaluateJavascript(
                                "window.onKryptonNativeManifestResult && window.onKryptonNativeManifestResult('');",
                                null
                            );
                        }
                    });
                }
            }).start();
        }

        @JavascriptInterface
        public void requestCallPermissions() {
            runOnUiThread(() -> checkAndRequestPermissions());
        }

        @JavascriptInterface
        public void requestMediaPermissions() {
            runOnUiThread(() -> checkAndRequestPermissions());
        }

        @JavascriptInterface
        public void showNativeNotification(String title, String message) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, MainActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    PendingIntent pendingIntent = PendingIntent.getActivity(
                        MainActivity.this, 0, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, CHANNEL_ID)
                        .setSmallIcon(getApplicationInfo().icon)
                        .setContentTitle(title)
                        .setContentText(message)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent);

                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager != null) {
                        manager.notify((int) (System.currentTimeMillis() % 10000), builder.build());
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public boolean isBiometricAvailable() {
            try {
                KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                return km != null && km.isKeyguardSecure();
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void authenticateBiometric() {
            runOnUiThread(() -> {
                try {
                    KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                    if (km != null && km.isKeyguardSecure()) {
                        Intent authIntent = km.createConfirmDeviceCredentialIntent(
                            "Krypton Privacy Shield",
                            "Use Fingerprint, Face Unlock or Screen Lock to unlock Krypton"
                        );
                        if (authIntent != null) {
                            biometricLauncher.launch(authIntent);
                            return;
                        }
                    }
                    Toast.makeText(MainActivity.this, "Please set a Fingerprint or Screen Lock in Android Settings first.", Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Biometric prompt error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void reloadUpdatedWebApp() {
            runOnUiThread(() -> {
                if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                    WebView wv = MainActivity.this.bridge.getWebView();
                    wv.clearCache(true);
                    wv.reload();
                    Toast.makeText(MainActivity.this, "Krypton Updated Successfully!", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void downloadAndInstallUpdate(String apkUrl) {
            runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (!getPackageManager().canRequestPackageInstalls()) {
                            pendingUpdateApkUrl = apkUrl;
                            Toast.makeText(MainActivity.this, "Allow 'Install unknown apps' — download will start automatically!", Toast.LENGTH_LONG).show();
                            Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
                            startActivity(settingsIntent);
                            return;
                        }
                    }

                    pendingUpdateApkUrl = null;
                    Toast.makeText(MainActivity.this, "Downloading Krypton Update...", Toast.LENGTH_SHORT).show();

                    new Thread(() -> {
                        try {
                            File updateFile = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "krypton.apk");
                            if (updateFile.exists()) updateFile.delete();

                            String currentUrl = apkUrl + (apkUrl.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis();
                            HttpURLConnection conn = null;

                            for (int redirects = 0; redirects < 6; redirects++) {
                                conn = (HttpURLConnection) new URL(currentUrl).openConnection();
                                conn.setInstanceFollowRedirects(false);
                                conn.setConnectTimeout(20000);
                                conn.setReadTimeout(45000);
                                conn.setRequestProperty("User-Agent", "Krypton-Android-Updater");
                                conn.setRequestProperty("Accept", "application/octet-stream, */*");
                                conn.connect();

                                int code = conn.getResponseCode();
                                if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                                    String loc = conn.getHeaderField("Location");
                                    conn.disconnect();
                                    if (loc == null || loc.isEmpty()) break;
                                    currentUrl = loc;
                                } else {
                                    break;
                                }
                            }

                            int fileLength = conn.getContentLength();
                            InputStream input = new BufferedInputStream(conn.getInputStream());
                            FileOutputStream output = new FileOutputStream(updateFile);

                            byte[] data = new byte[8192];
                            long total = 0;
                            int count;
                            int lastReportedPct = -1;

                            while ((count = input.read(data)) != -1) {
                                total += count;
                                output.write(data, 0, count);
                                if (fileLength > 0) {
                                    int pct = (int) ((total * 100) / fileLength);
                                    if (pct != lastReportedPct && pct % 3 == 0) {
                                        lastReportedPct = pct;
                                        final int p = pct;
                                        runOnUiThread(() -> {
                                            if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                                                MainActivity.this.bridge.getWebView().evaluateJavascript(
                                                    "window.onKryptonApkDownloadProgress && window.onKryptonApkDownloadProgress(" + p + ");",
                                                    null
                                                );
                                            }
                                        });
                                    }
                                } else {
                                    int estPct = (int) Math.min(96, (total * 100) / (6 * 1024 * 1024));
                                    if (estPct != lastReportedPct && estPct % 5 == 0) {
                                        lastReportedPct = estPct;
                                        final int p = estPct;
                                        runOnUiThread(() -> {
                                            if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                                                MainActivity.this.bridge.getWebView().evaluateJavascript(
                                                    "window.onKryptonApkDownloadProgress && window.onKryptonApkDownloadProgress(" + p + ");",
                                                    null
                                                );
                                            }
                                        });
                                    }
                                }
                            }

                            output.flush();
                            output.close();
                            input.close();

                            runOnUiThread(() -> {
                                if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                                    MainActivity.this.bridge.getWebView().evaluateJavascript(
                                        "window.onKryptonApkDownloadProgress && window.onKryptonApkDownloadProgress(100);",
                                        null
                                    );
                                }
                                installApk(updateFile);
                            });
                        } catch (Exception ex) {
                            runOnUiThread(() -> {
                                if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                                    MainActivity.this.bridge.getWebView().evaluateJavascript(
                                        "window.onKryptonApkDownloadError && window.onKryptonApkDownloadError();",
                                        null
                                    );
                                }
                                Toast.makeText(MainActivity.this, "Download failed, tap Update to retry: " + ex.getMessage(), Toast.LENGTH_LONG).show();
                            });
                        }
                    }).start();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Update Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    private void installApk(File apkFile) {
        try {
            if (!apkFile.exists()) return;
            Uri apkUri = FileProvider.getUriForFile(
                this,
                getApplicationContext().getPackageName() + ".fileprovider",
                apkFile
            );
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
            startActivity(installIntent);
        } catch (Exception e) {
            Toast.makeText(this, "Install Trigger Failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
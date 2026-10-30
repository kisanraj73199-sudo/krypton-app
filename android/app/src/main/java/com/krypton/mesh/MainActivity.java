package com.krypton.mesh;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String CHANNEL_ID = "krypton_native_alerts";
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ActivityResultLauncher<Intent> biometricLauncher;
    private PermissionRequest pendingWebRtcRequest;
    private long downloadId = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 1. Block Both Screenshots AND Screen Recording (Blackout Screen Recorder)
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        // 2. Native Gallery Picker for DP Upload & File Attachments
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

        // 3. Native Android Hardware Biometric / Fingerprint / Face / Credential Unlock Launcher
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

        createNativeNotificationChannel();
        checkAndRequestPermissions();

        // 4. Configure WebView for DP Upload, WebRTC Call Popup, Biometrics & In-App Updater
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setAllowContentAccess(true);
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

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

    private void createNativeNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Krypton Encrypted Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for encrypted messages and incoming calls");
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
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            );
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
        public String getAppVersionName() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionName != null ? pInfo.versionName : "2.5.0";
            } catch (Exception e) {
                return "2.5.0";
            }
        }

        @JavascriptInterface
        public void requestCallPermissions() {
            runOnUiThread(() -> checkAndRequestPermissions());
        }

        @JavascriptInterface
        public void requestMediaPermissions() {
            runOnUiThread(() -> checkAndRequestPermissions());
        }

        // Native Android OS Notification Trigger
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

        // Native Android Hardware Biometric / Fingerprint / Face / Device Credential Support
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
                            Toast.makeText(MainActivity.this, "Please allow 'Install unknown apps' for Krypton to auto-update", Toast.LENGTH_LONG).show();
                            Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
                            startActivity(settingsIntent);
                            return;
                        }
                    }

                    Toast.makeText(MainActivity.this, "Downloading Krypton Update...", Toast.LENGTH_SHORT).show();

                    File updateFile = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Krypton-Update.apk");
                    if (updateFile.exists()) updateFile.delete();

                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
                    request.setTitle("Krypton App Update");
                    request.setDescription("Downloading latest Krypton APK...");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalFilesDir(MainActivity.this, Environment.DIRECTORY_DOWNLOADS, "Krypton-Update.apk");

                    DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    downloadId = manager.enqueue(request);

                    BroadcastReceiver onComplete = new BroadcastReceiver() {
                        @Override
                        public void onReceive(Context ctxt, Intent intent) {
                            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                            if (id == downloadId) {
                                installApk(updateFile);
                                try { unregisterReceiver(this); } catch (Exception ignored) {}
                            }
                        }
                    };

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
                    } else {
                        registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
                    }
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
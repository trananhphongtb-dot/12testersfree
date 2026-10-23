package vn.tester12.free;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.Executor;
import java.io.InputStream;
import java.util.Locale;

/**
 * Vỏ Android: hiển thị giao diện HTML trong assets/www qua một địa chỉ https nội bộ
 * (để Firebase lưu đăng nhập ổn định), và cung cấp vài chức năng gốc cho JavaScript.
 */
public class MainActivity extends Activity {

    static final String LOCAL_HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + LOCAL_HOST + "/www/index.html";

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private static final int PICK_FILE = 41;
    private OnBackInvokedCallback backCallback;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0F766E"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#F4F7F6"));
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Android 15+ luôn vẽ tràn viền: chừa chỗ cho thanh trạng thái và thanh điều hướng.
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int l, t, r, b;
                if (Build.VERSION.SDK_INT >= 30) {
                    android.graphics.Insets in = insets.getInsets(
                            WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                    l = in.left; t = in.top; r = in.right; b = in.bottom;
                } else {
                    l = insets.getSystemWindowInsetLeft();
                    t = insets.getSystemWindowInsetTop();
                    r = insets.getSystemWindowInsetRight();
                    b = insets.getSystemWindowInsetBottom();
                }
                v.setPadding(l, t, r, b);
                return insets;
            }
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebChromeClient(new WebChromeClient() {
            // Cho phép <input type="file"> mở thư viện ảnh (để tải ảnh chụp màn hình xác nhận)
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(i, null), PICK_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (LOCAL_HOST.equals(u.getHost())) {
                    return loadAsset(u.getPath());
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (LOCAL_HOST.equals(u.getHost())) return false;
                openExternal(u.toString());
                return true;
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }

        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = new OnBackInvokedCallback() {
                @Override
                public void onBackInvoked() {
                    handleBack();
                }
            };
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }

        ReminderReceiver.restore(this);
    }

    private WebResourceResponse loadAsset(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) path = "/www/index.html";
        String assetPath = path.startsWith("/") ? path.substring(1) : path;
        if (assetPath.contains("..")) return notFound();
        try {
            AssetManager am = getAssets();
            InputStream in = am.open(assetPath);
            WebResourceResponse res = new WebResourceResponse(mime(assetPath), "UTF-8", in);
            return res;
        } catch (IOException e) {
            return notFound();
        }
    }

    private WebResourceResponse notFound() {
        WebResourceResponse r = new WebResourceResponse("text/plain", "UTF-8", null);
        r.setStatusCodeAndReasonPhrase(404, "Not Found");
        return r;
    }

    private static String mime(String p) {
        String l = p.toLowerCase(Locale.ROOT);
        if (l.endsWith(".html")) return "text/html";
        if (l.endsWith(".js")) return "application/javascript";
        if (l.endsWith(".css")) return "text/css";
        if (l.endsWith(".svg")) return "image/svg+xml";
        if (l.endsWith(".png")) return "image/png";
        if (l.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private void handleBack() {
        web.evaluateJavascript("(window.onAndroidBack && window.onAndroidBack()) ? 'y' : 'n'", value -> {
            if (value == null || !value.contains("y")) finish();
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Chỉ dùng trên Android 12 trở xuống; từ Android 13 dùng OnBackInvokedCallback.
        handleBack();
    }

    @SuppressWarnings("deprecation")
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            result = new Uri[]{data.getData()};
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.onAndroidResume && window.onAndroidResume()", null);
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (web != null) web.destroy();
        super.onDestroy();
    }

    private final Executor uiExecutor = r -> runOnUiThread(r);

    private void jsCall(String fn, String arg) {
        String js = "window." + fn + " && window." + fn + "(" + JSONObject.quote(arg == null ? "" : arg) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    /** Hiện bảng chọn tài khoản Google của máy, trả ID token cho JavaScript (Firebase dùng để đăng nhập). */
    void googleSignIn(String webClientId) {
        GetSignInWithGoogleOption opt = new GetSignInWithGoogleOption.Builder(webClientId).build();
        GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(opt).build();
        CredentialManager cm = CredentialManager.create(this);
        cm.getCredentialAsync(this, req, new android.os.CancellationSignal(), uiExecutor,
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse res) {
                        Credential c = res.getCredential();
                        if (c instanceof CustomCredential
                                && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                            try {
                                GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(c.getData());
                                jsCall("onGoogleToken", g.getIdToken());
                            } catch (Exception e) {
                                jsCall("onGoogleError", "parse: " + e.getMessage());
                            }
                        } else {
                            jsCall("onGoogleError", "type: " + c.getType());
                        }
                    }

                    @Override
                    public void onError(GetCredentialException e) {
                        jsCall("onGoogleError", e instanceof GetCredentialCancellationException
                                ? "cancel" : (e.getType() + ": " + e.getMessage()));
                    }
                });
    }

    void googleSignOut() {
        CredentialManager.create(this).clearCredentialStateAsync(new ClearCredentialStateRequest(),
                new android.os.CancellationSignal(), uiExecutor,
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override public void onResult(Void v) { }
                    @Override public void onError(ClearCredentialException e) { }
                });
    }

    void openExternal(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, url, Toast.LENGTH_LONG).show();
        }
    }

    /** Các hàm JavaScript gọi được qua window.Android.xxx(). */
    class Bridge {
        @JavascriptInterface
        public void openUrl(final String url) {
            if (url == null) return;
            String u = url.trim();
            if (!(u.startsWith("https://") || u.startsWith("http://") || u.startsWith("market://")
                    || u.startsWith("mailto:"))) return;
            runOnUiThread(() -> openExternal(u));
        }

        @JavascriptInterface
        public void openApp(final String packageName) {
            runOnUiThread(() -> {
                Intent i = getPackageManager().getLaunchIntentForPackage(packageName);
                if (i != null) {
                    startActivity(i);
                } else {
                    openExternal("https://play.google.com/store/apps/details?id=" + packageName);
                }
            });
        }

        @JavascriptInterface
        public void googleSignIn(final String webClientId) {
            runOnUiThread(() -> MainActivity.this.googleSignIn(webClientId));
        }

        @JavascriptInterface
        public void googleSignOut() {
            runOnUiThread(() -> MainActivity.this.googleSignOut());
        }

        @JavascriptInterface
        public boolean isInstalled(String packageName) {
            try {
                getPackageManager().getPackageInfo(packageName, 0);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, null));
            });
        }

        @JavascriptInterface
        public void toast(final String text) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, text, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void setReminder(boolean enabled, int hour, int minute, String title, String body) {
            if (enabled && Build.VERSION.SDK_INT >= 33
                    && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7));
            }
            ReminderReceiver.save(MainActivity.this, enabled, hour, minute, title, body);
        }

        @JavascriptInterface
        public String appVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public String deviceLang() {
            return Locale.getDefault().getLanguage();
        }
    }
}

package io.github.joaquindiazm.orbit;

import android.app.Activity;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.net.URI;
import java.net.URISyntaxException;

public final class MainActivity extends Activity {
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private static final String LOCAL_PAGE = "https://" + LOCAL_HOST + "/assets/orbit/index.html";
    private static final int BACKGROUND = Color.rgb(14, 30, 46);
    private static final int INK = Color.rgb(218, 239, 248);
    private static final int ACCENT = Color.rgb(135, 232, 255);
    private LinearLayout root;
    private WebView web;
    private URI course;
    private TextView courseStatus;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BACKGROUND);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets padding = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(padding.left, padding.top, padding.right, padding.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(root);
        showLauncher();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView label(String text, int size, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        return view;
    }

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setMinHeight(dp(48));
        button.setBackgroundTintList(ColorStateList.valueOf(ACCENT));
        button.setTextColor(BACKGROUND);
        return button;
    }

    private void showLauncher() {
        disposeWeb();
        root.removeAllViews();
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        LinearLayout contents = new LinearLayout(this);
        contents.setOrientation(LinearLayout.VERTICAL);
        contents.setGravity(Gravity.CENTER_VERTICAL);
        contents.setPadding(dp(24), dp(12), dp(24), dp(12));
        scroll.addView(contents);
        root.addView(scroll);

        contents.addView(label(getString(R.string.orbit_app_name).toUpperCase(java.util.Locale.ROOT), 30, ACCENT));
        contents.addView(label("v" + BuildConfig.VERSION_NAME, 14, INK));
        TextView formLabel = label("Dirección HTTPS del curso", 16, INK);
        EditText address = new EditText(this);
        address.setId(android.view.View.generateViewId());
        formLabel.setLabelFor(address.getId());
        contents.addView(formLabel);
        address.setSingleLine(true);
        address.setTextColor(INK);
        address.setHintTextColor(INK);
        address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        address.setHint("https://");
        address.setText(getPreferences(MODE_PRIVATE).getString("server", ""));
        contents.addView(address);

        TextView status = label("", 15, INK);
        status.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
        LinearLayout actions = new LinearLayout(this);
        Button connect = button("Abrir curso");
        connect.setOnClickListener(view -> {
            URI target = courseAddress(address.getText().toString());
            if (target == null) {
                status.setText("Introduce el enlace HTTPS de ORBIT.");
                return;
            }
            getPreferences(MODE_PRIVATE).edit().putString("server", target.toASCIIString()).apply();
            open(target);
        });
        Button offline = button("ORBIT sin conexión");
        offline.setOnClickListener(view -> open(null));
        actions.addView(connect);
        actions.addView(offline);
        contents.addView(actions);
        contents.addView(status);
    }

    static URI courseAddress(String text) {
        String address = text.trim();
        if (address.length() > 2048 || address.chars().anyMatch(Character::isISOControl)) return null;
        try {
            URI uri = new URI(address);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getPort() == 0 || uri.getPort() > 65535 || LOCAL_HOST.equalsIgnoreCase(uri.getHost())) return null;
            String path = uri.getRawPath();
            if (!(path.isEmpty() || "/".equals(path) || "/index.html".equals(path))) return null;
            String query = uri.getRawQuery();
            if (query != null && !query.matches("course=[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")) return null;
            return new URI("https", null, uri.getHost(), uri.getPort(), path.isEmpty() ? "/" : path, query, null);
        } catch (URISyntaxException exception) {
            return null;
        }
    }

    private boolean permitted(Uri target) {
        if (!"https".equalsIgnoreCase(target.getScheme()) || target.getUserInfo() != null) return false;
        if (course == null) return LOCAL_HOST.equalsIgnoreCase(target.getHost()) && target.getPort() == -1;
        int port = target.getPort() == -1 ? 443 : target.getPort();
        return course.getHost().equalsIgnoreCase(target.getHost()) && port == (course.getPort() == -1 ? 443 : course.getPort());
    }

    private void open(URI target) {
        course = target;
        root.removeAllViews();
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        Button back = button("Inicio");
        back.setOnClickListener(view -> showLauncher());
        bar.addView(back);
        courseStatus = label("", 14, INK);
        courseStatus.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
        bar.addView(courseStatus);
        root.addView(bar);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClientCompat() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !permitted(request.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) courseStatus.setText("No se pudo abrir la página. Revisa el enlace o vuelve a Inicio.");
            }
        });
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        web.loadUrl(target == null ? LOCAL_PAGE : target.toASCIIString());
    }

    private void disposeWeb() {
        if (web == null) return;
        root.removeView(web);
        web.destroy();
        web = null;
        CookieManager.getInstance().flush();
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else if (web != null) showLauncher();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        disposeWeb();
        super.onDestroy();
    }
}

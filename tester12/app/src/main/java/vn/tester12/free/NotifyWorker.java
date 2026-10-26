package vn.tester12.free;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

/**
 * Kiểm tra ngầm khoảng 3 tiếng/lần (miễn phí, không cần máy chủ):
 *  - Có app mới cần test
 *  - App của mình có thêm người test / góp ý mới
 * Đọc Firestore qua REST (danh sách app cho đọc công khai).
 */
public class NotifyWorker extends Worker {

    static final String PREFS = "notify";
    static final String WORK = "tester12-check";
    static final String CHANNEL = "updates";

    public NotifyWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    // ---------------------------------------------------------------- lịch chạy
    static void configure(Context ctx, String cfgJson) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        WorkManager wm = WorkManager.getInstance(ctx);
        if (cfgJson == null || cfgJson.isEmpty()) {
            p.edit().clear().apply();
            wm.cancelUniqueWork(WORK);
            return;
        }
        String oldUid = "";
        try { oldUid = new JSONObject(p.getString("cfg", "{}")).optString("uid"); } catch (Exception ignored) { }
        SharedPreferences.Editor e = p.edit().putString("cfg", cfgJson);
        try {
            if (!oldUid.equals(new JSONObject(cfgJson).optString("uid"))) {
                // người dùng khác: bỏ số liệu cũ
                for (String k : p.getAll().keySet()) if (k.startsWith("t_") || k.startsWith("f_")) e.remove(k);
                e.putLong("lastSeen", System.currentTimeMillis());
            }
        } catch (Exception ignored) { }
        if (!p.contains("lastSeen")) e.putLong("lastSeen", System.currentTimeMillis());
        e.apply();

        Constraints cons = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(NotifyWorker.class, 3, TimeUnit.HOURS)
                .setConstraints(cons)
                .setInitialDelay(1, TimeUnit.HOURS)
                .build();
        wm.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, req);
    }

    static void markSeen(Context ctx, long t) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (t > p.getLong("lastSeen", 0)) p.edit().putLong("lastSeen", t).apply();
    }

    // ---------------------------------------------------------------- công việc
    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String cfgS = p.getString("cfg", "");
        if (cfgS.isEmpty()) return Result.success();
        try {
            JSONObject cfg = new JSONObject(cfgS);
            String uid = cfg.getString("uid");
            String base = "https://firestore.googleapis.com/v1/projects/" + cfg.getString("projectId")
                    + "/databases/(default)/documents:runQuery?key=" + cfg.getString("apiKey");
            String title = cfg.optString("title", "12 Testers Free");
            SharedPreferences.Editor ed = p.edit();

            // 1) app mới
            JSONObject q1 = new JSONObject("{\"structuredQuery\":{\"from\":[{\"collectionId\":\"apps\"}],"
                    + "\"orderBy\":[{\"field\":{\"fieldPath\":\"createdAt\"},\"direction\":\"DESCENDING\"}],\"limit\":30}}");
            JSONArray r1 = post(base, q1);
            long lastSeen = p.getLong("lastSeen", System.currentTimeMillis());
            long newest = lastSeen;
            int fresh = 0;
            for (int i = 0; i < r1.length(); i++) {
                JSONObject f = fields(r1.getJSONObject(i));
                if (f == null) continue;
                long created = ts(f, "createdAt");
                if (created > lastSeen && !uid.equals(str(f, "ownerUid")) && bool(f, "active", true)) fresh++;
                if (created > newest) newest = created;
            }
            if (fresh > 0) notify(ctx, 201, title, cfg.optString("newApps", "{n} new apps").replace("{n}", String.valueOf(fresh)));
            ed.putLong("lastSeen", newest);

            // 2) app của mình
            JSONObject q2 = new JSONObject("{\"structuredQuery\":{\"from\":[{\"collectionId\":\"apps\"}],"
                    + "\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"ownerUid\"},\"op\":\"EQUAL\",\"value\":{\"stringValue\":\"\"}}}}}");
            q2.getJSONObject("structuredQuery").getJSONObject("where").getJSONObject("fieldFilter")
                    .getJSONObject("value").put("stringValue", uid);
            JSONArray r2 = post(base, q2);
            int nid = 300;
            for (int i = 0; i < r2.length(); i++) {
                JSONObject doc = r2.getJSONObject(i).optJSONObject("document");
                JSONObject f = fields(r2.getJSONObject(i));
                if (doc == null || f == null) continue;
                String name = doc.getString("name");
                String id = name.substring(name.lastIndexOf('/') + 1);
                String appName = str(f, "name");
                long tc = num(f, "testersCount"), fc = num(f, "feedbackCount");
                long oldT = p.getLong("t_" + id, -1), oldF = p.getLong("f_" + id, -1);
                if (oldT >= 0 && tc > oldT) notify(ctx, nid++, title, cfg.optString("newTester", "{name}: new tester")
                        .replace("{name}", appName).replace("{n}", String.valueOf(tc)));
                if (oldF >= 0 && fc > oldF) notify(ctx, nid++, title, cfg.optString("newFb", "{name}: new feedback")
                        .replace("{name}", appName));
                ed.putLong("t_" + id, tc).putLong("f_" + id, fc);
            }
            ed.apply();
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    // ---------------------------------------------------------------- tiện ích
    private static JSONArray post(String url, JSONObject body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod("POST");
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        try (OutputStream o = c.getOutputStream()) { o.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        int code = c.getResponseCode();
        if (code != 200) throw new Exception("HTTP " + code);
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
            return new JSONArray(bo.toString("UTF-8"));
        } finally {
            c.disconnect();
        }
    }

    private static JSONObject fields(JSONObject row) {
        JSONObject d = row.optJSONObject("document");
        return d == null ? null : d.optJSONObject("fields");
    }
    private static String str(JSONObject f, String k) {
        JSONObject v = f.optJSONObject(k);
        return v == null ? "" : v.optString("stringValue", "");
    }
    private static long num(JSONObject f, String k) {
        JSONObject v = f.optJSONObject(k);
        if (v == null) return 0;
        try { return Long.parseLong(v.optString("integerValue", "0")); } catch (Exception e) { return 0; }
    }
    private static boolean bool(JSONObject f, String k, boolean def) {
        JSONObject v = f.optJSONObject(k);
        return v == null || !v.has("booleanValue") ? def : v.optBoolean("booleanValue", def);
    }
    private static long ts(JSONObject f, String k) {
        JSONObject v = f.optJSONObject(k);
        if (v == null) return 0;
        try { return Instant.parse(v.optString("timestampValue")).toEpochMilli(); } catch (Exception e) { return 0; }
    }

    static void notify(Context ctx, int id, String title, String text) {
        if (Build.VERSION.SDK_INT >= 33
                && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Cập nhật / Updates",
                NotificationManager.IMPORTANCE_DEFAULT));
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, id, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_notify)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(id, n);
    }
}

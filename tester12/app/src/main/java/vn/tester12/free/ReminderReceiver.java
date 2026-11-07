package vn.tester12.free;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Nhắc nhiệm vụ ngày lúc 8h, 11h, 20h (báo thức không chính xác, không cần quyền đặc biệt).
 * Chỉ báo khi hôm nay chưa đủ nhiệm vụ; tiến độ do app (JS) ghi vào bộ nhớ máy.
 */
public class ReminderReceiver extends BroadcastReceiver {

    static final String PREFS = "mission";
    static final String CHANNEL = "daily_test";
    static final int[] HOURS = {8, 11, 20};

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            restore(ctx);
            return;
        }
        showNotification(ctx);
    }

    static void saveMission(Context ctx, String json) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        if (json == null || json.isEmpty()) {
            e.putBoolean("on", false);
        } else {
            try {
                JSONObject o = new JSONObject(json);
                e.putBoolean("on", o.optBoolean("on", true))
                        .putString("day", o.optString("day", ""))
                        .putInt("n", o.optInt("n", 0))
                        .putInt("t", o.optInt("t", 0))
                        .putInt("per", o.optInt("per", 5))
                        .putString("title", o.optString("title", "12 Testers Free"))
                        .putString("body", o.optString("body", "{n}/{t}"));
            } catch (Exception ex) {
                return;
            }
        }
        e.apply();
        restore(ctx);
    }

    static void restore(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        for (int i = 0; i < HOURS.length; i++) {
            PendingIntent pi = alarmIntent(ctx, i);
            am.cancel(pi);
            if (!p.getBoolean("on", false)) continue;
            Calendar c = Calendar.getInstance();
            c.set(Calendar.HOUR_OF_DAY, HOURS[i]);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            if (c.getTimeInMillis() <= System.currentTimeMillis()) c.add(Calendar.DAY_OF_MONTH, 1);
            am.setInexactRepeating(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
        }
    }

    private static PendingIntent alarmIntent(Context ctx, int idx) {
        Intent i = new Intent(ctx, ReminderReceiver.class);
        i.setAction("vn.tester12.free.REMIND");
        i.putExtra("slot", idx);
        return PendingIntent.getBroadcast(ctx, 10 + idx, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void showNotification(Context ctx) {
        if (Build.VERSION.SDK_INT >= 33
                && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean("on", false)) return;
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        int n = today.equals(p.getString("day", "")) ? p.getInt("n", 0) : 0;   // sang ngày mới: coi như chưa test
        int t = p.getInt("t", 0);
        if (t <= 0 || n >= t) return;                                           // đủ nhiệm vụ → không nhắc
        int left = t - n;
        String title = p.getString("title", "12 Testers Free");
        String body = p.getString("body", "{n}/{t}")
                .replace("{n}", String.valueOf(n)).replace("{t}", String.valueOf(t))
                .replace("{l}", String.valueOf(left)).replace("{s}", String.valueOf(left * p.getInt("per", 5)));

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Nhắc nhiệm vụ hằng ngày",
                NotificationManager.IMPORTANCE_DEFAULT);
        nm.createNotificationChannel(ch);

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 2, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification nt = new Notification.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_notify)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(100, nt);
    }
}

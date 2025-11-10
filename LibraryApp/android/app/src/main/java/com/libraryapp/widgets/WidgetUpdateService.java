package com.libraryapp.widgets;

import android.app.IntentService;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.widget.RemoteViews;
import androidx.annotation.Nullable;
import com.libraryapp.R;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class WidgetUpdateService extends IntentService {

    public WidgetUpdateService() {
        super("WidgetUpdateService");
    }

    @Override
    protected void onHandleIntent(@Nullable Intent intent) {
        updateDueBooksWidget();
        updateLibraryAssistantWidget();
    }

    private void updateDueBooksWidget() {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        ComponentName componentName = new ComponentName(this, DueBooksWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(getPackageName(), R.layout.due_books_widget);

            try {
                // Fetch due books data from backend
                String dueBooksData = fetchDueBooksData();
                updateDueBooksViews(views, dueBooksData);
            } catch (Exception e) {
                // Show error state
                views.setTextViewText(R.id.empty_state, "Unable to load data");
                views.setViewVisibility(R.id.empty_state, android.view.View.VISIBLE);
                views.setViewVisibility(R.id.books_container, android.view.View.GONE);
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private void updateLibraryAssistantWidget() {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        ComponentName componentName = new ComponentName(this, LibraryAssistantWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(getPackageName(), R.layout.library_assistant_widget);

            try {
                // Fetch conversation data from backend
                String conversationData = fetchConversationData();
                updateLibraryAssistantViews(views, conversationData);
            } catch (Exception e) {
                // Show default state
                views.setTextViewText(R.id.last_message, "Ask me anything about books!");
                views.setViewVisibility(R.id.unread_badge, android.view.View.GONE);
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private String fetchDueBooksData() throws Exception {
        // This would make an HTTP request to your backend API
        // For now, return mock data
        return "{\"dueBooks\":[], \"totalFines\": 0.00}";
    }

    private String fetchConversationData() throws Exception {
        // This would make an HTTP request to your backend API
        // For now, return mock data
        return "{\"lastMessage\":\"Ask me anything about books!\", \"unreadCount\":0}";
    }

    private void updateDueBooksViews(RemoteViews views, String data) {
        try {
            JSONObject jsonData = new JSONObject(data);
            JSONArray dueBooks = jsonData.getJSONArray("dueBooks");
            double totalFines = jsonData.getDouble("totalFines");

            if (dueBooks.length() == 0) {
                views.setViewVisibility(R.id.empty_state, android.view.View.VISIBLE);
                views.setViewVisibility(R.id.books_container, android.view.View.GONE);
                views.setViewVisibility(R.id.view_all_button, android.view.View.GONE);
            } else {
                views.setViewVisibility(R.id.empty_state, android.view.View.GONE);
                views.setViewVisibility(R.id.books_container, android.view.View.VISIBLE);
                views.setViewVisibility(R.id.view_all_button, android.view.View.VISIBLE);
                views.setTextViewText(R.id.view_all_button, "View All (" + dueBooks.length() + ")");

                // Note: For simplicity, we're not dynamically adding book items here
                // In a full implementation, you'd use RemoteViews and add individual book views
            }

            if (totalFines > 0) {
                views.setViewVisibility(R.id.fines_badge, android.view.View.VISIBLE);
                views.setTextViewText(R.id.fines_badge, "$" + String.format("%.2f", totalFines));
            } else {
                views.setViewVisibility(R.id.fines_badge, android.view.View.GONE);
            }

        } catch (Exception e) {
            views.setViewVisibility(R.id.empty_state, android.view.View.VISIBLE);
            views.setTextViewText(R.id.empty_state, "Error loading data");
            views.setViewVisibility(R.id.books_container, android.view.View.GONE);
        }
    }

    private void updateLibraryAssistantViews(RemoteViews views, String data) {
        try {
            JSONObject jsonData = new JSONObject(data);
            String lastMessage = jsonData.getString("lastMessage");
            int unreadCount = jsonData.getInt("unreadCount");

            views.setTextViewText(R.id.last_message, lastMessage);

            if (unreadCount > 0) {
                views.setViewVisibility(R.id.unread_badge, android.view.View.VISIBLE);
                views.setTextViewText(R.id.unread_badge, String.valueOf(Math.min(unreadCount, 99)));
            } else {
                views.setViewVisibility(R.id.unread_badge, android.view.View.GONE);
            }

        } catch (Exception e) {
            views.setTextViewText(R.id.last_message, "Ask me anything about books!");
            views.setViewVisibility(R.id.unread_badge, android.view.View.GONE);
        }
    }
}
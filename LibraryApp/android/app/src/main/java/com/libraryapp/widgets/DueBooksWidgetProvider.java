package com.libraryapp.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import com.libraryapp.MainActivity;
import com.libraryapp.R;

public class DueBooksWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateDueBooksWidget(context, appWidgetManager, appWidgetId);
        }

        // Start the update service to fetch fresh data
        Intent serviceIntent = new Intent(context, WidgetUpdateService.class);
        context.startService(serviceIntent);
    }

    private void updateDueBooksWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.due_books_widget);

        // Set up the intent to launch the app when widget is tapped
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("OPEN_DUE_BOOKS");
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
        // Widget is enabled - start any necessary services
    }

    @Override
    public void onDisabled(Context context) {
        // Widget is disabled - clean up any services
    }
}
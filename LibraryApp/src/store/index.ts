import { configureStore } from '@reduxjs/toolkit';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

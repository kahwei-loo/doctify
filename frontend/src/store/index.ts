/**
 * Redux Store Configuration
 *
 * Configures Redux store with Redux Toolkit and RTK Query.
 */

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';

import authReducer from './slices/authSlice';
import documentsReducer from './slices/documentsSlice';
import uiReducer from './slices/uiSlice';
import demoReducer from './slices/demoSlice';
import { api } from './api/apiSlice';
import { publicChatApi } from './api/publicChatApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    documents: documentsReducer,
    ui: uiReducer,
    demo: demoReducer,
    [api.reducerPath]: api.reducer,
    [publicChatApi.reducerPath]: publicChatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['api/executeQuery/fulfilled', 'api/executeMutation/fulfilled'],
      },
    }).concat(api.middleware, publicChatApi.middleware),
  devTools: import.meta.env.DEV,
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

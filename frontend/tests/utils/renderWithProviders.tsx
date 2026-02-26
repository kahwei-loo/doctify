import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import authReducer from '@/store/slices/authSlice';
import documentsReducer from '@/store/slices/documentsSlice';
import uiReducer from '@/store/slices/uiSlice';
import demoReducer from '@/store/slices/demoSlice';
import { api } from '@/store/api/apiSlice';
import { publicChatApi } from '@/store/api/publicChatApi';
import type { RootState } from '@/store';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof setupStore>;
  routerProps?: MemoryRouterProps;
}

export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({
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
        serializableCheck: false,
      }).concat(api.middleware, publicChatApi.middleware),
    preloadedState: preloadedState as any,
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    store = setupStore(preloadedState),
    routerProps = {},
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<{}>): React.JSX.Element {
    return (
      <Provider store={store}>
        <MemoryRouter {...routerProps}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

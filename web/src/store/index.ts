// src/store/index.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import user from "./features/user/userSlice";
import machine from "./features/machines/machineSlice";
import {
	persistReducer,
	persistStore,
	FLUSH,
	REHYDRATE,
	PAUSE,
	PERSIST,
	PURGE,
	REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // uses window.localStorage

const rootReducer = combineReducers({ user, machine });

const persistConfig = {
	key: "root",
	storage,
	whitelist: ["user", "machine"], // persist user and machine slices
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				// redux-persist actions are non-serializable; this silences warnings
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
			},
		}),
});

// Persistor for PersistGate
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

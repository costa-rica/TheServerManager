// src/app/providers.tsx
"use client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/store";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<Provider store={store}>
			<PersistGate persistor={persistor} loading={null}>
				{children}
			</PersistGate>
		</Provider>
	);
}

// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withLogging } from "@/lib/apiLogger";

export async function POST(request: NextRequest) {
	return withLogging(request, async () => {
		return await handleLogin(request);
	});
}

async function handleLogin(request: NextRequest) {
	try {
		console.log("=== Login API Route Called ===");
		console.log("Environment:", process.env.NODE_ENV);
		console.log("API URL:", process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL);

		const { email, password } = await request.json();
		console.log("Request data:", { email, password: password ? "***" : "missing" });

		const apiUrl = `${process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL}/users/login`;
		console.log("Calling backend API:", apiUrl);

		// Call the backend API (internal route from server)
		const response = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		console.log("Backend response status:", response.status);
		console.log("Backend response headers:", Object.fromEntries(response.headers.entries()));

		const contentType = response.headers.get("Content-Type");
		let resJson = null;

		if (contentType?.includes("application/json")) {
			resJson = await response.json();
			console.log("Backend response JSON:", { ...resJson, token: resJson?.token ? "***" : "missing" });
		} else {
			console.error("Backend did not return JSON. Content-Type:", contentType);
			const text = await response.text();
			console.error("Response body:", text);
		}

		if (response.ok && resJson?.token) {
			console.log("Login successful, setting cookie");
			// Set HTTP-only cookie with the token (for middleware protection)
			const cookieStore = await cookies();
			cookieStore.set("auth-token", resJson.token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 7, // 7 days
				path: "/",
			});

			// Return token AND user data (hybrid approach: cookie + Redux)
			return NextResponse.json({
				success: true,
				token: resJson.token, // Also return token for client-side API calls
				user: {
					username: resJson.user?.username || "unknown",
					email: email,
					isAdmin: resJson.user?.isAdmin || false,
					accessServersArray: resJson.user?.accessServersArray || [],
					accessPagesArray: resJson.user?.accessPagesArray || [],
				},
			});
		} else {
			// Login failed
			console.error("Login failed:", resJson?.error || `Server error: ${response.status}`);
			return NextResponse.json(
				{
					success: false,
					error: resJson?.error || `Server error: ${response.status}`,
				},
				{ status: response.status }
			);
		}
	} catch (error) {
		console.error("Login API route error - DETAILED:", error);
		console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
		console.error("Error message:", error instanceof Error ? error.message : String(error));
		console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
}

// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withLogging } from "@/lib/apiLogger";

export async function POST(request: NextRequest) {
	return withLogging(request, async () => {
		return await handleLogout();
	});
}

async function handleLogout() {
	try {
		// Clear the auth token cookie
		const cookieStore = await cookies();
		cookieStore.delete("auth-token");

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Logout API route error:", error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 }
		);
	}
}

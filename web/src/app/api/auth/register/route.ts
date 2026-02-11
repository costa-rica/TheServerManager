import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Call backend API to register user
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL}/users/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Registration failed",
          details: data.details || ""
        },
        { status: response.status }
      );
    }

    // Registration successful - now login the user automatically
    // Call the login endpoint
    const loginResponse = await fetch(
      `${process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL}/users/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration succeeded but auto-login failed. Please login manually.",
        },
        { status: loginResponse.status }
      );
    }

    // Set HTTP-only cookie for middleware protection
    const res = NextResponse.json({
      success: true,
      token: loginData.token,
      user: loginData.user,
    });

    res.cookies.set("auth-token", loginData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

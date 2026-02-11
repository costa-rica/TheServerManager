"use client";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { loginUser } from "@/store/features/user/userSlice";
import { Modal } from "@/components/ui/modal";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import { useTheme } from "@/context/ThemeContext";

// export default function SignInForm() {
export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, emailSetter] = useState(
    process.env.NEXT_PUBLIC_MODE === "workstation" ? "nrodrig1@gmail.com" : "",
  );
  const [password, passwordSetter] = useState(
    process.env.NEXT_PUBLIC_MODE === "workstation"
      ? process.env.NEXT_PUBLIC_LOGIN_PASSWORD
      : "",
  );
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalData, setInfoModalData] = useState<{
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "warning";
  }>({
    title: "",
    message: "",
    variant: "info",
  });
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { theme } = useTheme();
  // const userReducer = useSelector((state) => state.user);
  const userReducer = useAppSelector((s) => s.user);

  const showInfoModal = (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning" = "info",
  ) => {
    setInfoModalData({ title, message, variant });
    setInfoModalOpen(true);
  };

  useEffect(() => {
    // Auto-redirect if user is already logged in
    if (userReducer.token) {
      if (userReducer.isAdmin) {
        router.push("/servers/machines");
      } else if (
        userReducer.accessPagesArray &&
        userReducer.accessPagesArray.length > 0
      ) {
        router.push(userReducer.accessPagesArray[0]);
      } else {
        router.push("/home");
      }
      return;
    }
  }, [
    userReducer.token,
    userReducer.isAdmin,
    userReducer.accessPagesArray,
    router,
  ]);

  const handleClickLogin = async () => {
    console.log("Login ---> API URL:", `/api/auth/login`);
    console.log("- handleClickLogin 👀");
    console.log("- email:", email);

    const bodyObj = { email, password };

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });

    console.log("Received response:", response.status);

    let resJson = null;
    const contentType = response.headers.get("Content-Type");

    if (contentType?.includes("application/json")) {
      resJson = await response.json();
    }

    if (response.ok && resJson.success) {
      try {
        // Dispatch login with token and user data
        dispatch(
          loginUser({
            token: resJson.token,
            user: {
              username: resJson.user.username,
              email: resJson.user.email,
              isAdmin: resJson.user.isAdmin,
              accessServersArray: resJson.user.accessServersArray,
              accessPagesArray: resJson.user.accessPagesArray,
            },
          }),
        );

        // Redirect based on user permissions
        if (resJson.user.isAdmin) {
          router.push("/servers/machines");
        } else if (
          resJson.user.accessPagesArray &&
          resJson.user.accessPagesArray.length > 0
        ) {
          router.push(resJson.user.accessPagesArray[0]);
        } else {
          // User has no permissions, redirect to home (default accessible page)
          router.push("/home");
        }
      } catch (error) {
        console.error("Error logging in:", error);
        showInfoModal("Error", "Error logging in", "error");
      }
    } else {
      const errorMessage =
        resJson?.error || `There was a server error: ${response.status}`;
      const errorDetails = resJson?.details ? ` (${resJson.details})` : "";
      console.error("Login failed:", errorMessage, errorDetails);
      showInfoModal("Login Failed", errorMessage + errorDetails, "error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleClickLogin();
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen px-6 py-8">
      {/* Logo */}
      TEst
      <div className="flex items-center justify-center w-full h-1/3 min-h-[200px] mb-8">
        <Image
          src={
            theme === "dark"
              ? "/images/logo06-NR-darkTheme.png"
              : "/images/logo06-NR.png"
          }
          alt="The Server Manager"
          width={400}
          height={80}
          className="h-12 sm:h-16 md:h-20 w-auto"
          priority
        />
      </div>
      {/* Login Form */}
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email Input */}
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => emailSetter(e.target.value)}
              placeholder="Email"
              className="w-full px-6 py-5 text-3xl bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => passwordSetter(e.target.value)}
              placeholder="Password"
              className="w-full px-6 py-5 text-3xl bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute z-30 -translate-y-1/2 cursor-pointer right-6 top-1/2"
            >
              {showPassword ? (
                <EyeIcon className="w-8 h-8 fill-gray-500 dark:fill-gray-400" />
              ) : (
                <EyeCloseIcon className="w-8 h-8 fill-gray-500 dark:fill-gray-400" />
              )}
            </span>
          </div>

          {/* Sign In Button */}
          <div>
            <button
              type="submit"
              className="w-full px-6 py-5 text-3xl font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
            >
              Sign in
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="mt-6 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
            >
              forgot password?
            </Link>
          </div>
        </form>
      </div>
      {/* Information Modal */}
      <Modal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <ModalInformationOk
          title={infoModalData.title}
          message={infoModalData.message}
          variant={infoModalData.variant}
          onClose={() => setInfoModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

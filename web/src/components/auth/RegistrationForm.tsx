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

export default function RegistrationForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, emailSetter] = useState("");
  const [password, passwordSetter] = useState("");
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
  const userReducer = useAppSelector((s) => s.user);

  const showInfoModal = (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning" = "info"
  ) => {
    setInfoModalData({ title, message, variant });
    setInfoModalOpen(true);
  };

  useEffect(() => {
    // Auto-redirect if user is already logged in
    if (userReducer.token) {
      if (userReducer.isAdmin) {
        router.push("/servers/machines");
      } else if (userReducer.accessPagesArray && userReducer.accessPagesArray.length > 0) {
        router.push(userReducer.accessPagesArray[0]);
      } else {
        router.push("/home");
      }
      return;
    }
  }, [userReducer.token, userReducer.isAdmin, userReducer.accessPagesArray, router]);

  const handleClickRegister = async () => {
    console.log("Register ---> API URL:", `/api/auth/register`);
    console.log("- handleClickRegister 👀");
    console.log("- email:", email);

    const bodyObj = { email, password };

    const response = await fetch("/api/auth/register", {
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
        // Dispatch login with token and user data (auto-login after registration)
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
          })
        );

        // Redirect based on user permissions
        if (resJson.user.isAdmin) {
          router.push("/servers/machines");
        } else if (resJson.user.accessPagesArray && resJson.user.accessPagesArray.length > 0) {
          router.push(resJson.user.accessPagesArray[0]);
        } else {
          // User has no permissions, redirect to home (default accessible page)
          router.push("/home");
        }
      } catch (error) {
        console.error("Error registering:", error);
        showInfoModal("Error", "Error registering", "error");
      }
    } else {
      const errorMessage =
        resJson?.error || `There was a server error: ${response.status}`;
      const errorDetails = resJson?.details ? ` (${resJson.details})` : "";
      console.error("Registration failed:", errorMessage, errorDetails);
      showInfoModal("Registration Failed", errorMessage + errorDetails, "error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleClickRegister();
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen px-6 py-8">
      {/* Logo */}
      <div className="flex items-center justify-center w-full h-1/3 min-h-[200px] mb-8">
        <Image
          src={theme === "dark" ? "/images/logo06-NR-darkTheme.png" : "/images/logo06-NR.png"}
          alt="The Server Manager"
          width={400}
          height={80}
          className="h-12 sm:h-16 md:h-20 w-auto"
          priority
        />
      </div>

      {/* Registration Header */}
      <div className="w-full max-w-2xl mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Register
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 text-center">
          Create your account
        </p>
      </div>

      {/* Registration Form */}
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email Input */}
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => emailSetter(e.target.value)}
              placeholder="Email"
              required
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
              required
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

          {/* Register Button */}
          <div>
            <button
              type="submit"
              className="w-full px-6 py-5 text-3xl font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
            >
              Register
            </button>
          </div>

          {/* Already have account link */}
          <div className="mt-6 flex justify-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-500 transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
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

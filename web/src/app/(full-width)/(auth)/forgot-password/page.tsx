import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Forgot Password - The 404",
	description: "Reset your password",
};

export default function ForgotPassword() {
	return <ForgotPasswordForm />;
}

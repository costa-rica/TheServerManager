import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Reset Password - The 404",
	description: "Set your new password",
};

export default async function ResetPassword({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	return <ResetPasswordForm token={token} />;
}

import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "News Nexus Portal Login",
	description: "Login here ...",
};

export default function Login() {
	return <LoginForm />;
}

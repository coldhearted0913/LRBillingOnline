import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  // SessionProvider in layout handles auth state
  return <LoginForm />;
}

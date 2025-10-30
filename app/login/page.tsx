import { LoginForm } from "@/components/LoginForm";
import LoginBackground from "@/components/LoginBackground";

export default function LoginPage() {
  // SessionProvider in layout handles auth state
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#0b1221]">
      <LoginBackground />
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center p-4 sm:p-6">
        <LoginForm minimal />
      </div>
    </div>
  );
}

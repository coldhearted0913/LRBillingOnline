"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't show navbar on login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      {/* Navigation Header */}
      {session && (
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LR Billing</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      
      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </>
  );
};

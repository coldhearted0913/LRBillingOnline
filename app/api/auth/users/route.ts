import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use role from session instead of DB query (already cached)
    const userRole = (session.user as any)?.role;

    // Only CEO can view all users
    if (userRole !== "CEO") {
      return NextResponse.json(
        { error: "Forbidden. Only CEO can view users." },
        { status: 403 }
      );
    }

    // Fetch all users (excluding passwords)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { users },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

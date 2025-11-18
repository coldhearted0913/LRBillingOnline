import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const userId = (session.user as any)?.id;

    // Only CEO can delete users
    if (userRole !== "CEO") {
      return NextResponse.json(
        { error: "Forbidden. Only CEO can delete users." },
        { status: 403 }
      );
    }

    // Check if trying to delete themselves
    const userToDelete = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (userToDelete.id === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const userId = (session.user as any)?.id;

    // Only CEO can update user roles
    if (userRole !== "CEO") {
      return NextResponse.json(
        { error: "Forbidden. Only CEO can update user roles." },
        { status: 403 }
      );
    }

    const { role, phone } = await request.json();

    // Validate role if provided
    if (role && !["WORKER", "MANAGER", "CEO"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if trying to change their own role
    if (params.id === userId) {
      return NextResponse.json(
        { error: "Cannot change your own role. At least one CEO must remain admin." },
        { status: 400 }
      );
    }

    // Fetch target user to check if they are CEO
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // CEO cannot change other CEO's roles
    if (targetUser.role === "CEO") {
      return NextResponse.json(
        { error: "Cannot change role of another CEO. CEO roles can only be managed by system administrator." },
        { status: 403 }
      );
    }

    // CEO cannot promote anyone to CEO role
    if (role === "CEO") {
      return NextResponse.json(
        { error: "Cannot promote users to CEO role. CEO roles can only be managed by system administrator." },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (role) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone; // Allow null/empty to clear phone

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
      },
    });

    return NextResponse.json(
      { user: updatedUser },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

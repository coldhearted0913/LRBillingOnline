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

    // Only Admin can delete users
    if (userRole !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden. Only Admin can delete users." },
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

    // Only Admin can update user roles
    if (userRole !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden. Only Admin can update user roles." },
        { status: 403 }
      );
    }

    const { role } = await request.json();

    if (!["Employee", "MANAGER", "Admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if trying to change their own role
    if (params.id === userId) {
      return NextResponse.json(
        { error: "Cannot change your own role. At least one Admin must remain admin." },
        { status: 400 }
      );
    }

    // Fetch target user to check if they are Admin
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Admin cannot change other Admin's roles
    if (targetUser.role === "Admin") {
      return NextResponse.json(
        { error: "Cannot change role of another Admin. Admin roles can only be managed by system administrator." },
        { status: 403 }
      );
    }

    // Admin cannot promote anyone to Admin role
    if (role === "Admin") {
      return NextResponse.json(
        { error: "Cannot promote users to Admin role. Admin roles can only be managed by system administrator." },
        { status: 403 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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

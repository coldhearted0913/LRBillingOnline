import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CreateUserSchema } from '@/lib/validations/schemas';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only CEOs can create users
    if (!session || (session.user as any)?.role !== "CEO") {
      return NextResponse.json(
        { error: "Unauthorized. Only CEO can create users." },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate with Zod schema
    const validation = CreateUserSchema.safeParse(body);
    
    if (!validation.success) {
      const errors = validation.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: errors 
        },
        { status: 400 }
      );
    }
    
    const { email, password, name, role } = validation.data;

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || normalizedEmail.split("@")[0],
        role: role || "WORKER",
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CreateUserSchema } from '@/lib/validations/schemas';
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/utils/sanitize';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';

export async function POST(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

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
    
    let { email, password, name, role, phone } = validation.data;

    // Sanitize user input to prevent XSS attacks
    email = sanitizeEmail(email);
    name = sanitizeText(name);
    phone = phone ? sanitizePhone(phone) : undefined;

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
        phone: phone ?? null,
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
    
    // Track error with Sentry
    const { trackApiError } = await import('@/lib/utils/errorTracking');
    trackApiError(error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/api/auth/register',
      method: 'POST',
      userEmail: session?.user?.email,
      userRole: (session?.user as any)?.role,
      metadata: {
        // Don't include password or sensitive data
        attemptedEmail: email?.toLowerCase(),
      },
    });
    
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

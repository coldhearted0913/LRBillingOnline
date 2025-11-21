import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sanitizeText, sanitizePhone } from '@/lib/utils/sanitize';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';

export const dynamic = 'force-dynamic';

// GET: Fetch all drivers
export async function GET(request: NextRequest) {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(
      { drivers: drivers.map(d => ({ id: d.id, name: d.name, phoneNumber: d.phoneNumber })) },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

// POST: Add new driver
export async function POST(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let { name, phoneNumber } = await request.json();

    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: "Driver name and phone number are required" },
        { status: 400 }
      );
    }

    // Sanitize driver input
    name = sanitizeText(name);
    phoneNumber = sanitizePhone(phoneNumber);

    // Check if driver already exists
    const existingDriver = await prisma.driver.findFirst({
      where: {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
      },
    });

    if (existingDriver) {
      return NextResponse.json(
        { error: "Driver with this name and number already exists" },
        { status: 409 }
      );
    }

    const driver = await prisma.driver.create({
      data: {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
      },
    });

    return NextResponse.json(
      { success: true, driver: { id: driver.id, name: driver.name, phoneNumber: driver.phoneNumber } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating driver:", error);
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    );
  }
}

// DELETE: Delete driver
export async function DELETE(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }

    await prisma.driver.delete({
      where: { id: driverId },
    });

    return NextResponse.json(
      { success: true, message: "Driver deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting driver:", error);
    return NextResponse.json(
      { error: "Failed to delete driver" },
      { status: 500 }
    );
  }
}


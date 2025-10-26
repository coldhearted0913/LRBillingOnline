import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET: Fetch vehicles by type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleType = searchParams.get('vehicleType');

    if (!vehicleType) {
      return NextResponse.json(
        { error: "Vehicle type is required" },
        { status: 400 }
      );
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        vehicleType: vehicleType.toUpperCase(),
      },
      orderBy: {
        vehicleNumber: 'asc',
      },
    });

    return NextResponse.json(
      { vehicles: vehicles.map(v => v.vehicleNumber) },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

// POST: Add new vehicle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { vehicleNumber, vehicleType } = await request.json();

    if (!vehicleNumber || !vehicleType) {
      return NextResponse.json(
        { error: "Vehicle number and type are required" },
        { status: 400 }
      );
    }

    // Check if vehicle already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        vehicleNumber_vehicleType: {
          vehicleNumber: vehicleNumber.toUpperCase(),
          vehicleType: vehicleType.toUpperCase(),
        },
      },
    });

    if (existingVehicle) {
      return NextResponse.json(
        { error: "Vehicle already exists" },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleType: vehicleType.toUpperCase(),
      },
    });

    return NextResponse.json(
      { success: true, vehicle },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}

// DELETE: Remove vehicle
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicleNumber = searchParams.get('vehicleNumber');
    const vehicleType = searchParams.get('vehicleType');

    if (!vehicleNumber || !vehicleType) {
      return NextResponse.json(
        { error: "Vehicle number and type are required" },
        { status: 400 }
      );
    }

    const deletedVehicle = await prisma.vehicle.delete({
      where: {
        vehicleNumber_vehicleType: {
          vehicleNumber: vehicleNumber.toUpperCase(),
          vehicleType: vehicleType.toUpperCase(),
        },
      },
    });

    return NextResponse.json(
      { success: true, vehicle: deletedVehicle },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}

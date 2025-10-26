import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET: Fetch all descriptions
export async function GET(request: NextRequest) {
  try {
    const descriptions = await prisma.goodsDescription.findMany({
      orderBy: {
        description: 'asc',
      },
    });

    return NextResponse.json(
      { descriptions: descriptions.map(d => d.description) },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching descriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch descriptions" },
      { status: 500 }
    );
  }
}

// POST: Add new description
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { description } = await request.json();

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Check if description already exists
    const existingDescription = await prisma.goodsDescription.findUnique({
      where: {
        description: description.trim(),
      },
    });

    if (existingDescription) {
      return NextResponse.json(
        { error: "Description already exists" },
        { status: 409 }
      );
    }

    const newDescription = await prisma.goodsDescription.create({
      data: {
        description: description.trim(),
      },
    });

    return NextResponse.json(
      { success: true, description: newDescription },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating description:", error);
    return NextResponse.json(
      { error: "Failed to create description" },
      { status: 500 }
    );
  }
}

// DELETE: Remove description
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
    const description = searchParams.get('description');

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const deletedDescription = await prisma.goodsDescription.delete({
      where: {
        description: description,
      },
    });

    return NextResponse.json(
      { success: true, description: deletedDescription },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting description:", error);
    return NextResponse.json(
      { error: "Failed to delete description" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const history = await prisma.importBatch.findMany({
      orderBy: { importedAt: 'desc' },
      take: 50
    });
    
    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    console.error("Failed to fetch import history:", error);
    return NextResponse.json({ error: "Failed to fetch import history" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    // Since we set onDelete: Cascade in prisma schema, deleting this will also delete
    // all Decisions that are linked to this importBatchId.
    await prisma.importBatch.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "ลบประวัติการนำเข้าและข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว" });
  } catch (error: any) {
    console.error("Failed to delete import batch:", error);
    return NextResponse.json({ error: "Failed to delete import batch" }, { status: 500 });
  }
}

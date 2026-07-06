import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSession, isStaff } from "@/lib/auth";
import { markContractSigned } from "@/lib/contract-workflow";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extFromType(type: string): string {
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = parseInt(id);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File) || file.size === 0) {
      const result = await markContractSigned(tenantId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.tenant);
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran file maksimal 10 MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Format file harus PDF, JPG, PNG, atau WEBP" }, { status: 400 });
    }

    const ext = extFromType(file.type);
    const dir = path.join(process.cwd(), "public", "uploads", "contracts");
    await mkdir(dir, { recursive: true });

    const filename = `kontrak-${tenantId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    const signedUrl = `/uploads/contracts/${filename}`;
    const result = await markContractSigned(tenantId, signedUrl);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json(result.tenant);
  } catch (error) {
    console.error("Contract upload error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

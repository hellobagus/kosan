import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { savePublicUpload } from "@/lib/file-upload";
import { requireTenantPortalSession } from "@/lib/tenant-portal-service";

const MAX_PHOTOS = 3;

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const auth = await requireTenantPortalSession(session);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File foto wajib diupload" }, { status: 400 });
    }

    const url = await savePublicUpload(file, "repairs", `repair-t${auth.tenant.id}`);
    return NextResponse.json({ url, maxPhotos: MAX_PHOTOS });
  } catch (error) {
    console.error("Repair photo upload error:", error);
    const message = error instanceof Error ? error.message : "Gagal upload foto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

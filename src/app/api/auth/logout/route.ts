import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(appUrl("/login", request));
}

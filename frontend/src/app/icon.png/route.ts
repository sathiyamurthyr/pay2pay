import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") || "";
  const rawHost = request.headers.get("host") || "";
  const host = (forwardedHost || rawHost).toLowerCase();
  const port = host.includes(":") ? host.split(":")[1] : "";

  let iconFileName = "pay2pay-icon-192.png";

  if (host.includes("smspay") || port === "4002") {
    iconFileName = "smspay-icon-192.png";
  } else if (host.includes("near4you") || port === "4001") {
    iconFileName = "near4you-favicon.png";
  } else if (host.includes("pay2pay") || port === "3000" || port === "4003") {
    iconFileName = "pay2pay-icon-192.png";
  }

  const filePath = path.join(process.cwd(), "public", "branding", iconFileName);
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 404 });
  }
}

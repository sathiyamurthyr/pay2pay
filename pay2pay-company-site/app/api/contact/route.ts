import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, mobile, subject, message } = body;

    // Validation
    if (!name || !email || !mobile || !message) {
      return NextResponse.json(
        { status: "error", message: "All required fields (name, email, mobile, message) must be provided." },
        { status: 400 }
      );
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { status: "error", message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Mobile validation (at least 10 digits)
    const digitsOnly = mobile.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return NextResponse.json(
        { status: "error", message: "Please provide a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // In a production setup, this can trigger an internal email or forward to CRM/webhook.
    // For privacy, we log a safe anonymized reference.
    console.log(`[Contact API] Received inquiry for '${subject || "General"}' from ${name} (${email.slice(0, 3)}***)`);

    return NextResponse.json(
      {
        status: "ok",
        message: "Your inquiry has been submitted successfully.",
        reference_id: `INQ-${Date.now().toString(36).toUpperCase()}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Contact API Error]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error processing inquiry. Please try again later." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { answerNjTransportationQuestion } from "@/lib/nj-ask";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!question.trim()) {
    return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  }

  try {
    const answer = await answerNjTransportationQuestion(question);
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ask NJ failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

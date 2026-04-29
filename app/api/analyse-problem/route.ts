import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert math tutor. You will be given a math problem. Your job is to:
1. Identify the topic and concepts involved
2. Provide 3 progressive hints that guide the student without giving away the answer. Each hint should be more specific than the last.
3. Provide a full worked solution with each step clearly explained.

Format your response as JSON with this exact structure:
{
  topic: string,
  concepts: string[],
  hints: [string, string, string],
  solution: {
    steps: [{ step: number, explanation: string, working: string }],
    finalAnswer: string
  }
}
Return only valid JSON, no markdown, no preamble.`;

const parseJsonResponse = (raw: string) => {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned) as unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { latex?: string; text?: string };
    const latex = body?.latex ?? "";
    const text = body?.text ?? "";

    if (!latex && !text) {
      return NextResponse.json({ error: "Missing latex/text payload" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify({ latex, text }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed: ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned no analysis content");
    }

    return NextResponse.json(parseJsonResponse(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyse problem";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

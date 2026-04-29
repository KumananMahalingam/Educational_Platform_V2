import { NextResponse } from "next/server";

type ExtractResponse = {
  text: string;
  latex: string;
};

const extractJson = (raw: string) => {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned) as ExtractResponse;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { src?: string };
    const src = body?.src;

    if (!src) {
      return NextResponse.json({ error: "Missing src" }, { status: 400 });
    }

    const match = src.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
    }

    const [, mimeType, base64Data] = match;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: "Extract the math problem from this image exactly as written. Return only the math problem as plain text and in LaTeX format. Format your response as JSON with this structure: { text: string, latex: string }. Return only valid JSON, no markdown, no preamble.",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed: ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawJson) {
      throw new Error("Gemini returned no extractable content");
    }

    const parsed = extractJson(rawJson);
    return NextResponse.json({
      latex: parsed.latex ?? "",
      text: parsed.text ?? "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract math";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

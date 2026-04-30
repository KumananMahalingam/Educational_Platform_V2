import { NextResponse } from "next/server";

const FALLBACK = {
  latex: "",
  isCorrect: true,
  percentage: 0,
  feedback: "",
};

const parseJson = (raw: string) => {
  try {
    return JSON.parse(raw) as typeof FALLBACK;
  } catch {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    return JSON.parse(cleaned) as typeof FALLBACK;
  }
};

export async function POST(request: Request) {
  try {
    const { imageBase64, problem } = (await request.json()) as {
      imageBase64?: string;
      problem?: string;
    };

    if (!imageBase64) {
      return NextResponse.json(FALLBACK);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(FALLBACK);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: imageBase64,
                  },
                },
                {
                  text: `You are a math teacher reviewing a student's handwritten working.
You will be given an image of a whiteboard with a math problem at the top and the student's handwritten working below.
Respond ONLY with a JSON object in this exact format, no markdown, no explanation:
{
  "latex": "the student's latest handwritten expression as LaTeX",
  "isCorrect": true or false,
  "percentage": 0-100,
  "feedback": "one sentence of feedback"
}
percentage should represent how close the student is to the final answer:
0 = nothing written, 33 = first step correct, 66 = halfway, 100 = correct final answer.
isCorrect should be true if the latest step is mathematically valid.

Problem context: ${problem || ""}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(FALLBACK);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(FALLBACK);
    }

    const parsed = parseJson(text);
    return NextResponse.json({
      latex: parsed.latex || "",
      isCorrect: typeof parsed.isCorrect === "boolean" ? parsed.isCorrect : true,
      percentage: Number.isFinite(Number(parsed.percentage)) 
        ? Math.max(0, Math.min(100, Number(parsed.percentage))) 
        : 0,
      feedback: parsed.feedback || "",
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}

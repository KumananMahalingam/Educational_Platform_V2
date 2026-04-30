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

    // Try to find a JSON object inside the text (handles models that wrap
    // JSON in prose).
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as typeof FALLBACK;
      } catch {
        // fall through
      }
    }
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
      console.warn("[recognize-math] missing imageBase64");
      return NextResponse.json(FALLBACK);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[recognize-math] missing GEMINI_API_KEY");
      return NextResponse.json(FALLBACK);
    }

    console.log(
      `[recognize-math] calling gemini, image bytes=${imageBase64.length}, problem="${problem?.slice(0, 80) ?? ""}"`
    );

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
                  text: `You are a math teacher reviewing a student's handwritten working on a digital whiteboard.

The image is a screenshot of the whiteboard. Anywhere on it you may see:
- A printed math problem (image of the problem).
- The student's handwritten ink strokes (the working out).

Even if the handwriting is messy, partial, or only one or two scribbles, ALWAYS produce your best guess. Never refuse. Never say you cannot see anything. If you truly see no handwriting at all, return percentage 0 with feedback "Start writing your working".

Respond ONLY with a JSON object in this exact shape, no markdown fences, no commentary, no preamble:
{
  "latex": "the student's latest handwritten expression as LaTeX (best guess)",
  "isCorrect": true | false,
  "percentage": <integer 0-100>,
  "feedback": "one short, encouraging sentence of feedback for the student"
}

Guidance for percentage:
- 0  = nothing meaningful written yet
- 25 = first useful step is on the page
- 50 = halfway through the working
- 75 = nearly at the answer
- 100 = correct final answer is written

Guidance for isCorrect:
- true  if the latest visible step is mathematically valid
- false if the latest visible step contains an error

Problem context: ${problem || "(unknown — infer from the image)"}.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[recognize-math] gemini ${response.status}: ${body.slice(0, 500)}`
      );
      return NextResponse.json(FALLBACK);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("[recognize-math] gemini raw text:", text);

    if (!text) {
      return NextResponse.json(FALLBACK);
    }

    let parsed: typeof FALLBACK;
    try {
      parsed = parseJson(text);
    } catch (e) {
      console.error("[recognize-math] could not parse gemini response", e);
      return NextResponse.json(FALLBACK);
    }

    const result = {
      latex: parsed.latex || "",
      isCorrect: typeof parsed.isCorrect === "boolean" ? parsed.isCorrect : true,
      percentage: Number.isFinite(Number(parsed.percentage))
        ? Math.max(0, Math.min(100, Number(parsed.percentage)))
        : 0,
      feedback: parsed.feedback || "",
    };
    console.log("[recognize-math] returning", result);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[recognize-math] unhandled error", e);
    return NextResponse.json(FALLBACK);
  }
}

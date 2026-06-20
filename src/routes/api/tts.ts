import { createFileRoute } from "@tanstack/react-router";

// Text-to-speech proxy using Lovable AI Gateway. Returns an MP3 file so the
// browser can play it directly via an <audio> element / Audio().
export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing API key", { status: 500 });

        const body = (await request.json().catch(() => null)) as
          | { text?: string; voice?: string }
          | null;
        const text = body?.text?.trim();
        if (!text) return new Response("Missing text", { status: 400 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk", "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text.slice(0, 2000),
            voice: body?.voice ?? "alloy",
            response_format: "mp3",
          }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return new Response(t || "TTS failed", { status: res.status });
        }
        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg" },
        });
      },
    },
  },
});

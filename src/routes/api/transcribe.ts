import { createFileRoute } from "@tanstack/react-router";

// Speech-to-text proxy using Lovable AI Gateway. The browser uploads recorded
// audio; we forward it to the transcription endpoint and stream back the SSE.
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing API key", { status: 500 });

        const form = await request.formData();
        const audio = form.get("audio");
        if (!(audio instanceof File) || audio.size < 512) {
          return new Response("Empty audio", { status: 400 });
        }

        const type = audio.type.split(";")[0];
        const ext =
          ({ "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3", "audio/wav": "wav" } as Record<string, string>)[
            type
          ] ?? "webm";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", audio, `recording.${ext}`);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          body: upstream,
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return new Response(t || "Transcription failed", { status: res.status });
        }
        const json = await res.json().catch(() => null);
        return Response.json({ text: json?.text ?? "" });
      },
    },
  },
});

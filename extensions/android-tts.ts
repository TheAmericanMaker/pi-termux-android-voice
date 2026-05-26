import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let autoSpeak = false;
let defaultRate = 1;
let defaultPitch = 1;

function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " Code block omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, ". ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ". ")
    .replace(/([.!?])\s*/g, "$1  ")
    .replace(/([,;:])\s*/g, "$1 ")
    .replace(/[#*_>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function messageText(message: any): string {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

async function speak(text: string, rate = defaultRate, pitch = defaultPitch): Promise<void> {
  const trimmed = cleanForSpeech(text);
  if (!trimmed) throw new Error("No text provided");

  const args: string[] = [];
  if (typeof rate === "number") args.push("-r", String(rate));
  if (typeof pitch === "number") args.push("-p", String(pitch));
  args.push(trimmed);

  try {
    await execFileAsync("termux-tts-speak", args, { timeout: 120_000 });
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      throw new Error(
        "termux-tts-speak not found. Install Termux:API app from F-Droid, then run: pkg install termux-api"
      );
    }
    const stderr = err?.stderr ? `\n${err.stderr}` : "";
    throw new Error(`termux-tts-speak failed: ${err?.message ?? err}${stderr}`);
  }
}

function registerSpeakCommand(pi: ExtensionAPI, name: string, description: string) {
  pi.registerCommand(name, {
    description,
    handler: async (args, ctx) => {
      if (!args.trim()) {
        ctx.ui.notify(`Usage: /${name} <text>`, "warning");
        return;
      }
      try {
        await speak(args);
        ctx.ui.notify("Spoken via Android TTS", "info");
      } catch (err: any) {
        ctx.ui.notify(err?.message ?? String(err), "error");
      }
    },
  });
}

export default function (pi: ExtensionAPI) {
  registerSpeakCommand(pi, "android-speak", "Speak text aloud using Android Termux:API TTS");
  registerSpeakCommand(pi, "say", "Speak text aloud using Android Termux:API TTS");

  pi.registerCommand("android-speak-test", {
    description: "Test Android Termux:API TTS",
    handler: async (_args, ctx) => {
      try {
        await speak(
          "Hello. Android text to speech is working in Pi. This is our replacement voice path using Termux API."
        );
        ctx.ui.notify("Android TTS test sent", "info");
      } catch (err: any) {
        ctx.ui.notify(err?.message ?? String(err), "error");
      }
    },
  });

  pi.registerCommand("voice-auto", {
    description: "Toggle automatic speaking of assistant replies: /voice-auto on|off|status",
    handler: async (args, ctx) => {
      const mode = args.trim().toLowerCase();
      if (mode === "on") autoSpeak = true;
      else if (mode === "off") autoSpeak = false;
      else if (mode && mode !== "status") {
        ctx.ui.notify("Usage: /voice-auto on|off|status", "warning");
        return;
      }
      ctx.ui.notify(`Android auto-speak is ${autoSpeak ? "ON" : "OFF"}`, "info");
    },
  });

  pi.registerCommand("voice-settings-android", {
    description: "Set Android TTS rate/pitch: /voice-settings-android rate=1.0 pitch=1.0",
    handler: async (args, ctx) => {
      for (const part of args.trim().split(/\s+/).filter(Boolean)) {
        const [key, raw] = part.split("=");
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        if (key === "rate") defaultRate = value;
        if (key === "pitch") defaultPitch = value;
      }
      ctx.ui.notify(`Android TTS settings: rate=${defaultRate}, pitch=${defaultPitch}`, "info");
    },
  });

  pi.on("message_end", async (event, ctx) => {
    if (!autoSpeak || event.message.role !== "assistant") return;
    const text = cleanForSpeech(messageText(event.message));
    if (!text) return;
    try {
      await speak(text);
    } catch (err: any) {
      ctx.ui.notify(err?.message ?? String(err), "error");
    }
  });

  pi.registerTool({
    name: "android_tts_speak",
    label: "Android TTS Speak",
    description: "Speak text aloud using Android Termux:API text-to-speech.",
    promptSnippet: "Speak short text aloud through Android TTS.",
    promptGuidelines: [
      "Use android_tts_speak only when the user explicitly asks to speak something aloud.",
    ],
    parameters: Type.Object({
      text: Type.String({ description: "Text to speak aloud" }),
      rate: Type.Optional(Type.Number({ description: "Speech rate, e.g. 1.0" })),
      pitch: Type.Optional(Type.Number({ description: "Speech pitch, e.g. 1.0" })),
    }),
    async execute(_toolCallId, params) {
      await speak(params.text, params.rate, params.pitch);
      return {
        content: [{ type: "text", text: "Spoken via Android TTS." }],
        details: { length: params.text.length },
      };
    },
  });
}

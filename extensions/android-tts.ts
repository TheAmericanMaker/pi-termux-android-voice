import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const execFileAsync = promisify(execFile);
const settingsPath = join(homedir(), ".pi", "agent", "android-tts-settings.json");

type AndroidTtsSettings = {
  autoSpeak: boolean;
  rate: number;
  pitch: number;
};

let settings: AndroidTtsSettings = loadSettings();
let suppressNextAssistantAutoSpeak = false;

function loadSettings(): AndroidTtsSettings {
  const defaults = { autoSpeak: false, rate: 1, pitch: 1 };
  try {
    if (!existsSync(settingsPath)) return defaults;
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8"));
    return {
      autoSpeak: typeof parsed.autoSpeak === "boolean" ? parsed.autoSpeak : defaults.autoSpeak,
      rate: typeof parsed.rate === "number" ? parsed.rate : defaults.rate,
      pitch: typeof parsed.pitch === "number" ? parsed.pitch : defaults.pitch,
    };
  } catch {
    return defaults;
  }
}

function saveSettings(): void {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

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

async function runTermuxTts(args: string[], timeout = 120_000): Promise<void> {
  try {
    await execFileAsync("termux-tts-speak", args, { timeout });
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

async function speak(text: string, rate = settings.rate, pitch = settings.pitch): Promise<void> {
  const trimmed = cleanForSpeech(text);
  if (!trimmed) throw new Error("No text provided");

  const args: string[] = [];
  if (typeof rate === "number") args.push("-r", String(rate));
  if (typeof pitch === "number") args.push("-p", String(pitch));
  args.push(trimmed);

  await runTermuxTts(args);
}

async function stopSpeech(): Promise<void> {
  // Termux:API does not currently expose a dedicated tts-stop command.
  // Sending an empty utterance is the best-effort Android TTS interruption path.
  await runTermuxTts([""], 5_000);
}

function setAutoSpeak(enabled: boolean): AndroidTtsSettings {
  settings = { ...settings, autoSpeak: enabled };
  saveSettings();
  return settings;
}

function updateVoiceSettings(rate?: number, pitch?: number): AndroidTtsSettings {
  settings = {
    ...settings,
    rate: Number.isFinite(rate) ? Number(rate) : settings.rate,
    pitch: Number.isFinite(pitch) ? Number(pitch) : settings.pitch,
  };
  saveSettings();
  return settings;
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${command}`], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

async function commandResponds(command: string, args: string[] = []): Promise<boolean> {
  try {
    await execFileAsync(command, args, { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function voiceDoctorSummary(): Promise<string> {
  const checks: string[] = [];
  let failures = 0;
  let warnings = 0;

  async function check(label: string, ok: boolean | Promise<boolean>, required = true) {
    const passed = await ok;
    if (passed) checks.push(`✅ ${label}`);
    else if (required) {
      failures += 1;
      checks.push(`❌ ${label}`);
    } else {
      warnings += 1;
      checks.push(`⚠️ ${label}`);
    }
  }

  await check("termux-tts-speak command exists", commandExists("termux-tts-speak"));
  await check("termux-toast command exists", commandExists("termux-toast"));
  await check("termux-battery-status command exists", commandExists("termux-battery-status"));
  await check("termux-tts-engines command exists", commandExists("termux-tts-engines"), false);
  await check("Termux:API toast responds", commandResponds("termux-toast", ["Pi voice doctor"]));
  await check("Termux:API battery status responds", commandResponds("termux-battery-status"));
  await check("settings file exists", existsSync(settingsPath), false);

  checks.push(`Auto-speak: ${settings.autoSpeak ? "ON" : "OFF"}`);
  checks.push(`Rate: ${settings.rate}, pitch: ${settings.pitch}`);
  checks.push(`Summary: ${failures} failures, ${warnings} warnings`);
  return checks.join("\n");
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
      if (mode === "on") setAutoSpeak(true);
      else if (mode === "off") setAutoSpeak(false);
      else if (mode && mode !== "status") {
        ctx.ui.notify("Usage: /voice-auto on|off|status", "warning");
        return;
      }
      ctx.ui.notify(`Android auto-speak is ${settings.autoSpeak ? "ON" : "OFF"}`, "info");
    },
  });

  pi.registerCommand("voice-stop", {
    description: "Best-effort stop/interruption for current Android TTS speech and disable auto-speak",
    handler: async (_args, ctx) => {
      try {
        setAutoSpeak(false);
        await stopSpeech();
        ctx.ui.notify("Android TTS stopped; auto-speak is OFF", "info");
      } catch (err: any) {
        ctx.ui.notify(err?.message ?? String(err), "error");
      }
    },
  });

  pi.registerShortcut("ctrl+shift+q", {
    description: "Stop Android TTS speech and disable auto-speak",
    handler: async (ctx) => {
      try {
        setAutoSpeak(false);
        await stopSpeech();
        ctx.ui.notify("Android TTS stopped; auto-speak is OFF", "info");
      } catch (err: any) {
        ctx.ui.notify(err?.message ?? String(err), "error");
      }
    },
  });

  pi.registerCommand("voice-doctor", {
    description: "Check Android Termux:API TTS setup from inside Pi",
    handler: async (_args, ctx) => {
      try {
        const summary = await voiceDoctorSummary();
        ctx.ui.notify(summary, summary.includes("❌") ? "error" : "info");
      } catch (err: any) {
        ctx.ui.notify(err?.message ?? String(err), "error");
      }
    },
  });

  pi.registerCommand("voice-settings-android", {
    description: "Set Android TTS rate/pitch: /voice-settings-android rate=1.0 pitch=1.0",
    handler: async (args, ctx) => {
      let rate: number | undefined;
      let pitch: number | undefined;
      for (const part of args.trim().split(/\s+/).filter(Boolean)) {
        const [key, raw] = part.split("=");
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        if (key === "rate") rate = value;
        if (key === "pitch") pitch = value;
      }
      updateVoiceSettings(rate, pitch);
      ctx.ui.notify(`Android TTS settings: rate=${settings.rate}, pitch=${settings.pitch}`, "info");
    },
  });

  pi.on("message_end", async (event, ctx) => {
    if (!settings.autoSpeak || event.message.role !== "assistant") return;
    if (suppressNextAssistantAutoSpeak) {
      suppressNextAssistantAutoSpeak = false;
      return;
    }
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
      suppressNextAssistantAutoSpeak = true;
      return {
        content: [{ type: "text", text: "Spoken via Android TTS." }],
        details: { length: params.text.length },
      };
    },
  });

  pi.registerTool({
    name: "android_tts_config",
    label: "Android TTS Config",
    description: "Turn Android automatic speaking of assistant replies on or off and adjust rate/pitch.",
    promptSnippet: "Toggle Android auto-speak for assistant replies when the user asks for verbal responses.",
    promptGuidelines: [
      "Use android_tts_config to turn auto-speak on when the user asks for verbal/spoken responses.",
      "Use android_tts_config to turn auto-speak off when the user asks to stop speaking aloud.",
      "Do not change auto-speak unless the user requests a voice/speech mode change.",
    ],
    parameters: Type.Object({
      autoSpeak: Type.Optional(Type.Boolean({ description: "Whether assistant replies should be spoken automatically" })),
      rate: Type.Optional(Type.Number({ description: "Speech rate, e.g. 1.0" })),
      pitch: Type.Optional(Type.Number({ description: "Speech pitch, e.g. 1.0" })),
    }),
    async execute(_toolCallId, params) {
      if (typeof params.autoSpeak === "boolean") setAutoSpeak(params.autoSpeak);
      updateVoiceSettings(params.rate, params.pitch);
      return {
        content: [
          {
            type: "text",
            text: `Android TTS settings saved. Auto-speak is ${settings.autoSpeak ? "ON" : "OFF"}. rate=${settings.rate}, pitch=${settings.pitch}.`,
          },
        ],
        details: settings,
      };
    },
  });
}

#!/usr/bin/env bash
set -u

PASS=0
WARN=0
FAIL=0

say_status() {
  local level="$1"
  local message="$2"
  case "$level" in
    pass) printf '✅ %s\n' "$message"; PASS=$((PASS + 1));;
    warn) printf '⚠️  %s\n' "$message"; WARN=$((WARN + 1));;
    fail) printf '❌ %s\n' "$message"; FAIL=$((FAIL + 1));;
    info) printf 'ℹ️  %s\n' "$message";;
  esac
}

have() {
  command -v "$1" >/dev/null 2>&1
}

run_quiet() {
  timeout "${2:-10}" "$1" >/dev/null 2>&1
}

printf '\nPi Termux Android Voice doctor\n'
printf '================================\n\n'

if [ -n "${TERMUX_VERSION:-}" ] || [ -d /data/data/com.termux/files/usr ]; then
  say_status pass "Running in a Termux-like environment."
else
  say_status warn "This does not look like Termux. This project is intended for Android Termux."
fi

if have node; then
  say_status pass "node is installed: $(node --version 2>/dev/null)"
else
  say_status fail "node is missing. Install with: pkg install nodejs"
fi

if have npm; then
  say_status pass "npm is installed: $(npm --version 2>/dev/null)"
else
  say_status warn "npm is missing. It normally comes with nodejs in Termux."
fi

if have git; then
  say_status pass "git is installed: $(git --version 2>/dev/null)"
else
  say_status fail "git is missing. Install with: pkg install git"
fi

if have pi; then
  PI_VERSION="$(pi --version 2>/dev/null | head -1)"
  if [ -n "$PI_VERSION" ]; then
    say_status pass "pi is installed: $PI_VERSION"
  else
    say_status pass "pi is installed: $(command -v pi)"
  fi
else
  say_status fail "pi is missing. Install the Pi coding agent before using this extension."
fi

if have termux-tts-speak; then
  say_status pass "termux-tts-speak is installed."
else
  say_status fail "termux-tts-speak is missing. Install with: pkg install termux-api, and install the Termux:API Android app."
fi

if have termux-toast; then
  if timeout 10 termux-toast "Pi voice doctor test" >/dev/null 2>&1; then
    say_status pass "Termux:API toast command responded."
  else
    say_status fail "termux-toast did not respond. Make sure the Termux:API Android app is installed and not crashing."
  fi
else
  say_status warn "termux-toast is missing; termux-api package may not be installed."
fi

if have termux-battery-status; then
  if timeout 10 termux-battery-status >/dev/null 2>&1; then
    say_status pass "Termux:API battery command responded."
  else
    say_status fail "termux-battery-status did not respond. Termux:API app/package pairing may be broken."
  fi
else
  say_status warn "termux-battery-status is missing; termux-api package may not be installed."
fi

if have termux-tts-engines; then
  say_status pass "Available Android TTS engines command exists."
  termux-tts-engines 2>/dev/null | sed 's/^/   - /' | head -10 || true
else
  say_status warn "termux-tts-engines is missing."
fi

REPO_EXTENSION="extensions/android-tts.ts"
ACTIVE_EXTENSION="$HOME/.pi/agent/extensions/android-tts.ts"
SETTINGS_FILE="$HOME/.pi/agent/android-tts-settings.json"

if [ -f "$REPO_EXTENSION" ]; then
  say_status pass "Repo extension exists: $REPO_EXTENSION"
else
  say_status fail "Repo extension missing: $REPO_EXTENSION"
fi

if [ -f "$ACTIVE_EXTENSION" ]; then
  say_status pass "Active Pi extension exists: $ACTIVE_EXTENSION"
  if [ -f "$REPO_EXTENSION" ] && cmp -s "$REPO_EXTENSION" "$ACTIVE_EXTENSION"; then
    say_status pass "Active extension matches the repo copy."
  else
    say_status warn "Active extension differs from the repo copy. Run: npm run install:android-tts"
  fi
else
  say_status warn "Active Pi extension is not installed yet. Run: npm run install:android-tts"
fi

if [ -f "$SETTINGS_FILE" ]; then
  say_status pass "Android TTS settings file exists: $SETTINGS_FILE"
else
  say_status warn "Android TTS settings file does not exist yet. It is created after /voice-auto or android_tts_config is used."
fi

if [ "${1:-}" = "--speak" ]; then
  if have termux-tts-speak; then
    if timeout 20 termux-tts-speak "Pi Termux Android Voice doctor speech test." >/dev/null 2>&1; then
      say_status pass "Speech test command completed."
    else
      say_status fail "Speech test failed. Check Android TTS engine settings and Termux:API."
    fi
  fi
else
  say_status info "Skipping audible TTS test. Run 'npm run doctor:speak' to speak a test sentence."
fi

printf '\nSummary: %s passed, %s warnings, %s failures.\n' "$PASS" "$WARN" "$FAIL"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

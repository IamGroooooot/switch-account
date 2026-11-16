#!/usr/bin/env bash
# Smoke tests for bin/claude-account and the shell hooks. They run in a
# throwaway HOME with a fake `claude`, so no real login is read or changed.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

export HOME="$tmp/home"
mkdir -p "$HOME/.claude/skills" "$HOME/.claude/projects" "$tmp/bin"
echo '{}' > "$HOME/.claude/settings.json"
echo 'secret' > "$HOME/.claude/.credentials.json"
printf '{"oauthAccount":{"emailAddress":"me@example.com"},"mcpServers":{"m":{"type":"http"}}}\n' \
  > "$HOME/.claude.json"

# The fake claude answers `auth status` per config folder and echoes the rest.
cat > "$tmp/bin/claude" <<'FAKE'
#!/usr/bin/env bash
if [[ "$1 $2" == "auth status" ]]; then
  if [[ -f "${CLAUDE_CONFIG_DIR:-}/fake-email" ]]; then
    echo "{\"loggedIn\": true, \"email\": \"$(cat "$CLAUDE_CONFIG_DIR/fake-email")\", \"loginExpiresAt\": \"2030-01-01T00:00:00Z\"}"
  elif [[ -n "${CLAUDE_CONFIG_DIR:-}" ]]; then
    echo '{"loggedIn": false, "email": null, "loginExpiresAt": null}'
  else
    echo '{"loggedIn": true, "email": "me@example.com", "loginExpiresAt": "2030-01-01T00:00:00Z"}'
  fi
else
  echo "CFG=[${CLAUDE_CONFIG_DIR:-}] ARGS=$*"
fi
FAKE
chmod +x "$tmp/bin/claude"
export PATH="$tmp/bin:$PATH"
unset CLAUDE_CONFIG_DIR CLAUDE_CODE_USER_EMAIL CLAUDE_CODE_ENTRYPOINT CLAUDE_ACCOUNTS_ROOT CLAUDE_ACCOUNT_BASE_NAME

ca="$repo/bin/claude-account"
fails=0
check() {  # check <name> <expected substring> <actual>
  if [[ "$3" == *"$2"* ]]; then echo "ok   $1"
  else echo "FAIL $1: expected '$2' in: $3"; fails=$((fails + 1)); fi
}

check "add" "added 'work'" "$("$ca" add work)"
check "credentials are not shared" "absent" "$([[ -e "$HOME/.claude-accounts/work/config/.credentials.json" ]] && echo present || echo absent)"
check "skills are shared" "$HOME/.claude/skills" "$(readlink "$HOME/.claude-accounts/work/config/skills")"
check "mcp servers carried over" '"m"' "$(cat "$HOME/.claude-accounts/work/config/.claude.json")"
check "list marks base as next" "* personal" "$("$ca" list)"
check "status base" "personal     signed in  me@example.com  (until 2030-01-01)" "$("$ca" status)"
check "status work" "work         NOT signed in" "$("$ca" status work)"
check "json" '"name":"work","email":"","isSignedIn":false' "$("$ca" json)"
check "use" "next is now 'work'" "$("$ca" use work)"
check "dir" "$HOME/.claude-accounts/work/config" "$("$ca" dir)"
check "run" "CFG=[$HOME/.claude-accounts/work/config] ARGS=-p hi" "$("$ca" run work -p hi)"
check "current from env" "work" "$(CLAUDE_CONFIG_DIR="$HOME/.claude-accounts/work/config" "$ca" current)"
desk="$HOME/.claude-accounts/work/desktop-data"
check "current in the base Desktop window" "personal me@gmail.example" \
  "$(CLAUDE_CODE_ENTRYPOINT=claude-desktop CLAUDE_CODE_USER_EMAIL=me@gmail.example "$ca" current)"
check "current in the work Desktop window" "work me@work.example" \
  "$(CLAUDE_CODE_ENTRYPOINT=claude-desktop CLAUDE_CODE_USER_EMAIL=me@work.example bash -c '"$1" current; true' "$desk/Claude" "$ca")"
echo me@example.com > "$HOME/.claude-accounts/work/config/fake-email"
check "status flags a copied login" "same login as work  -> claude-account login personal" "$("$ca" status)"
check "json flags a copied login" '"name":"work","email":"me@example.com","isSignedIn":true,"until":"2030-01-01","isBase":false,"isDefault":true,"isSession":false,"sameLoginAs":"personal"' "$("$ca" json)"
rm "$HOME/.claude-accounts/work/config/fake-email"
check "json without a copy" '"sameLoginAs":""' "$("$ca" json)"
check "base name setting" "* main" "$(CLAUDE_ACCOUNT_BASE_NAME=main "$ca" use main >/dev/null; CLAUDE_ACCOUNT_BASE_NAME=main "$ca" list)"
"$ca" use work >/dev/null

for sh in bash zsh; do
  command -v "$sh" >/dev/null 2>&1 || continue
  check "$sh hook starts as next" "CFG=[$HOME/.claude-accounts/work/config]" \
    "$("$sh" -c "source '$repo/shell/claude-account.sh'; claude x")"
  check "$sh hook keeps a manual dir" "CFG=[/elsewhere]" \
    "$(CLAUDE_CONFIG_DIR=/elsewhere "$sh" -c "source '$repo/shell/claude-account.sh'; claude x")"
done
if command -v fish >/dev/null 2>&1; then
  check "fish hook starts as next" "$HOME/.claude-accounts/work/config" \
    "$(fish --no-config -c "source '$repo/shell/claude-account.fish'; emit fish_preexec x; echo \$CLAUDE_CONFIG_DIR")"
fi

[[ $fails -eq 0 ]] && echo "all script tests passed" || { echo "$fails failed"; exit 1; }

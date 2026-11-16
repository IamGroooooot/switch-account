# claude-account for zsh and bash: source this from ~/.zshrc or ~/.bashrc.
#
# Wraps `claude` so each run starts as the account picked with
# `claude-account use` or `/account use`. Aliases of claude still work: they
# expand to `claude`, which is this function. A CLAUDE_CONFIG_DIR you set
# yourself outside the accounts folder is left alone.
claude() {
  local root="${CLAUDE_ACCOUNTS_ROOT:-$HOME/.claude-accounts}"
  if [ -n "${CLAUDE_CONFIG_DIR:-}" ] && [ "${CLAUDE_CONFIG_DIR#"$root"/}" = "$CLAUDE_CONFIG_DIR" ]; then
    command claude "$@"
    return
  fi
  local name=""
  [ -r "$root/active" ] && name="$(tr -d '[:space:]' < "$root/active")"
  if [ -n "$name" ] && [ -d "$root/$name/config" ]; then
    CLAUDE_CONFIG_DIR="$root/$name/config" command claude "$@"
  else
    # The base account (~/.claude): run without a config folder.
    (unset CLAUDE_CONFIG_DIR; command claude "$@")
  fi
}

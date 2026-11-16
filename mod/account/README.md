# account

The `/account` mod opens a pane for switching between Claude Code accounts. It
also shows the current session's account in the Desktop app's status line.
The `claude-account` script does the switching. The mod finds the script at
`$CLAUDE_ACCOUNT_BIN` or at `~/.local/bin/claude-account`.

To install the script, the shell hook, and this mod together, follow the
repository README. To install only the mod:

```text
/plugin marketplace add IamGroooooot/switch-account
/plugin install account@switch-account
```

See the repository's docs/reference.md for the commands and the pane.

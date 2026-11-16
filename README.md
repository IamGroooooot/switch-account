# switch-account

Use several Claude Code accounts on one machine, for example a personal one
and a work one, without logging out and back in. Each account keeps its own
login. Memory, skills, plugins, mods, rules, and settings stay shared between
them.

switch-account has two parts:

- `claude-account`, a bash script. It registers accounts and sets the account
  that new terminal sessions start as.
- The `/account` mod for Claude Code. It opens a pane where you switch with a
  click, and it shows the current session's account in the Desktop app's
  status line.

To find out why it works this way, read [How switch-account works](docs/how-it-works.md).
For every command and setting, see the [reference](docs/reference.md).

## Before you install

You need:

- macOS or Linux, with bash.
- `plutil` (part of macOS) or `python3`.
- Claude Code 2.1.287 or later. The mod also works in the Code tab of the
  Claude Desktop app.
- For `claude-account desktop`: macOS and the Claude Desktop app.

The account you are signed in to now becomes the base account, named
`personal`. To use another name, set `CLAUDE_ACCOUNT_BASE_NAME` before you
install.

## Install with Claude Code

Paste this prompt into a Claude Code session. Replace `<repository URL>` with
the address of this repository.

```text
Install switch-account from <repository URL> on this machine.

1. Clone the repository to ~/switch-account. If that folder exists, run git pull there instead.
2. Read install.sh. Then tell me which shell startup file `./install.sh --all` will change, and wait for my yes.
3. Run `./install.sh --all` in ~/switch-account.
4. Run `claude-account status` and show me the output.
5. Ask me for a name for my second account, for example work. Then run `claude-account add <name>`.
6. Tell me to run `claude-account login <name>` myself. It opens a browser sign-in. Do not sign in for me.
7. If this is macOS, tell me that `claude-account desktop <name>` opens a Desktop window for that account.

Do not print, copy, or move any token, credential file, or Keychain item.
```

Claude stops at the steps that need you. Those steps are the change to your
shell startup file and the browser sign-in.

## Install by hand

1. Clone the repository and go into it:

   ```bash
   git clone <repository URL> ~/switch-account
   cd ~/switch-account
   ```

2. Run the installer. `--all` links the script into `~/.local/bin`, adds the
   hook for your shell, and installs the mod:

   ```bash
   ./install.sh --all
   ```

   The installer prints each file it changes. For only some of those parts,
   see `./install.sh --help`.

3. Open a new terminal window. Shells that were open before the install don't
   have the hook.

4. Check the base account:

   ```bash
   claude-account status
   ```

   You see one line like `personal     signed in  you@example.com  (until 2026-12-01)`.

## Add your second account

1. Create the account. It shares everything in `~/.claude` except the login:

   ```bash
   claude-account add work
   ```

2. Sign in. A browser window opens once:

   ```bash
   claude-account login work
   ```

3. On macOS, if you use the Desktop app, open a window for the account and
   sign in there once:

   ```bash
   claude-account desktop work
   ```

   The Desktop app keeps its own sign-in, apart from the terminal login, so
   this step is separate.

Run `claude-account status` again. You now see two lines, one per account.

## Switch accounts

To start new terminal sessions as work, run `claude-account use work`. Or
open the pane with `/account` and click **Use next** on the work row.
Sessions that are already open keep their account.

To run one command as another account, without changing what new sessions
use, run `claude-account run personal`. Arguments after the name go to
`claude`.

To open the Desktop app as an account, click **Desktop** in the pane, or run
`claude-account desktop work`.

If a login has less than 3 days left, the pane shows **Re-login** for that
account. You can also run `claude-account login <name>` at any time.

## Uninstall

```bash
~/switch-account/install.sh --uninstall
```

This removes the script link, the shell hook, and the mod. Your extra accounts
stay in `~/.claude-accounts`. To delete them and their logins as well, run
`rm -rf ~/.claude-accounts`.

## Develop

```bash
tests/run.sh
```

`tests/run.sh` runs the script tests in a throwaway `HOME` with a fake
`claude`, and then runs `claude plugin validate` and `claude plugin test` on
`mod/account`.

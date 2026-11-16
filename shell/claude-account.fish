# claude-account: point CLAUDE_CONFIG_DIR at the default account before each
# command, so `claude` (and its aliases) start as the account chosen with
# `claude-account use` or `/account use`. A CLAUDE_CONFIG_DIR you set yourself
# outside ~/.claude-accounts is left alone.
function __claude_account_sync --on-event fish_preexec
    set -l root $HOME/.claude-accounts
    if set -q CLAUDE_CONFIG_DIR; and not string match -q "$root/*" -- $CLAUDE_CONFIG_DIR
        return
    end
    set -l name personal
    if test -r $root/active
        read -l line <$root/active
        and set name (string trim -- $line)
    end
    if test "$name" != personal; and test -d $root/$name/config
        set -gx CLAUDE_CONFIG_DIR $root/$name/config
    else
        set -e CLAUDE_CONFIG_DIR
    end
end

export type Row = {
  name: string
  email: string
  isSignedIn: boolean
  until: string
  /** The account that lives in ~/.claude itself (CLAUDE_CONFIG_DIR unset). */
  isBase: boolean
  /** New terminal sessions start as this account. */
  isDefault: boolean
  /** This session runs as this account. */
  isSession: boolean
}

declare module 'claude-code' {
  interface PluginState {
    account: { rows: Row[]; note: string }
  }
}

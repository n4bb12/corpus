export const chatTabEnterHidden = { opacity: 0, y: 8 } as const
export const chatTabEnterVisible = { opacity: 1, y: 0 } as const

/**
 * Mobile tab reveal: hide while on sources, enter once when switching to chat.
 * Desktop always keeps the visible pose — both panes stay on screen.
 */
export function chatTabEnterAnimate(tab: "sources" | "chat", mdUp: boolean) {
  if (mdUp || tab === "chat") {
    return chatTabEnterVisible
  }

  return chatTabEnterHidden
}

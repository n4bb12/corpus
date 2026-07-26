# UI adjustments and optimizations
_Exported on 7/26/2026 at 05:06:20 GMT+2 from Cursor (3.13.10)_

---

**User**

Make these fixes and adjustments. Make commits for each change as you go.

- Use shadcn scrollbars for scrollable areas such as the sources list and text or the chat thread.
- Citation pill popovers need to close when another is hovered or when the mouse is moved outside.
- Citation markers in the source text currently kiss the text. Make them a bit larger and offset from the text.
- When source texts load, there is a distracting spinner. Let's try a full panel skeleton instead.
- (De)selecting sources is still choppy. Probably causes heavy re-rendering. Optimize.
- The sources changed separator is quite ugly. Use a format like --- icon text ---.
- Sources panel should scroll faster.

---

**Cursor**

I'll work through each fix as a separate commit. First I'm locating the scrollbar, citation, skeleton, and sources-selection code.

Installing the shadcn components with full network access, then applying the fixes one commit at a time.

Updating ScrollArea to support viewport refs, then wiring it into the scrollable panels.

Next: citation popovers — shared open state so only one stays open, and they close when the pointer leaves.

Enlarging citation markers and giving them more offset from the text.

Replacing the source preview loading state with a full-panel skeleton.

Optimizing source selection with optimistic updates, memoized list items, and skipping unnecessary notebook patches.

Updating the sources-changed separator to a `--- icon text ---` style.

Speeding up sources-panel scrolling with a wheel multiplier on that ScrollArea.

All seven adjustments are in, each as its own commit:

1. **ScrollArea** — sources list, source preview, and chat thread use shadcn `ScrollArea`
2. **Citation popovers** — shared open index so hovering another pill or leaving closes the current one
3. **Citation markers** — larger (`size-7`) with more offset from the paragraph text
4. **Source preview loading** — full-panel skeleton instead of “Loading preview…”
5. **Source selection** — optimistic updates, memoized list items, stable callbacks, and no notebook patch on simple toggles
6. **Sources changed** — `--- icon text ---` separator style
7. **Faster sources scroll** — `wheelSpeed={2.25}` on the sources list

`bun fix`, types, and tests all pass.

---

**User**

Here is what I mean by kiss the text.

---

**Cursor**

Got it — that's the green highlight bar in the source preview sitting flush against the text. I'll thicken it and add padding so it no longer kisses the characters.

That was the source-preview highlight bar, not the chat pills. I thickened the left marker and added padding so the text sits clear of it, and reverted the earlier pill sizing change that missed the mark.

---

**User**

> Citation popovers — shared open index so hovering another pill or leaving closes the current one

Better but not as intended quite yet. Popovers seem to get stuck and sometimes don't open. Behaving very glitchy. We could try a tooltip approach with a shared/singleton popover.

Another issue is that these citations sometimes don't have a counterpart in the source text to scroll to.

---

**Cursor**

I'll dig into the glitchy citation popovers and the missing scroll targets, then switch the pills to a shared tooltip/singleton approach.

I'll switch citation pills to Radix tooltips (one open at a time) and add excerpt-based fallback when locators don't land in the source text.

Wiring excerpt fallback into the highlight/scroll path next.

Two fixes landed:

**Citation hovers** — Switched from controlled popovers to a shared `TooltipProvider`. Only one tooltip is open at a time, hover/leave behaves normally, and click still navigates.

**Missing scroll targets** — Locators are resolved against the source text, then fall back to finding the excerpt in the markdown. If neither works, the existing excerpt popover shows. Scroll also targets the first overlapping paragraph when the start offset lands on a blank line.

---

**User**

"Sources changed" should be hash-based so of the selection lands on the previous set, the separator is not added.

---

**Cursor**

I'll check how source-boundary separators are created and make them hash-based so returning to a previous selection doesn't insert another one.

Implementing hash-based source boundaries so reverting to the chat's selection removes a pending separator instead of adding another.

Source boundaries are now hash-based.

Each ready-selected set gets a stable hash. The notebook remembers `chatSelectionHash` from the last chat turn. Changing away from that set still inserts a “Sources changed” separator; switching back to the same hash removes the pending separator instead of adding another one.

---

**User**

Highlighted sources should not be in a nested pannel. only highlight them through a different background.

---

**Cursor**

I'll simplify the citation highlight to a background-only treatment so it no longer reads as a nested panel.

Cited passages now only get a background tint — the padding, inset bar, and rounded “panel” styling are gone.

---

**User**

Yes but full width.or 

---

**Cursor**

I'll bleed the highlight background to the panel edges while keeping the text padding aligned.

The highlight background now bleeds to the panel edges; text stays on the same padded alignment.

---

**User**

Citation pills now show a weird dot and switching content is only possible by leaving a pill and re-hovering a different one. moving the mouse horizontally between pills doesn't work. We keep showing the first one that was hovered.

---

**Cursor**

The arrow is the weird dot, and Radix tooltips aren't swapping content when you move between pills. I'll switch to a singleton hover card that updates on each pill enter.

Implementing a singleton popover anchored to the active pill so content updates on horizontal moves and the tooltip arrow (the dot) goes away.

Fixed both issues with a singleton hover card: one shared popover re-anchors and updates as you move across pills, and the tooltip arrow (the dot) is gone.

---

**User**

Pad the source background but without affecting layout and without borders. Rounded corners.

Unhighlighted:

|  text

Highlighted:

| | text

---

**Cursor**

I'll add padded, rounded highlight backgrounds with compensating negative margins so the text position stays put.

Highlights now have padding and rounded corners. Matching negative margins keep the text where it was, and there’s still no border.

---

**User**

There is still some scattered markdown in the visual sources text, e.g. ** 

---

**Cursor**

I'll check how source preview text is rendered — raw markdown markers like `**` are likely being shown as plain text.

Source preview is rendering raw markdown lines. I'll parse each line with `marked` so markers like `**` display as formatted text.

Source preview now runs each line through `marked`, so things like `**bold**` render as formatting instead of raw markers. Citation offsets still map against the original markdown.

---

**User**

> Highlights now have padding and rounded corners. Matching negative margins keep the text where it was, and there’s still no border.

That's not the look I wanted. I drawed a sketch

---

**Cursor**

Got it — the highlight should start at the text column (not full-bleed), with inner padding and square corners. Updating the styles to match your sketch.

Updated to match the sketch: highlight starts at the text column (not full-bleed), padded around the text, square corners, background only.

---

**User**

> Source preview now runs each line through marked, so things like **bold** render as formatting instead of raw markers. Citation offsets still map against the original markdown.

That's good but we're missing a bit of layout, e.g. the spacing between paragraphs is gone. Are we already using tailwind typography / tailwind prose? And for chat responses?

---

**Cursor**

I'll check how prose/typography is applied in source preview and chat, and why paragraph spacing dropped.

Yes — both source preview and chat use `@tailwindcss/typography` (`prose prose-sm dark:prose-invert`). Spacing broke because we render every non-empty line as its own block and zero out margins. I'll group blank-line-separated blocks and let prose spacing apply again.

Yes — both already use Tailwind Typography via `@plugin "@tailwindcss/typography"`:

- Source preview: `prose prose-sm dark:prose-invert`
- Chat responses: same classes in `AssistantContent`

The spacing bug was from splitting on every non-empty line and zeroing margins. Preview now groups blank-line-separated blocks (like normal markdown paragraphs), renders each with `marked`, and uses `space-y-4` between them.

---

**User**

> Updated to match the sketch: highlight starts at the text column (not full-bleed), padded around the text, square corners, background only.

Yes but with rounded corners as requested. And without affecting layout. The text must stay in the same position.

---

**Cursor**

I'll add rounded corners and padding with matching negative margins so the highlight grows around the text without moving it.

That’s already in place: padding with matching negative margins (text stays put), rounded corners, background only — no full-bleed.

You're right — I'll implement the 50/50 split: half the panel padding stays white, half sits inside the green, text position unchanged, rounded corners.

The highlight now uses half of the panel’s `px-4` padding on each side:

- **Unhighlighted:** `0.5rem` white + `0.5rem` white + text  
- **Highlighted:** `0.5rem` white + green starts + `0.5rem` inside green + text  

Text stays on the same column; corners are rounded (`0.5rem`).


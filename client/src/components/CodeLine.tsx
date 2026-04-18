import type { ThemedToken } from "../lib/highlighter"

interface Props {
  text: string
  tokens: ThemedToken[] | null
  highlightWord?: string | null
  onTokenClick?: (word: string, rect: DOMRect) => void
}

const IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/

export default function CodeLine({
  text,
  tokens,
  highlightWord,
  onTokenClick,
}: Props) {
  if (!tokens) {
    return <>{renderWithHighlight(text, highlightWord)}</>
  }

  return (
    <>
      {tokens.map((token, i) => {
        const isIdent = IDENT_RE.test(token.content.trim())
        const isHighlighted =
          highlightWord && token.content.trim() === highlightWord

        return (
          <span
            key={i}
            style={{ color: token.color }}
            className={[
              isIdent && onTokenClick ? "cursor-pointer hover:underline" : "",
              isHighlighted ? "symbol-highlight" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={
              isIdent && onTokenClick
                ? (e) => {
                    e.stopPropagation()
                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                    onTokenClick(token.content.trim(), rect)
                  }
                : undefined
            }
          >
            {isHighlighted
              ? renderWithHighlight(token.content, highlightWord)
              : token.content}
          </span>
        )
      })}
    </>
  )
}

function renderWithHighlight(
  text: string,
  word: string | null | undefined
): React.ReactNode {
  if (!word || !text.includes(word)) return text

  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0
  while (remaining.includes(word)) {
    const idx = remaining.indexOf(word)
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(
      <span key={key++} className="symbol-highlight">
        {word}
      </span>
    )
    remaining = remaining.slice(idx + word.length)
  }
  if (remaining) parts.push(remaining)
  return <>{parts}</>
}

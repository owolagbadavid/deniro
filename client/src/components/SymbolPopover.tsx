import { useEffect, useRef } from "react"

interface Props {
  word: string
  rect: DOMRect
  onHighlightAll: () => void
  onFindInPR: () => void
  onSearchRepo: () => void
  onClose: () => void
}

export default function SymbolPopover({
  word,
  rect,
  onHighlightAll,
  onFindInPR,
  onSearchRepo,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [onClose])

  const top = rect.bottom + window.scrollY + 4
  const left = rect.left + window.scrollX

  return (
    <div
      ref={ref}
      className="symbol-popover"
      style={{ top, left }}
    >
      <div className="px-3 py-1.5 border-b border-(--border) font-mono text-xs text-(--accent) truncate max-w-[250px]">
        {word}
      </div>
      <button className="symbol-popover-btn" onClick={onHighlightAll}>
        Highlight all
      </button>
      <button className="symbol-popover-btn" onClick={onFindInPR}>
        Find in PR files
      </button>
      <button className="symbol-popover-btn" onClick={onSearchRepo}>
        Search in repo &rarr;
      </button>
    </div>
  )
}

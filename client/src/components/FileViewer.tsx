import { useEffect, useState } from "react"
import { fetchRawFile } from "../api"
import type { ThemedToken } from "../lib/highlighter"
import { langFromFilename, tokenizeCode } from "../lib/highlighter"
import CodeLine from "./CodeLine"

interface Props {
  contentsURL: string
  filename: string
  fileCache: React.RefObject<Record<string, string[]>>
  highlightWord?: string | null
  onTokenClick?: (word: string, rect: DOMRect) => void
  onClose: () => void
}

export default function FileViewer({
  contentsURL,
  filename,
  fileCache,
  highlightWord,
  onTokenClick,
  onClose,
}: Props) {
  const [lines, setLines] = useState<string[] | null>(null)
  const [error, setError] = useState(false)
  const [tokenLines, setTokenLines] = useState<ThemedToken[][] | null>(null)

  const lang = langFromFilename(filename)

  useEffect(() => {
    const cache = fileCache.current
    if (cache[contentsURL]) {
      setLines(cache[contentsURL])
      return
    }

    fetchRawFile(contentsURL)
      .then((text) => {
        const l = text.split("\n")
        cache[contentsURL] = l
        setLines(l)
      })
      .catch(() => setError(true))
  }, [contentsURL, fileCache])

  // Tokenize the full file as a block for better accuracy
  useEffect(() => {
    if (!lines || !lang) return
    tokenizeCode(lines.join("\n"), lang).then((result) => {
      if (result) setTokenLines(result)
    })
  }, [lines, lang])

  return (
    <div className="fixed top-0 right-0 w-[55%] h-screen bg-(--bg) border-l border-(--border) z-100 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-4 py-3 bg-(--surface) border-b border-(--border) font-mono text-[13px] font-medium">
        <span className="truncate">{filename}</span>
        <button
          onClick={onClose}
          className="text-(--accent) hover:underline bg-transparent text-[13px]"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="p-4 text-(--muted) text-[13px] text-center">
            Failed to load file
          </div>
        ) : !lines ? (
          <div className="p-4 text-(--muted) text-[13px] text-center">
            Loading...
          </div>
        ) : (
          <table className="diff-table file-table">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-(--surface)">
                  <td className="diff-ln">{i + 1}</td>
                  <td className="diff-code text-(--text)">
                    <CodeLine
                      text={line}
                      tokens={tokenLines?.[i] ?? null}
                      highlightWord={highlightWord}
                      onTokenClick={onTokenClick}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

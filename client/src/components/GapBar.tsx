import { useState, useEffect } from "react"
import { fetchRawFile } from "../api"
import type { ThemedToken } from "../lib/highlighter"
import { langFromFilename, tokenizeLine } from "../lib/highlighter"
import CodeLine from "./CodeLine"

interface Props {
  newStart: number
  newEnd: number
  oldStart: number
  contentsURL: string
  filename: string
  fileCache: React.RefObject<Record<string, string[]>>
  highlightWord?: string | null
  onTokenClick?: (word: string, rect: DOMRect) => void
}

export default function GapBar({
  newStart,
  newEnd,
  oldStart,
  contentsURL,
  filename,
  fileCache,
  highlightWord,
  onTokenClick,
}: Props) {
  const [lines, setLines] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [tokenCache, setTokenCache] = useState<Record<number, ThemedToken[]>>({})

  const lang = langFromFilename(filename)

  useEffect(() => {
    if (!lines || !lang) return

    const end = newEnd === -1 ? lines.length : newEnd
    if (newStart > end) return

    const slice = lines.slice(newStart - 1, end)
    Promise.all(
      slice.map(async (line, i) => {
        const tokens = await tokenizeLine(line, lang)
        return [newStart + i, tokens] as const
      })
    ).then((results) => {
      const cache: Record<number, ThemedToken[]> = {}
      for (const [lineNum, tokens] of results) {
        if (tokens) cache[lineNum] = tokens
      }
      setTokenCache(cache)
    })
  }, [lines, lang, newStart, newEnd])

  if (lines) {
    const end = newEnd === -1 ? lines.length : newEnd
    if (newStart > end) return null

    return (
      <table className="diff-table">
        <tbody>
          {Array.from({ length: end - newStart + 1 }, (_, i) => {
            const lineNum = newStart + i
            const oldLn = oldStart + i
            const text = lines[lineNum - 1] ?? ""
            const tokens = tokenCache[lineNum] ?? null

            return (
              <tr key={lineNum} className="diff-ctx">
                <td className="diff-ln">{oldLn}</td>
                <td className="diff-ln">{lineNum}</td>
                <td className="diff-code">
                  <CodeLine
                    text={text}
                    tokens={tokens}
                    highlightWord={highlightWord}
                    onTokenClick={onTokenClick}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const label =
    newEnd === -1
      ? `\u2195 Show remaining lines from line ${newStart}`
      : `\u2195 Show ${newEnd - newStart + 1} hidden lines (${newStart}\u2013${newEnd})`

  async function expand() {
    setLoading(true)
    try {
      const cache = fileCache.current
      if (!cache[contentsURL]) {
        const text = await fetchRawFile(contentsURL)
        cache[contentsURL] = text.split("\n")
      }
      setLines(cache[contentsURL])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="diff-gap-bar text-(--red)">Failed to load file</div>
    )
  }

  return (
    <div className="diff-gap-bar" onClick={expand}>
      {loading ? "Loading..." : label}
    </div>
  )
}

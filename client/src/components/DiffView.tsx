import { useEffect, useState } from "react"
import { parseHunks } from "../utils"
import type { ThemedToken } from "../lib/highlighter"
import { langFromFilename, tokenizeLine } from "../lib/highlighter"
import CodeLine from "./CodeLine"
import GapBar from "./GapBar"

interface Props {
  patch: string
  contentsURL: string
  status: string
  filename: string
  fileCache: React.RefObject<Record<string, string[]>>
  highlightWord?: string | null
  onTokenClick?: (word: string, rect: DOMRect) => void
}

export default function DiffView({
  patch,
  contentsURL,
  status,
  filename,
  fileCache,
  highlightWord,
  onTokenClick,
}: Props) {
  const [tokenCache, setTokenCache] = useState<Record<string, ThemedToken[]>>({})

  const lang = langFromFilename(filename)

  useEffect(() => {
    if (!patch || !lang) return

    const lines = patch.split("\n").filter((l) => !l.startsWith("@@"))
    const unique = [...new Set(lines.map((l) => (l.length > 0 ? l.slice(1) : "")))]
      .filter((code) => !(code in tokenCache))

    if (unique.length === 0) return

    Promise.all(
      unique.map(async (code) => {
        const tokens = await tokenizeLine(code, lang)
        return [code, tokens] as const
      })
    ).then((results) => {
      const newCache: Record<string, ThemedToken[]> = {}
      for (const [code, tokens] of results) {
        if (tokens) newCache[code] = tokens
      }
      setTokenCache((prev) => ({ ...prev, ...newCache }))
    })
  }, [patch, lang])

  if (!patch) {
    return (
      <div className="p-4 text-[var(--muted)] text-[13px] text-center">
        Binary file or no diff available
      </div>
    )
  }

  const hunks = parseHunks(patch)
  const canExpand = contentsURL && status !== "removed"
  let prevNewEnd = 0
  let prevOldEnd = 0

  const elements: React.ReactNode[] = []

  hunks.forEach((hunk, hi) => {
    const gapNewStart = prevNewEnd + 1
    const gapNewEnd = hunk.newStart - 1
    const gapOldStart = prevOldEnd + 1
    const gapCount = gapNewEnd - gapNewStart + 1

    if (gapCount > 0 && canExpand) {
      elements.push(
        <GapBar
          key={`gap-${hi}`}
          newStart={gapNewStart}
          newEnd={gapNewEnd}
          oldStart={gapOldStart}
          contentsURL={contentsURL}
          filename={filename}
          fileCache={fileCache}
          highlightWord={highlightWord}
          onTokenClick={onTokenClick}
        />
      )
    }

    elements.push(
      <div key={`hh-${hi}`} className="diff-hunk-header">
        {hunk.header}
      </div>
    )

    elements.push(
      <table key={`ht-${hi}`} className="diff-table">
        <tbody>
          {hunk.lines.map((l, li) => {
            const prefix = l.text.length > 0 ? l.text[0] : " "
            const code = l.text.length > 0 ? l.text.slice(1) : ""
            const tokens = tokenCache[code] ?? null

            return (
              <tr
                key={li}
                className={
                  l.type === "add"
                    ? "diff-add"
                    : l.type === "del"
                      ? "diff-del"
                      : "diff-ctx"
                }
              >
                <td className="diff-ln">{l.oldLn ?? ""}</td>
                <td className="diff-ln">{l.newLn ?? ""}</td>
                <td className="diff-code">
                  <span className="diff-prefix">{prefix}</span>
                  <CodeLine
                    text={code}
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

    prevNewEnd = hunk.newEnd
    prevOldEnd = hunk.oldEnd
  })

  if (hunks.length > 0 && canExpand) {
    elements.push(
      <GapBar
        key="gap-end"
        newStart={prevNewEnd + 1}
        newEnd={-1}
        oldStart={prevOldEnd + 1}
        contentsURL={contentsURL}
        filename={filename}
        fileCache={fileCache}
        highlightWord={highlightWord}
        onTokenClick={onTokenClick}
      />
    )
  }

  return <>{elements}</>
}

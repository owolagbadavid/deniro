import { useEffect, useState } from "react"
import type { CodeSearchResult } from "../types"
import { searchCode } from "../api"

interface Props {
  owner: string
  repo: string
  query: string
  onClose: () => void
}

export default function SearchPanel({ owner, repo, query, onClose }: Props) {
  const [results, setResults] = useState<CodeSearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    setError("")
    searchCode(owner, repo, query)
      .then(setResults)
      .catch((err) => setError(err.message ?? "Search failed"))
      .finally(() => setLoading(false))
  }, [owner, repo, query])

  return (
    <div className="fixed top-0 right-0 w-[45%] h-screen bg-(--bg) border-l border-(--border) z-100 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-4 py-3 bg-(--surface) border-b border-(--border) text-[13px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-(--muted)">Search:</span>
          <span className="font-mono font-medium text-(--accent) truncate">
            {query}
          </span>
          <span className="text-(--muted) shrink-0">
            in {owner}/{repo}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-(--accent) hover:underline bg-transparent text-[13px] shrink-0 ml-2"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-4 text-(--muted) text-[13px] text-center">
            Searching...
          </div>
        )}

        {error && (
          <div className="p-4 text-(--red) text-[13px] text-center">
            {error}
          </div>
        )}

        {!loading && !error && results && (
          <div className="p-4">
            <div className="text-xs text-(--muted) mb-3">
              {results.total_count} result{results.total_count !== 1 ? "s" : ""} found
            </div>
            {results.items.map((item, i) => (
              <div
                key={i}
                className="mb-3 border border-(--border) rounded-lg overflow-hidden"
              >
                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 bg-(--surface) text-[13px] font-mono text-(--accent) hover:underline truncate"
                >
                  {item.path}
                </a>
                {item.text_matches.map((match, mi) => (
                  <pre
                    key={mi}
                    className="px-3 py-2 text-xs font-mono text-(--text) whitespace-pre-wrap border-t border-(--border) leading-relaxed"
                  >
                    {highlightFragment(match.fragment, query)}
                  </pre>
                ))}
              </div>
            ))}
            {results.items.length === 0 && (
              <div className="text-(--muted) text-[13px] text-center py-4">
                No results found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function highlightFragment(
  fragment: string,
  query: string
): React.ReactNode {
  if (!query) return fragment

  const parts: React.ReactNode[] = []
  const lower = fragment.toLowerCase()
  const qLower = query.toLowerCase()
  let remaining = fragment
  let offset = 0
  let key = 0

  while (true) {
    const idx = lower.indexOf(qLower, offset)
    if (idx === -1) break

    if (idx > offset) {
      parts.push(remaining.slice(offset, idx))
    }
    parts.push(
      <span key={key++} className="symbol-highlight">
        {remaining.slice(idx, idx + query.length)}
      </span>
    )
    offset = idx + query.length
  }

  if (offset < remaining.length) {
    parts.push(remaining.slice(offset))
  }

  return parts.length > 0 ? <>{parts}</> : fragment
}

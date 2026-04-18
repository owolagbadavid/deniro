import type { HighlighterCore, ThemedToken } from "shiki"
import { createHighlighter } from "shiki"

let highlighter: HighlighterCore | null = null
let loading: Promise<HighlighterCore> | null = null
const loadedLangs = new Set<string>()

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  go: "go",
  py: "python",
  rb: "ruby",
  rs: "rust",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  php: "php",
  r: "r",
  lua: "lua",
  zig: "zig",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  dart: "dart",
  vue: "vue",
  svelte: "svelte",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",
  ps1: "powershell",
  dockerfile: "dockerfile",
  md: "markdown",
  mdx: "mdx",
  graphql: "graphql",
  gql: "graphql",
  proto: "proto",
  tf: "hcl",
  hcl: "hcl",
  vim: "viml",
  el: "lisp",
  clj: "clojure",
  cljs: "clojure",
}

export function langFromFilename(filename: string): string | null {
  const parts = filename.split("/").pop()?.split(".") ?? []
  if (parts.length < 2) {
    // Handle special filenames
    const name = (parts[0] ?? "").toLowerCase()
    if (name === "dockerfile") return "dockerfile"
    if (name === "makefile") return "make"
    return null
  }
  const ext = parts[parts.length - 1].toLowerCase()
  return EXT_TO_LANG[ext] ?? null
}

async function getHighlighter(): Promise<HighlighterCore> {
  if (highlighter) return highlighter
  if (loading) return loading
  loading = createHighlighter({
    themes: ["github-dark"],
    langs: [],
  })
  highlighter = await loading
  return highlighter
}

async function ensureLang(h: HighlighterCore, lang: string): Promise<boolean> {
  if (loadedLangs.has(lang)) return true
  try {
    await h.loadLanguage(lang as Parameters<typeof h.loadLanguage>[0])
    loadedLangs.add(lang)
    return true
  } catch {
    return false
  }
}

export async function tokenizeLine(
  line: string,
  lang: string
): Promise<ThemedToken[] | null> {
  const h = await getHighlighter()
  if (!(await ensureLang(h, lang))) return null
  const result = h.codeToTokens(line, { lang, theme: "github-dark" })
  return result.tokens[0] ?? null
}

export async function tokenizeCode(
  code: string,
  lang: string
): Promise<ThemedToken[][] | null> {
  const h = await getHighlighter()
  if (!(await ensureLang(h, lang))) return null
  const result = h.codeToTokens(code, { lang, theme: "github-dark" })
  return result.tokens
}

export type { ThemedToken }

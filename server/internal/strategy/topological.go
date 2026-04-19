package strategy

import (
	"diffr/internal/model"
	"path"
	"regexp"
	"strings"
)

// func init() { Register(topological{}) }

type topological struct{}

func (topological) Name() string { return "topological" }
func (topological) Description() string {
	return "Order by dependencies — review imported files first"
}

func (topological) Organize(files []model.FileDiff) []model.FileGroup {
	n := len(files)
	if n == 0 {
		return nil
	}

	// Map filename stems to their index for matching imports.
	// e.g. "server/internal/model/file.go" → stems: ["file", "model/file"]
	idx := map[string]int{} // stem → file index
	for i, f := range files {
		idx[f.Filename] = i
		base := strings.TrimSuffix(path.Base(f.Filename), path.Ext(f.Filename))
		idx[base] = i
		// Also register dir/base for more precise matching.
		dir := path.Dir(f.Filename)
		if dir != "." {
			idx[path.Base(dir)+"/"+base] = i
		}
	}

	// Build adjacency: deps[i] = set of file indices that file i imports.
	deps := make([]map[int]bool, n)
	for i := range deps {
		deps[i] = map[int]bool{}
	}

	for i, f := range files {
		for _, imp := range extractImports(f.Patch) {
			if j, ok := matchImport(imp, idx, i); ok {
				deps[i][j] = true // file i depends on file j
			}
		}
	}

	// Kahn's algorithm: files with no in-PR dependencies come first.
	// inDegree[i] = number of in-PR files that i depends on.
	// Files with inDegree 0 are dependencies (reviewed first).
	inDegree := make([]int, n)
	for i := range deps {
		inDegree[i] = len(deps[i])
	}

	queue := make([]int, 0, n)
	for i := 0; i < n; i++ {
		if inDegree[i] == 0 {
			queue = append(queue, i)
		}
	}

	sorted := make([]model.FileDiff, 0, n)
	visited := make([]bool, n)
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		if visited[cur] {
			continue
		}
		visited[cur] = true
		sorted = append(sorted, files[cur])

		// Find files that depend on cur and decrement their in-degree.
		for i := range deps {
			if deps[i][cur] {
				inDegree[i]--
				if inDegree[i] == 0 {
					queue = append(queue, i)
				}
			}
		}
	}

	// Append any files not reached (cycles or no imports).
	for i, f := range files {
		if !visited[i] {
			sorted = append(sorted, f)
		}
	}

	return []model.FileGroup{{Name: "Dependency order", Files: sorted}}
}

var (
	// Go: import "pkg/path" or entries inside import ( ... )
	goImportRe = regexp.MustCompile(`"([^"]+)"`)
	// JS/TS: from "..." or require("...")
	jsFromRe    = regexp.MustCompile(`from\s+["']([^"']+)["']`)
	jsRequireRe = regexp.MustCompile(`require\(["']([^"']+)["']\)`)
	// Python: import x.y or from x.y import z
	pyImportRe = regexp.MustCompile(`(?:from|import)\s+([\w.]+)`)
	// C#: using Namespace.Sub; (not namespace — declarations cause false cycles)
	csUsingRe = regexp.MustCompile(`using\s+(?:static\s+)?([A-Za-z][\w.]*)\s*;`)
	// Rust: use crate::module::item; (not mod — declares submodule, not dependency)
	rustUseRe = regexp.MustCompile(`use\s+([\w:]+)`)
	// Java: import com.example.Foo;
	javaImportRe = regexp.MustCompile(`import\s+(?:static\s+)?([\w.]+)\s*;`)
	// PHP: use Namespace\Class; (not namespace — declarations cause false cycles)
	phpUseRe = regexp.MustCompile(`use\s+([\w\\\\]+)\s*[;,]`)
)

// extractImports scans patch lines for import-like statements and returns
// the imported paths/modules.
func extractImports(patch string) []string {
	if patch == "" {
		return nil
	}

	var imports []string
	seen := map[string]bool{}
	add := func(s string) {
		s = strings.TrimSpace(s)
		if s != "" && !seen[s] {
			seen[s] = true
			imports = append(imports, s)
		}
	}

	for _, line := range strings.Split(patch, "\n") {
		// Skip removed lines and hunk headers.
		if strings.HasPrefix(line, "-") || strings.HasPrefix(line, "@@") {
			continue
		}
		// Strip the +/space prefix.
		if len(line) > 0 && (line[0] == '+' || line[0] == ' ') {
			line = line[1:]
		}

		line = strings.TrimSpace(line)

		// JS/TS imports
		for _, m := range jsFromRe.FindAllStringSubmatch(line, -1) {
			add(m[1])
		}
		for _, m := range jsRequireRe.FindAllStringSubmatch(line, -1) {
			add(m[1])
		}
		// Go imports (lines inside import blocks that contain quoted strings)
		if strings.Contains(line, `"`) && !strings.HasPrefix(line, "//") {
			for _, m := range goImportRe.FindAllStringSubmatch(line, -1) {
				add(m[1])
			}
		}
		// Python imports
		if strings.HasPrefix(line, "import ") || strings.HasPrefix(line, "from ") {
			for _, m := range pyImportRe.FindAllStringSubmatch(line, -1) {
				add(strings.ReplaceAll(m[1], ".", "/"))
			}
		}
		// C#: using Namespace.Sub;
		if strings.HasPrefix(line, "using ") && strings.HasSuffix(line, ";") {
			for _, m := range csUsingRe.FindAllStringSubmatch(line, -1) {
				add(strings.ReplaceAll(m[1], ".", "/"))
			}
		}
		// Rust: use crate::module::item;
		if strings.HasPrefix(line, "use ") && strings.Contains(line, "::") {
			for _, m := range rustUseRe.FindAllStringSubmatch(line, -1) {
				imp := strings.ReplaceAll(m[1], "::", "/")
				imp = strings.TrimPrefix(imp, "crate/")
				add(imp)
			}
		}
		// Java: import com.example.Foo;
		if strings.HasPrefix(line, "import ") && strings.Contains(line, ";") {
			for _, m := range javaImportRe.FindAllStringSubmatch(line, -1) {
				add(strings.ReplaceAll(m[1], ".", "/"))
			}
		}
		// PHP: use Namespace\Class;
		if strings.HasPrefix(line, "use ") && strings.Contains(line, `\`) {
			for _, m := range phpUseRe.FindAllStringSubmatch(line, -1) {
				add(strings.ReplaceAll(m[1], `\`, "/"))
			}
		}
	}
	return imports
}

// matchImport tries to match an import path against known filenames.
// Returns the matched file index and true if found.
func matchImport(imp string, idx map[string]int, self int) (int, bool) {
	// Try exact match first.
	if j, ok := idx[imp]; ok && j != self {
		return j, true
	}
	// Try the last path component (basename without extension).
	base := path.Base(imp)
	base = strings.TrimSuffix(base, path.Ext(base))
	if j, ok := idx[base]; ok && j != self {
		return j, true
	}
	// Try dir/base.
	dir := path.Dir(imp)
	if dir != "." {
		key := path.Base(dir) + "/" + base
		if j, ok := idx[key]; ok && j != self {
			return j, true
		}
	}
	return 0, false
}

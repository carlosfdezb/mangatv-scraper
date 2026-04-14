#!/usr/bin/env bash
# Sync skills to AI assistant configurations
# Run from project root: ./skills/setup.sh [--all]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_SOURCE="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 mangatv-scraper Skills Setup${NC}"
echo ""

sync_claude() {
    local claude_dir="$PROJECT_ROOT/.claude"
    mkdir -p "$claude_dir"
    
    # Create CLAUDE.md with skill triggers
    cat > "$claude_dir/CLAUDE.md" << 'CLAUDE_EOF'
# MangaTV Scraper - AI Assistant Rules

## Skill Auto-Loading
When performing these actions, ALWAYS load the corresponding skill FIRST:

| Action | Load Skill | Why |
|--------|-----------|-----|
| Adding scraper methods | `mangatv-scraper` | Class structure, method signatures |
| Adding/modifying types | `mangatv-types` | Type definitions, interfaces |
| Writing HTML parsers | `mangatv-parser` | Selectors, data extraction |
| Modifying HTTP client | `mangatv-http` | Retry, rate limiting, headers |
| Writing tests | Use vitest patterns | Table-driven, mocking, fixtures |

Load skills by reading: `skills/{skill-name}/SKILL.md`
CLAUDE_EOF
    
    echo -e "${GREEN}✓ Synced to .claude/CLAUDE.md${NC}"
}

sync_copilot() {
    local copilot_dir="$PROJECT_ROOT/.github"
    mkdir -p "$copilot_dir"
    
    cat > "$copilot_dir/copilot-instructions.md" << 'COPILOT_EOF'
# MangaTV Scraper - GitHub Copilot Instructions

## Skills
Read `skills/{name}/SKILL.md` for context before editing related code.
Available skills: mangatv-scraper, mangatv-types, mangatv-parser, mangatv-http
COPILOT_EOF
    
    echo -e "${GREEN}✓ Synced to .github/copilot-instructions.md${NC}"
}

sync_opencode() {
    echo -e "${GREEN}✓ OpenCode uses AGENTS.md directly (already configured)${NC}"
}

case "${1:-}" in
    --all|-a)
        sync_claude
        sync_copilot
        sync_opencode
        ;;
    *)
        echo "Usage: $0 [--all]"
        echo "  --all  Sync to all AI assistant configs"
        ;;
esac

echo ""
echo -e "${GREEN}✅ Skills setup complete!${NC}"

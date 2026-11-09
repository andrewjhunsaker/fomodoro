#!/usr/bin/env bash
# Runs a Claude Code hook (.claude/hooks/<hook>.ts) under Node >= 24, whatever `node` is on PATH.
#   run.sh <hook> guard  - PreToolUse guards: fail closed. A crash or missing Node 24 exits 2 (block).
#   run.sh <hook> soft   - other hooks: a missing Node 24 warns and exits 0, so a Stop hook can't loop.
# Uses only bash builtins so it works with a minimal PATH.
set -u

hook="${1:-}"
mode="${2:-}"
if [[ -z $hook || ($mode != guard && $mode != soft) ]]; then
  echo "usage: run.sh <hook-name> <guard|soft>" >&2
  exit 2
fi

here="${BASH_SOURCE[0]%/*}"
[[ $here == "${BASH_SOURCE[0]}" ]] && here=.
script="$here/$hook.ts"
MIN_MAJOR=24

# Prints "major minor patch" for a "vX.Y.Z" string, or nothing if it doesn't parse.
parse_version() {
  local v="${1#v}"
  [[ $v =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]] || return 1
  echo "${BASH_REMATCH[1]} ${BASH_REMATCH[2]} ${BASH_REMATCH[3]}"
}

find_node() {
  local path_node major minor patch key best_key=-1 best="" cand ver
  if path_node="$(command -v node 2>/dev/null)"; then
    if read -r major minor patch < <(parse_version "$("$path_node" --version 2>/dev/null)"); then
      if ((major >= MIN_MAJOR)); then
        echo "$path_node"
        return 0
      fi
    fi
  fi
  # Newest nvm install with major >= 24 (the directory name is the version).
  for cand in "$HOME"/.nvm/versions/node/v*/bin/node; do
    [[ -x $cand ]] || continue
    ver="${cand%/bin/node}"
    ver="${ver##*/}"
    read -r major minor patch < <(parse_version "$ver") || continue
    ((major >= MIN_MAJOR)) || continue
    key=$((major * 1000000 + minor * 1000 + patch))
    if ((key > best_key)); then
      best_key=$key
      best=$cand
    fi
  done
  [[ -n $best ]] && echo "$best"
}

if ! node_bin="$(find_node)"; then
  echo "fomodoro hooks need Node 24 (nvm install 24)" >&2
  [[ $mode == guard ]] && exit 2
  exit 0
fi

if [[ $mode == soft ]]; then
  exec "$node_bin" "$script"
fi

"$node_bin" "$script"
code=$?
if ((code != 0 && code != 2)); then
  echo "guard hook $hook failed (exit $code); blocking to be safe" >&2
  exit 2
fi
exit "$code"

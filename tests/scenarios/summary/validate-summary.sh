#!/usr/bin/env bash
set -u
[ "$#" -eq 1 ] && [ -f "$1" ] || { echo 'FAIL: usage: validate-summary.sh <summary.yaml>' >&2; exit 1; }
if grep -Eq '(ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY)' "$1"; then
  echo 'FAIL: credential-like pattern found' >&2; exit 1
fi
python3 - "$1" <<'PY'
import re, sys
try:
    import yaml
except ImportError:
    print('FAIL: YAML parser unavailable (PyYAML required)', file=sys.stderr); sys.exit(1)
class Loader(yaml.SafeLoader):
    pass
def mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if not isinstance(key, str) or key in result:
            raise ValueError('invalid or duplicate key')
        result[key] = loader.construct_object(value_node)
    return result
Loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
try:
    text = open(sys.argv[1], encoding='utf-8').read()
    data = yaml.load(text, Loader=Loader)
    if not isinstance(data, dict): raise ValueError('mapping required')
    allowed = set('schema_version factory_version project task base final_revision worktree_state environment outcome verification review duration cost lesson'.split())
    prohibited = re.compile(r'^(api[_-]?key|apikey|password|passwd|secret|token|authorization|prompt|transcript|trace|conversation|messages|full[-_]?log)$', re.I)
    def inspect(value):
        if isinstance(value, dict):
            for k, v in value.items():
                if prohibited.fullmatch(k): raise ValueError('prohibited key')
                inspect(v)
        elif isinstance(value, list):
            for v in value: inspect(v)
    inspect(data)
    if set(data) - allowed: raise ValueError('unknown key')
    if type(data.get('schema_version')) is not int or data['schema_version'] != 1: raise ValueError('schema version')
    for key in 'factory_version project task base final_revision worktree_state environment outcome verification review'.split():
        if not isinstance(data.get(key), str) or not data[key].strip(): raise ValueError('required string')
    if data['outcome'] not in ('completed','ready-for-review','blocked','unknown') or data['worktree_state'] not in ('clean','dirty','unknown'): raise ValueError('invalid value')
    if 'lesson' in data and (not isinstance(data['lesson'], str) or not data['lesson'].strip()): raise ValueError('invalid lesson')
    for key in ('duration', 'cost'):
        if key not in data: raise ValueError('missing metric')
        if data[key] is not None:
            if type(data[key]) not in (int, float) or data[key] < 0 or not re.search(r'^'+key+r':[^\n]*#\s*measured\b', text, re.M): raise ValueError('invalid metric')
except (Exception,) as exc:
    print('FAIL: invalid summary', file=sys.stderr); sys.exit(1)
print('OK: summary valid')
PY

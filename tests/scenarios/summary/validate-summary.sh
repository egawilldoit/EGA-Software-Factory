#!/usr/bin/env bash
set -u
[ "$#" -eq 1 ] && [ -f "$1" ] || { echo 'FAIL: usage: validate-summary.sh <summary.yaml>' >&2; exit 1; }
if grep -Eq '(ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY)' "$1"; then
  echo 'FAIL: credential-like pattern found' >&2; exit 1
fi
python3 - "$1" <<'PY'
import re, sys
from datetime import datetime
from urllib.parse import urlsplit, parse_qsl
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
    version = data.get('schema_version')
    if type(version) is not int or version not in (1, 2): raise ValueError('schema version')
    allowed = set('schema_version factory_version project task base final_revision worktree_state environment outcome verification review duration cost lesson'.split())
    if version == 2:
        allowed.update('recorded_at links checks review_detail delivery blockers rework'.split())
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
    for key in 'factory_version project task base final_revision worktree_state environment outcome verification review'.split():
        if not isinstance(data.get(key), str) or not data[key].strip(): raise ValueError('required string')
    if data['outcome'] not in ('completed','ready-for-review','blocked','unknown') or data['worktree_state'] not in ('clean','dirty','unknown'): raise ValueError('invalid value')
    if 'lesson' in data and (not isinstance(data['lesson'], str) or not data['lesson'].strip()): raise ValueError('invalid lesson')
    if version == 2:
        def fields(value, keys):
            if not isinstance(value, dict) or set(value) != set(keys.split()): raise ValueError('invalid fields')
        def nonempty(value):
            if not isinstance(value, str) or not value.strip(): raise ValueError('empty text')
        stamp = data.get('recorded_at')
        nonempty(stamp)
        parsed = datetime.fromisoformat(stamp.replace('Z', '+00:00'))
        if parsed.utcoffset() is None or parsed.utcoffset().total_seconds() != 0: raise ValueError('UTC timestamp required')
        links = data.get('links')
        fields(links, 'task thread pr')
        for value in links.values():
            if value is None: continue
            nonempty(value)
            url = urlsplit(value)
            if url.scheme not in ('https', 't3-thread', 't3-context') or not url.netloc or url.username or url.password:
                raise ValueError('invalid evidence link')
            for key, _ in parse_qsl(url.query, keep_blank_values=True):
                if re.search(r'token|secret|password|credential|authorization|api.?key|signature|^sig$|^key$|^auth$|^code$', key, re.I):
                    raise ValueError('sensitive evidence link query')
        checks = data.get('checks')
        if not isinstance(checks, list): raise ValueError('checks list required')
        for check in checks:
            fields(check, 'name status evidence')
            nonempty(check['name']); nonempty(check['evidence'])
            if check['status'] not in ('passed', 'failed', 'skipped', 'not-checked'): raise ValueError('invalid check status')
        detail = data.get('review_detail')
        fields(detail, 'independence evidence')
        if detail['independence'] not in ('same-agent', 'independent', 'none', 'unknown'): raise ValueError('invalid review independence')
        nonempty(detail['evidence'])
        delivery = data.get('delivery')
        fields(delivery, 'merged deployed verified_live evidence')
        for key in ('merged', 'deployed', 'verified_live'):
            if delivery[key] not in ('yes', 'no', 'unknown'): raise ValueError('invalid delivery status')
        nonempty(delivery['evidence'])
        for key in ('blockers', 'rework'):
            if not isinstance(data.get(key), list): raise ValueError('list required')
            for value in data[key]: nonempty(value)
    for key in ('duration', 'cost'):
        if key not in data: raise ValueError('missing metric')
        if data[key] is not None:
            if type(data[key]) not in (int, float) or data[key] < 0 or not re.search(r'^'+key+r':[^\n]*#\s*measured\b', text, re.M): raise ValueError('invalid metric')
except (Exception,) as exc:
    print('FAIL: invalid summary', file=sys.stderr); sys.exit(1)
print('OK: summary valid')
PY

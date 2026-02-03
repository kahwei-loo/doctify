#!/usr/bin/env python3
"""Add 'from __future__ import annotations' to Python files."""

import os
from pathlib import Path

files_to_fix = [
    'app/models/chat.py',
    'app/models/common.py',
    'app/models/edit_history.py',
    'app/models/insights.py',
    'app/models/ocr.py',
    'app/models/settings.py',
    'app/models/template.py',
    'app/models/user.py',
]

def add_future_annotations(filepath):
    """Add future annotations import after docstring."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already has the import
    if 'from __future__ import annotations' in content:
        return False

    lines = content.split('\n')
    insert_index = 0

    # Find end of module docstring
    in_docstring = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if '"""' in stripped:
            if not in_docstring:
                in_docstring = True
            else:
                # End of docstring found
                insert_index = i + 1
                break

    # Insert the import after docstring
    if insert_index > 0:
        lines.insert(insert_index, '')
        lines.insert(insert_index + 1, 'from __future__ import annotations')
        lines.insert(insert_index + 2, '')

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True

    return False

if __name__ == '__main__':
    for filepath in files_to_fix:
        if os.path.exists(filepath):
            if add_future_annotations(filepath):
                print(f'✓ Fixed: {filepath}')
            else:
                print(f'- Skipped: {filepath} (already has import)')
        else:
            print(f'✗ Not found: {filepath}')

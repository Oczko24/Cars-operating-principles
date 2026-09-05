import os
import sys

def check_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    stack = []
    for i, c in enumerate(content):
        if c in '{[(':
            stack.append((c, i))
        elif c in '}])':
            if not stack:
                print(f"Unmatched {c} at {filepath}:{i}")
                return False
            last, pos = stack.pop()
            if (c == '}' and last != '{') or \
               (c == ']' and last != '[') or \
               (c == ')' and last != '('):
                print(f"Mismatched {c} (expected match for {last}) at {filepath}:{i}")
                return False
    if stack:
        print(f"Unmatched {stack[-1][0]} at {filepath}:{stack[-1][1]}")
        return False
    return True

files = ['src/scene/EngineBuilder.ts', 'src/scene/modules/SceneAssembler.ts']
files += [os.path.join('src/scene/modules/engine', f) for f in os.listdir('src/scene/modules/engine') if f.endswith('.ts')]

for f in files:
    if not check_file(f):
        print(f"FAILED: {f}")
        sys.exit(1)

print("All files balanced!")

import re

with open('src/scene/EngineBuilder.ts', 'r') as f:
    content = f.read()

def find_pos(sub):
    idx = content.find(sub)
    print(f"{sub[:20]}: {idx}")
    return idx

find_pos('const crankMaster = ')
find_pos('const banks = {};')
find_pos('// ═══ 1. UNIWERSALNY KOLEKTOR')
find_pos('// ═══ 2. UNIWERSALNY KOLEKTOR WYDECHOWY')
find_pos('// ═══ 3. PEŁNY UKŁAD WYDECHOWY')

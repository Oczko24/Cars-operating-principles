import re
import sys

def style_to_dict(style_str):
    if not style_str.strip(): return "{}"
    parts = style_str.split(';')
    props = []
    for p in parts:
        if ':' not in p: continue
        k, v = p.split(':', 1)
        k = k.strip()
        v = v.strip()
        # kebab to camel
        k = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
        props.append(f"'{k}': '{v}'")
    return "{{ " + ", ".join(props) + " }}"

def convert_html_to_jsx(html):
    # class to className
    html = re.sub(r'\bclass=', 'className=', html)
    # for to htmlFor
    html = re.sub(r'\bfor=', 'htmlFor=', html)
    # style="..."
    html = re.sub(r'style="([^"]*)"', lambda m: 'style=' + style_to_dict(m.group(1)), html)
    
    # Close self closing tags
    for tag in ['img', 'input', 'br', 'hr']:
        html = re.sub(r'(<'+tag+r'\b[^>]*)(?<!/)>', r'\1 />', html)

    # HTML comments
    html = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', html, flags=re.DOTALL)

    return html

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract body
body_match = re.search(r'<body>(.*?)</body>', content, flags=re.DOTALL | re.IGNORECASE)
if not body_match:
    print("No body found")
    sys.exit(1)

body_html = body_match.group(1)

# Remove script tags
body_html = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', body_html)

jsx_body = convert_html_to_jsx(body_html)

app_tsx = """import React, { useState, useEffect, useRef } from 'react';
import { Canvas3D } from './components/Canvas3D';
import { i18n, detectBrowserLanguage } from './i18n';
import { PARTS_DATA, calculateSpecs } from './parts';
import { setupDevDrawer, setupSettingsModal } from './scene/DebugTools';

export default function App() {
  const [lang, setLang] = useState(() => detectBrowserLanguage());
  const [config, setConfig] = useState({
    block: "block_i4",
    valvetrain: "valve_dohc",
    aspiration: "asp_na",
    drivetrain: "drive_rwd",
    suspension: "susp_wishbone"
  });
  const [activeCategory, setActiveCategory] = useState("block");
  const [stats, setStats] = useState<any>({});
  
  const sceneRef = useRef<any>(null);

  const t = i18n[lang as keyof typeof i18n] || i18n.pl;

  useEffect(() => {
    // We should call setupDevDrawer if we pass a mock app object
    // Or refactor DebugTools later. For now we just mount it.
    setupSettingsModal();
  }, []);

  const handleFrameStats = (newStats: any) => {
    setStats(newStats);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas3D 
        config={config} 
        activeCategory={activeCategory} 
        lang={lang} 
        onFrameStats={handleFrameStats} 
        sceneRef={sceneRef} 
      />
      """ + jsx_body + """
    </div>
  );
}
"""

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_tsx)

print("Created App.tsx")

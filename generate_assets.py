#!/usr/bin/env python3
"""
generate_assets.py — Fishing Fortune Reels
Generates all 10 symbol PNGs plus background and frame images.

Requirements:
  - Python 3 (stdlib only)
  - ImageMagick  (the `convert` command, v6 or v7)

Usage:
  python3 generate_assets.py

SVG files are written to /tmp/ffr_assets/ (avoids any permission issues in assets/)
then converted to PNG in the assets/ folder alongside this script.
"""

import os, subprocess, pathlib, textwrap

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = pathlib.Path(__file__).parent.resolve()
ASSETS_DIR  = SCRIPT_DIR / 'assets'
TMP_DIR     = pathlib.Path('/tmp/ffr_assets')

ASSETS_DIR.mkdir(exist_ok=True)
TMP_DIR.mkdir(exist_ok=True)

SIZE = 200  # SVG canvas / PNG output size in px

# ── Helper ───────────────────────────────────────────────────────────────────
def write_and_convert(name: str, svg: str):
    svg_path = TMP_DIR / f'{name}.svg'
    png_path = ASSETS_DIR / f'{name}.png'
    svg_path.write_text(svg, encoding='utf-8')
    try:
        subprocess.run(
            ['convert', '-background', 'none', '-size', f'{SIZE}x{SIZE}',
             str(svg_path), str(png_path)],
            check=True, capture_output=True
        )
        print(f'  OK  {name}.png')
    except subprocess.CalledProcessError as e:
        print(f'  !!  {name} — {e.stderr.decode().strip()[:120]}')
    except FileNotFoundError:
        print('  !!  ImageMagick `convert` not found — install ImageMagick first.')
        raise SystemExit(1)

def svg_wrap(content: str, defs: str = '') -> str:
    """Wrap SVG body in a 200x200 canvas with shared filters + custom defs."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 200 200">
  <defs>
    <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.65)"/>
    </filter>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
{textwrap.indent(defs, "    ")}
  </defs>
{textwrap.indent(content, "  ")}
</svg>'''

# ═══════════════════════════════════════════════════════════════════════════
# SYMBOL DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

# ── 1. SMALL FISH (cyan-blue tropical fish) ───────────────────────────────
SMALL_FISH_DEFS = '''
<radialGradient id="bg_sf" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#183878" stop-opacity="0.5"/>
  <stop offset="100%" stop-color="#060e22" stop-opacity="0.85"/>
</radialGradient>
<linearGradient id="body_sf" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#70e4ff"/>
  <stop offset="40%" stop-color="#18a8e8"/>
  <stop offset="100%" stop-color="#0858b0"/>
</linearGradient>
<linearGradient id="fin_sf" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#90eeff"/>
  <stop offset="100%" stop-color="#1098d8"/>
</linearGradient>
'''
SMALL_FISH = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_sf)"/>
<!-- Tail fin -->
<polygon points="48,100 28,76 28,124" fill="url(#body_sf)" opacity="0.9" filter="url(#ds)"/>
<!-- Body -->
<ellipse cx="108" cy="100" rx="58" ry="34" fill="url(#body_sf)" filter="url(#ds)"/>
<!-- Dorsal fin -->
<path d="M90 70 Q105 44 125 58 Q115 70 90 70" fill="url(#fin_sf)" opacity="0.85"/>
<!-- Pectoral fin -->
<ellipse cx="100" cy="118" rx="20" ry="9" fill="url(#fin_sf)" opacity="0.72" transform="rotate(10,100,118)"/>
<!-- Belly highlight -->
<ellipse cx="110" cy="108" rx="42" ry="16" fill="white" opacity="0.14"/>
<!-- Scale shine -->
<ellipse cx="118" cy="90" rx="16" ry="10" fill="white" opacity="0.22" transform="rotate(-20,118,90)"/>
<!-- Eye -->
<circle cx="148" cy="94" r="10" fill="white"/>
<circle cx="150" cy="94" r="6.5" fill="#002848"/>
<circle cx="152" cy="91" r="2.5" fill="white"/>
<!-- Mouth -->
<path d="M162 101 Q167 106 164 112" stroke="#0060b8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
''', SMALL_FISH_DEFS)

# ── 2. BIG FISH (tropical orange-yellow) ──────────────────────────────────
BIG_FISH_DEFS = '''
<linearGradient id="body_bf" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#ffcc40"/>
  <stop offset="35%" stop-color="#ff8820"/>
  <stop offset="100%" stop-color="#cc3800"/>
</linearGradient>
<linearGradient id="stripe_bf" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#ffe080"/>
  <stop offset="100%" stop-color="#ff6010"/>
</linearGradient>
<radialGradient id="bg_bf" cx="50%" cy="40%" r="55%">
  <stop offset="0%" stop-color="#382008" stop-opacity="0.5"/>
  <stop offset="100%" stop-color="#0e0804" stop-opacity="0.85"/>
</radialGradient>
'''
BIG_FISH = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_bf)"/>
<!-- Tail fin -->
<polygon points="40,100 18,72 18,128" fill="url(#body_bf)" opacity="0.88" filter="url(#ds)"/>
<!-- Body -->
<ellipse cx="110" cy="100" rx="66" ry="40" fill="url(#body_bf)" filter="url(#ds)"/>
<!-- Vertical stripes -->
<ellipse cx="100" cy="100" rx="8" ry="38" fill="url(#stripe_bf)" opacity="0.5"/>
<ellipse cx="120" cy="100" rx="7" ry="36" fill="url(#stripe_bf)" opacity="0.4"/>
<!-- Dorsal fin -->
<path d="M80 64 Q98 36 122 52 Q112 64 80 64" fill="url(#stripe_bf)" opacity="0.82"/>
<!-- Pectoral fin -->
<ellipse cx="108" cy="124" rx="24" ry="11" fill="url(#stripe_bf)" opacity="0.72" transform="rotate(12,108,124)"/>
<!-- Belly highlight -->
<ellipse cx="114" cy="112" rx="48" ry="18" fill="white" opacity="0.18"/>
<!-- Scale sparkle -->
<ellipse cx="122" cy="88" rx="18" ry="11" fill="white" opacity="0.25" transform="rotate(-25,122,88)"/>
<!-- Eye -->
<circle cx="154" cy="92" r="12" fill="white"/>
<circle cx="156" cy="92" r="8" fill="#200800"/>
<circle cx="158" cy="89" r="3" fill="white"/>
<!-- Gill line -->
<path d="M138 78 Q134 100 140 122" stroke="rgba(200,60,0,0.5)" stroke-width="3" fill="none"/>
''', BIG_FISH_DEFS)

# ── 3. CRAB (red with claws) ───────────────────────────────────────────────
CRAB_DEFS = '''
<radialGradient id="body_cr" cx="50%" cy="35%" r="58%">
  <stop offset="0%" stop-color="#ff9050"/>
  <stop offset="60%" stop-color="#e83010"/>
  <stop offset="100%" stop-color="#900010"/>
</radialGradient>
<radialGradient id="bg_cr" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#3a1008" stop-opacity="0.55"/>
  <stop offset="100%" stop-color="#0e0504" stop-opacity="0.9"/>
</radialGradient>
'''
CRAB = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_cr)"/>
<!-- Shell body -->
<ellipse cx="100" cy="108" rx="52" ry="40" fill="url(#body_cr)" filter="url(#ds)"/>
<!-- Shell ribs -->
<path d="M58 98 Q100 84 142 98" stroke="rgba(255,160,80,0.5)" stroke-width="2.5" fill="none"/>
<path d="M62 110 Q100 97 138 110" stroke="rgba(255,160,80,0.35)" stroke-width="2" fill="none"/>
<!-- Left big claw -->
<ellipse cx="50" cy="75" rx="22" ry="16" fill="url(#body_cr)" transform="rotate(-30,50,75)" filter="url(#ds)"/>
<ellipse cx="38" cy="60" rx="18" ry="13" fill="url(#body_cr)" transform="rotate(-50,38,60)"/>
<line x1="42" y1="64" x2="54" y2="78" stroke="#600010" stroke-width="3"/>
<!-- Right big claw -->
<ellipse cx="150" cy="75" rx="22" ry="16" fill="url(#body_cr)" transform="rotate(30,150,75)" filter="url(#ds)"/>
<ellipse cx="162" cy="60" rx="18" ry="13" fill="url(#body_cr)" transform="rotate(50,162,60)"/>
<line x1="158" y1="64" x2="146" y2="78" stroke="#600010" stroke-width="3"/>
<!-- Left legs -->
<path d="M68 116 Q52 122 44 134" stroke="url(#body_cr)" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M62 124 Q44 134 38 148" stroke="url(#body_cr)" stroke-width="6" fill="none" stroke-linecap="round"/>
<!-- Right legs -->
<path d="M132 116 Q148 122 156 134" stroke="url(#body_cr)" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M138 124 Q156 134 162 148" stroke="url(#body_cr)" stroke-width="6" fill="none" stroke-linecap="round"/>
<!-- Eye stalks -->
<line x1="86" y1="76" x2="79" y2="62" stroke="#cc2800" stroke-width="4"/>
<circle cx="79" cy="58" r="8" fill="white"/>
<circle cx="80" cy="58" r="5" fill="#200000"/>
<circle cx="82" cy="56" r="2" fill="white"/>
<line x1="114" y1="76" x2="121" y2="62" stroke="#cc2800" stroke-width="4"/>
<circle cx="121" cy="58" r="8" fill="white"/>
<circle cx="122" cy="58" r="5" fill="#200000"/>
<circle cx="124" cy="56" r="2" fill="white"/>
<!-- Shell gloss -->
<ellipse cx="100" cy="100" rx="38" ry="22" fill="white" opacity="0.14"/>
''', CRAB_DEFS)

# ── 4. OCTOPUS (purple) ────────────────────────────────────────────────────
OCTOPUS_DEFS = '''
<radialGradient id="head_oc" cx="45%" cy="35%" r="58%">
  <stop offset="0%" stop-color="#c870f0"/>
  <stop offset="55%" stop-color="#8820c8"/>
  <stop offset="100%" stop-color="#480088"/>
</radialGradient>
<radialGradient id="bg_oc" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#280840" stop-opacity="0.5"/>
  <stop offset="100%" stop-color="#0c0420" stop-opacity="0.9"/>
</radialGradient>
'''
OCTOPUS = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_oc)"/>
<!-- Tentacles -->
<path d="M72 130 Q52 150 38 164 Q44 170 52 165 Q66 154 80 136" stroke="url(#head_oc)" stroke-width="11" fill="none" stroke-linecap="round"/>
<path d="M84 140 Q74 160 66 177 Q73 180 79 175 Q89 160 94 142" stroke="url(#head_oc)" stroke-width="11" fill="none" stroke-linecap="round"/>
<path d="M100 142 Q100 164 100 178 Q107 178 107 173 Q106 160 106 142" stroke="url(#head_oc)" stroke-width="11" fill="none" stroke-linecap="round"/>
<path d="M116 140 Q126 160 134 177 Q141 174 138 168 Q128 154 118 138" stroke="url(#head_oc)" stroke-width="11" fill="none" stroke-linecap="round"/>
<path d="M128 130 Q148 150 162 164 Q168 158 162 153 Q148 142 132 126" stroke="url(#head_oc)" stroke-width="11" fill="none" stroke-linecap="round"/>
<path d="M68 120 Q40 112 22 110 Q22 118 28 120 Q50 120 70 128" stroke="url(#head_oc)" stroke-width="10" fill="none" stroke-linecap="round"/>
<path d="M132 120 Q160 112 178 110 Q178 118 172 120 Q150 120 130 128" stroke="url(#head_oc)" stroke-width="10" fill="none" stroke-linecap="round"/>
<!-- Sucker dots -->
<circle cx="50" cy="152" r="4" fill="rgba(255,200,255,0.4)"/>
<circle cx="75" cy="162" r="3.5" fill="rgba(255,200,255,0.35)"/>
<circle cx="100" cy="167" r="4" fill="rgba(255,200,255,0.4)"/>
<circle cx="125" cy="162" r="3.5" fill="rgba(255,200,255,0.35)"/>
<circle cx="150" cy="152" r="4" fill="rgba(255,200,255,0.4)"/>
<!-- Head/mantle -->
<ellipse cx="100" cy="94" rx="52" ry="48" fill="url(#head_oc)" filter="url(#ds)"/>
<!-- Head gloss -->
<ellipse cx="86" cy="76" rx="22" ry="16" fill="white" opacity="0.22" transform="rotate(-15,86,76)"/>
<!-- Eyes -->
<circle cx="82" cy="96" r="14" fill="white"/>
<circle cx="84" cy="97" r="9" fill="#180030"/>
<circle cx="87" cy="93" r="3.5" fill="white"/>
<circle cx="118" cy="96" r="14" fill="white"/>
<circle cx="120" cy="97" r="9" fill="#180030"/>
<circle cx="123" cy="93" r="3.5" fill="white"/>
''', OCTOPUS_DEFS)

# ── 5. PEARL SHELL ─────────────────────────────────────────────────────────
PEARL_DEFS = '''
<linearGradient id="shell_ps" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#7090c0"/>
  <stop offset="40%" stop-color="#4868a8"/>
  <stop offset="100%" stop-color="#283860"/>
</linearGradient>
<radialGradient id="pearl_ps" cx="42%" cy="38%" r="55%">
  <stop offset="0%" stop-color="#fffaf0"/>
  <stop offset="35%" stop-color="#f8e8ff"/>
  <stop offset="65%" stop-color="#d8c8f8"/>
  <stop offset="100%" stop-color="#a898e0"/>
</radialGradient>
<radialGradient id="inside_ps" cx="50%" cy="55%" r="55%">
  <stop offset="0%" stop-color="#fce8ff"/>
  <stop offset="60%" stop-color="#d0aae8"/>
  <stop offset="100%" stop-color="#8870c0"/>
</radialGradient>
<radialGradient id="bg_ps" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#1a2050" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="#06081e" stop-opacity="0.9"/>
</radialGradient>
'''
PEARL_SHELL = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_ps)"/>
<!-- Bottom shell -->
<path d="M28 118 Q100 178 172 118 Q172 148 100 162 Q28 148 28 118" fill="url(#shell_ps)" filter="url(#ds)"/>
<!-- Top shell (open) -->
<path d="M28 118 Q100 52 172 118 Q172 90 100 78 Q28 90 28 118" fill="url(#shell_ps)" filter="url(#ds)"/>
<!-- Interior -->
<path d="M38 118 Q100 68 162 118 Q162 142 100 155 Q38 142 38 118" fill="url(#inside_ps)" opacity="0.85"/>
<!-- Ribs -->
<path d="M100 78 L100 155" stroke="rgba(150,130,200,0.4)" stroke-width="2" fill="none"/>
<path d="M68 82 Q72 118 70 152" stroke="rgba(150,130,200,0.3)" stroke-width="1.5" fill="none"/>
<path d="M132 82 Q128 118 130 152" stroke="rgba(150,130,200,0.3)" stroke-width="1.5" fill="none"/>
<path d="M46 96 Q50 118 48 140" stroke="rgba(150,130,200,0.25)" stroke-width="1.5" fill="none"/>
<path d="M154 96 Q150 118 152 140" stroke="rgba(150,130,200,0.25)" stroke-width="1.5" fill="none"/>
<!-- Pearl -->
<circle cx="100" cy="114" r="30" fill="url(#pearl_ps)" filter="url(#ds)"/>
<!-- Pearl highlight -->
<ellipse cx="90" cy="102" rx="10" ry="7" fill="white" opacity="0.7" transform="rotate(-20,90,102)"/>
<ellipse cx="95" cy="107" rx="5" ry="3.5" fill="white" opacity="0.4"/>
<!-- Shell gloss -->
<ellipse cx="78" cy="92" rx="24" ry="14" fill="white" opacity="0.18" transform="rotate(-20,78,92)"/>
''', PEARL_DEFS)

# ── 6. ANCHOR (gold metallic) ──────────────────────────────────────────────
ANCHOR_DEFS = '''
<linearGradient id="metal_an" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#ffe890"/>
  <stop offset="30%" stop-color="#f8d050"/>
  <stop offset="60%" stop-color="#c89820"/>
  <stop offset="100%" stop-color="#806010"/>
</linearGradient>
<linearGradient id="shine_an" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="rgba(255,255,200,0.6)"/>
  <stop offset="100%" stop-color="rgba(255,255,200,0)"/>
</linearGradient>
<radialGradient id="bg_an" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#282010" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="#080600" stop-opacity="0.9"/>
</radialGradient>
'''
ANCHOR = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_an)"/>
<!-- Vertical bar -->
<rect x="92" y="60" width="16" height="100" rx="8" fill="url(#metal_an)" filter="url(#ds)"/>
<!-- Cross bar -->
<rect x="54" y="72" width="92" height="14" rx="7" fill="url(#metal_an)" filter="url(#ds)"/>
<!-- Anchor curves -->
<path d="M92 158 Q50 158 38 130 Q38 114 50 114 Q58 114 58 126 Q60 144 92 150"
      fill="none" stroke="url(#metal_an)" stroke-width="16" stroke-linecap="round" filter="url(#ds)"/>
<path d="M108 158 Q150 158 162 130 Q162 114 150 114 Q142 114 142 126 Q140 144 108 150"
      fill="none" stroke="url(#metal_an)" stroke-width="16" stroke-linecap="round" filter="url(#ds)"/>
<!-- Top ring -->
<circle cx="100" cy="55" r="16" fill="none" stroke="url(#metal_an)" stroke-width="12" filter="url(#ds)"/>
<!-- Cross-bar end circles -->
<circle cx="54" cy="79" r="10" fill="url(#metal_an)"/>
<circle cx="146" cy="79" r="10" fill="url(#metal_an)"/>
<!-- Shine on bar -->
<rect x="94" y="62" width="6" height="96" rx="3" fill="url(#shine_an)" opacity="0.5"/>
<rect x="57" y="73" width="6" height="11" rx="3" fill="url(#shine_an)" opacity="0.4"/>
''', ANCHOR_DEFS)

# ── 7. FISHING HOOK (gold chrome) ─────────────────────────────────────────
HOOK_DEFS = '''
<linearGradient id="chrome_fh" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#fff8e0"/>
  <stop offset="25%" stop-color="#ffe060"/>
  <stop offset="55%" stop-color="#d09010"/>
  <stop offset="85%" stop-color="#806000"/>
  <stop offset="100%" stop-color="#ffd040"/>
</linearGradient>
<linearGradient id="lure_fh" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#ff4488"/>
  <stop offset="50%" stop-color="#ff8844"/>
  <stop offset="100%" stop-color="#ff4488"/>
</linearGradient>
<radialGradient id="bg_fh" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#1e1804" stop-opacity="0.5"/>
  <stop offset="100%" stop-color="#080600" stop-opacity="0.9"/>
</radialGradient>
'''
FISHING_HOOK = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_fh)"/>
<!-- Hook shaft -->
<line x1="100" y1="30" x2="100" y2="120" stroke="url(#chrome_fh)" stroke-width="14"
      stroke-linecap="round" filter="url(#ds)"/>
<!-- Hook curve -->
<path d="M100 120 Q100 168 60 168 Q28 168 28 140 Q28 120 50 118"
      fill="none" stroke="url(#chrome_fh)" stroke-width="14"
      stroke-linecap="round" filter="url(#ds)"/>
<!-- Hook barb -->
<path d="M50 118 Q38 108 46 100" fill="none" stroke="url(#chrome_fh)" stroke-width="10" stroke-linecap="round"/>
<!-- Eye at top -->
<circle cx="100" cy="32" r="14" fill="none" stroke="url(#chrome_fh)" stroke-width="11" filter="url(#ds)"/>
<!-- Lure dressing -->
<ellipse cx="100" cy="46" rx="18" ry="8" fill="url(#lure_fh)" opacity="0.82"/>
<ellipse cx="100" cy="54" rx="14" ry="6" fill="#ff6688" opacity="0.72"/>
<!-- Shaft shine -->
<line x1="106" y1="32" x2="106" y2="118" stroke="rgba(255,250,200,0.5)" stroke-width="4" stroke-linecap="round"/>
<circle cx="50" cy="118" r="5" fill="rgba(255,240,150,0.6)"/>
''', HOOK_DEFS)

# ── 8. TREASURE CHEST ─────────────────────────────────────────────────────
CHEST_DEFS = '''
<linearGradient id="wood_tc" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#c07830"/>
  <stop offset="50%" stop-color="#904810"/>
  <stop offset="100%" stop-color="#602808"/>
</linearGradient>
<linearGradient id="gold_tc" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#ffe880"/>
  <stop offset="40%" stop-color="#f8c820"/>
  <stop offset="100%" stop-color="#a07000"/>
</linearGradient>
<radialGradient id="glow_tc" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#ffd040" stop-opacity="0.9"/>
  <stop offset="100%" stop-color="#c87800" stop-opacity="0"/>
</radialGradient>
<radialGradient id="bg_tc" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#281408" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="#080402" stop-opacity="0.9"/>
</radialGradient>
'''
TREASURE_CHEST = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_tc)"/>
<!-- Gold glow from chest -->
<ellipse cx="100" cy="90" rx="58" ry="30" fill="url(#glow_tc)" opacity="0.55"/>
<!-- Chest base -->
<rect x="26" y="105" width="148" height="74" rx="10" fill="url(#wood_tc)" filter="url(#ds)"/>
<!-- Plank lines -->
<line x1="26" y1="128" x2="174" y2="128" stroke="rgba(60,20,0,0.4)" stroke-width="2"/>
<line x1="26" y1="150" x2="174" y2="150" stroke="rgba(60,20,0,0.4)" stroke-width="2"/>
<!-- Chest lid -->
<path d="M26 108 Q26 62 100 56 Q174 62 174 108 Z" fill="url(#wood_tc)" filter="url(#ds)"/>
<line x1="32" y1="80" x2="168" y2="80" stroke="rgba(60,20,0,0.35)" stroke-width="2"/>
<!-- Gold trim -->
<rect x="26" y="104" width="148" height="9" fill="url(#gold_tc)"/>
<rect x="26" y="105" width="12" height="74" rx="3" fill="url(#gold_tc)" opacity="0.85"/>
<rect x="162" y="105" width="12" height="74" rx="3" fill="url(#gold_tc)" opacity="0.85"/>
<path d="M26 108 Q26 62 100 56 Q174 62 174 108" fill="none" stroke="url(#gold_tc)" stroke-width="9"/>
<!-- Lock body -->
<rect x="86" y="97" width="28" height="22" rx="5" fill="url(#gold_tc)" filter="url(#ds)"/>
<path d="M88 97 Q88 82 100 82 Q112 82 112 97" fill="none" stroke="url(#gold_tc)" stroke-width="8" stroke-linecap="round"/>
<circle cx="100" cy="108" r="5" fill="rgba(100,50,0,0.6)"/>
<!-- Gem decorations on lid -->
<circle cx="64" cy="80" r="6" fill="#ff4444" opacity="0.85" filter="url(#glow)"/>
<circle cx="100" cy="70" r="6" fill="#44aaff" opacity="0.85" filter="url(#glow)"/>
<circle cx="136" cy="80" r="6" fill="#44ff88" opacity="0.85" filter="url(#glow)"/>
<!-- Inner glow -->
<ellipse cx="100" cy="102" rx="44" ry="10" fill="#ffd040" opacity="0.3"/>
''', CHEST_DEFS)

# ── 9. WILD (Golden Net star-burst) ───────────────────────────────────────
WILD_DEFS = '''
<radialGradient id="burst_wld" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#fffce0"/>
  <stop offset="30%" stop-color="#ffe860"/>
  <stop offset="65%" stop-color="#e89010"/>
  <stop offset="100%" stop-color="#804800"/>
</radialGradient>
<radialGradient id="bg_wld" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#302000" stop-opacity="0.5"/>
  <stop offset="100%" stop-color="#0a0800" stop-opacity="0.9"/>
</radialGradient>
<filter id="glow_wld" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur stdDeviation="5" result="blur"/>
  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
</filter>
'''
WILD = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_wld)"/>
<!-- Outer burst rays -->
<g fill="url(#burst_wld)" filter="url(#glow_wld)">
  <polygon points="100,14 108,88 100,100 92,88"/>
  <polygon points="186,100 112,108 100,100 112,92"/>
  <polygon points="100,186 92,112 100,100 108,112"/>
  <polygon points="14,100 88,92 100,100 88,108"/>
  <polygon points="158,42 114,94 100,100 106,86"/>
  <polygon points="158,158 106,114 100,100 114,106"/>
  <polygon points="42,158 94,106 100,100 86,114"/>
  <polygon points="42,42 86,94 100,100 94,86"/>
</g>
<!-- Net circle ring -->
<circle cx="100" cy="100" r="52" fill="none" stroke="url(#burst_wld)" stroke-width="6" filter="url(#glow_wld)"/>
<!-- Net grid -->
<path d="M58 70 Q100 48 142 70 Q164 100 142 130 Q100 152 58 130 Q36 100 58 70"
      fill="none" stroke="rgba(255,220,80,0.55)" stroke-width="2.5"/>
<path d="M70 56 L70 144 M100 48 L100 152 M130 56 L130 144"
      stroke="rgba(255,220,80,0.45)" stroke-width="2" fill="none"/>
<path d="M48 70 L152 70 M48 100 L152 100 M48 130 L152 130"
      stroke="rgba(255,220,80,0.45)" stroke-width="2" fill="none"/>
<!-- Inner glow disc -->
<circle cx="100" cy="100" r="34" fill="url(#burst_wld)" opacity="0.9" filter="url(#glow_wld)"/>
<!-- WILD text -->
<text x="100" y="107" text-anchor="middle" font-family="Arial Black, Impact, sans-serif"
      font-size="22" font-weight="900" fill="#1a0800" letter-spacing="2">WILD</text>
''', WILD_DEFS)

# ── 10. SCATTER (Lucky Lure) ───────────────────────────────────────────────
SCATTER_DEFS = '''
<linearGradient id="lure_sc" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#ff80ee"/>
  <stop offset="40%" stop-color="#cc20dd"/>
  <stop offset="100%" stop-color="#7010aa"/>
</linearGradient>
<linearGradient id="hook_sc" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#e0e0e0"/>
  <stop offset="50%" stop-color="#a0a8c0"/>
  <stop offset="100%" stop-color="#606880"/>
</linearGradient>
<radialGradient id="aura_sc" cx="50%" cy="40%" r="55%">
  <stop offset="0%" stop-color="#ff88ff" stop-opacity="0.6"/>
  <stop offset="100%" stop-color="#8800cc" stop-opacity="0"/>
</radialGradient>
<radialGradient id="bg_sc" cx="50%" cy="40%" r="50%">
  <stop offset="0%" stop-color="#220028" stop-opacity="0.5"/>
  <stop offset="100%" stop-color="#080010" stop-opacity="0.9"/>
</radialGradient>
<filter id="glows_sc" x="-25%" y="-25%" width="150%" height="150%">
  <feGaussianBlur stdDeviation="4" result="blur"/>
  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
</filter>
'''
SCATTER = svg_wrap('''
<circle cx="100" cy="100" r="94" fill="url(#bg_sc)"/>
<!-- Outer glow aura -->
<circle cx="100" cy="95" r="64" fill="url(#aura_sc)" opacity="0.75"/>
<!-- Lure body (elongated oval) -->
<ellipse cx="100" cy="95" rx="36" ry="52" fill="url(#lure_sc)" filter="url(#ds)"/>
<!-- Lure segment lines -->
<line x1="100" y1="48" x2="100" y2="142" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
<ellipse cx="100" cy="75" rx="32" ry="14" fill="rgba(255,160,255,0.22)"/>
<ellipse cx="100" cy="100" rx="32" ry="12" fill="rgba(255,160,255,0.2)"/>
<!-- Lure highlight -->
<ellipse cx="88" cy="70" rx="12" ry="18" fill="white" opacity="0.3" transform="rotate(-15,88,70)"/>
<!-- Hook at bottom -->
<path d="M100 142 Q100 168 72 168 Q52 168 52 148 Q52 136 68 134"
      fill="none" stroke="url(#hook_sc)" stroke-width="10"
      stroke-linecap="round" filter="url(#ds)"/>
<path d="M68 134 Q58 124 66 116" fill="none" stroke="url(#hook_sc)" stroke-width="8" stroke-linecap="round"/>
<!-- Feathers at top -->
<path d="M72 52 Q88 36 100 48" stroke="#ff88ee" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.82"/>
<path d="M80 44 Q96 28 100 48" stroke="#ee66ff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.75"/>
<path d="M100 48 Q108 30 120 44" stroke="#cc88ff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.75"/>
<path d="M100 48 Q118 32 128 52" stroke="#ff88dd" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.82"/>
<!-- Sparkle dots -->
<circle cx="56" cy="76" r="4" fill="#ff80ff" filter="url(#glows_sc)" opacity="0.9"/>
<circle cx="144" cy="76" r="4" fill="#ff80ff" filter="url(#glows_sc)" opacity="0.9"/>
<circle cx="52" cy="108" r="3" fill="#cc80ff" filter="url(#glows_sc)" opacity="0.8"/>
<circle cx="148" cy="108" r="3" fill="#cc80ff" filter="url(#glows_sc)" opacity="0.8"/>
<circle cx="68" cy="52" r="3" fill="#ff60ee" filter="url(#glows_sc)" opacity="0.85"/>
<circle cx="132" cy="52" r="3" fill="#ff60ee" filter="url(#glows_sc)" opacity="0.85"/>
<!-- SCATTER text -->
<text x="100" y="165" text-anchor="middle" font-family="Arial Black, Impact, sans-serif"
      font-size="15" font-weight="900" fill="#ffaaff" letter-spacing="1">SCATTER</text>
''', SCATTER_DEFS)

# ── 11. BACKGROUND OCEAN ──────────────────────────────────────────────────
BACKGROUND_OCEAN = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="seabg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1060c0"/>
      <stop offset="50%" stop-color="#0838a0"/>
      <stop offset="100%" stop-color="#020e40"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#seabg)"/>
  <ellipse cx="60" cy="30" rx="80" ry="40" fill="rgba(100,180,255,0.18)"/>
  <circle cx="60" cy="150" r="8" fill="rgba(200,240,255,0.15)"/>
  <circle cx="120" cy="170" r="5" fill="rgba(200,240,255,0.12)"/>
  <circle cx="160" cy="140" r="6" fill="rgba(200,240,255,0.1)"/>
</svg>'''

# ── 12. SLOT FRAME ─────────────────────────────────────────────────────────
SLOT_FRAME = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 200 200">
  <rect x="5" y="5" width="190" height="190" fill="none"
        stroke="#c89020" stroke-width="8" rx="20"/>
  <rect x="12" y="12" width="176" height="176" fill="none"
        stroke="#f5d060" stroke-width="3" rx="16"/>
</svg>'''

# ═══════════════════════════════════════════════════════════════════════════
# BUILD ALL ASSETS
# ═══════════════════════════════════════════════════════════════════════════

ASSETS = [
    ('small_fish',         SMALL_FISH),
    ('big_fish',           BIG_FISH),
    ('crab',               CRAB),
    ('octopus',            OCTOPUS),
    ('pearl_shell',        PEARL_SHELL),
    ('anchor',             ANCHOR),
    ('fishing_hook',       FISHING_HOOK),
    ('treasure_chest',     TREASURE_CHEST),
    ('wild_golden_net',    WILD),
    ('scatter_lucky_lure', SCATTER),
    ('background_ocean',   BACKGROUND_OCEAN),
    ('slot_frame',         SLOT_FRAME),
]

if __name__ == '__main__':
    print(f'Generating {len(ASSETS)} assets → {ASSETS_DIR}\n')
    for name, svg_content in ASSETS:
        write_and_convert(name, svg_content)
    print(f'\nDone. PNGs saved to: {ASSETS_DIR}')

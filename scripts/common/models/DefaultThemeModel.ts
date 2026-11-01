// Written to the themes folder the first time the app runs. After that the files belong to you.
// Colours must be wrapped in quotes: an unquoted # starts a YAML comment.
export const DEFAULT_THEMES: Record<string, string> = {
    'midnight.yaml': `# Flux Syzygy theme. Copy this file into your themes folder and edit it.
# Wrap colours in quotes: an unquoted "#" starts a YAML comment.
name: Midnight
author: atropinex
mode: dark          # dark | light. Styles native controls such as dropdowns.
accent: project     # project = tint the UI with each project's engine colour, fixed = always use colors.accent
radius: 14          # corner radius in px (0 to 32)
motion: 1           # animation duration multiplier: 0 = no animation, 1 = normal, 2 = twice as slow

colors:
  background: "#0d0b14"
  panel: "#191525"
  panelRaised: "#241e36"
  text: "#f3eefc"
  muted: "#9b93b4"
  accent: "#ff66aa"     # used when accent is "fixed", and for projects without a known engine
  onAccent: "#17101f"   # text on top of accent-coloured buttons
  danger: "#ff8a8a"
`,
    'aurora.yaml': `name: Aurora
author: atropinex
mode: dark
accent: fixed
radius: 18
motion: 1

colors:
  background: "#08121a"
  panel: "#0f1d28"
  panelRaised: "#16293a"
  text: "#e8f6f4"
  muted: "#8aa9b0"
  accent: "#3de0c0"
  onAccent: "#06211c"
  danger: "#ff8f8f"
`,
    'ember.yaml': `name: Ember
author: atropinex
mode: dark
accent: fixed
radius: 6
motion: 0.8

colors:
  background: "#140d0b"
  panel: "#211613"
  panelRaised: "#31201a"
  text: "#fbefe6"
  muted: "#b39a8c"
  accent: "#ff8a3d"
  onAccent: "#2a1204"
  danger: "#ff7a7a"
`,
    'daylight.yaml': `name: Daylight
author: atropinex
mode: light
accent: fixed
radius: 12
motion: 1

colors:
  background: "#f4f1fa"
  panel: "#ffffff"
  panelRaised: "#ffffff"
  text: "#1d1830"
  muted: "#6f688a"
  accent: "#6b4ce6"
  onAccent: "#ffffff"
  danger: "#d64545"
`
};

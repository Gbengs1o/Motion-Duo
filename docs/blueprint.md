# **App Name**: Motion Duo

## Core Features:

- Canvas Drawing & Gesture Support: Users can hand-sketch on the HTML5 canvas with low-latency pointer events, utilizing two-finger pinch-to-zoom/drag-to-pan for navigation, and three-finger swipe for Undo/Redo actions.
- AI Motion Graphics Tool: Leverages Gemini 3.1 Pro capabilities to generate HTML/CSS motion graphics based on the user's canvas sketches and descriptive text prompts, displayed directly within the canvas workspace.
- Dynamic Mode Switching: A 'Sketch' (default) and 'Motion' mode toggle, dynamically changing canvas behavior, displaying appropriate controls (Undo/Redo in Sketch, Timeline/Play in Motion), and triggering the AI generation with a loading state overlay.
- Robust Grid Layout: The main interface is built with a Tailwind CSS Grid (`grid-cols-[auto_1fr_320px]`) ensuring fixed positioning of all UI panels, and dynamically stacking for mobile views (Toolbox/SidePanel below canvas).
- Side Panel with Tabbed Controls: Includes a dynamic side panel with 'Text' for prompt input and AI generation trigger, 'Layers' for visibility and lock toggles, and 'Media' for importing assets via a modal.
- Media Import Workflow: Allows users to import mock image/SVG media, prompting a rename dialog via a React modal before adding the asset to the layer state array.

## Style Guidelines:

- Primary Color: Deep Indigo-Violet (#806CE0) to evoke a professional and creative digital aesthetic, vibrant enough to stand out against dark backgrounds.
- Background Colors: Core application background is dark charcoal (#121214) with panel backgrounds in a slightly lighter charcoal (#232326), adhering to the requested deep dark mode and Procreate Dreams quality.
- Accent Color: Bright Sky Blue (#6CB0F7) provides a clear and energetic contrast to the primary and background hues, ideal for highlights, interactive elements, and micro-interactions.
- Main font: 'Inter', a grotesque sans-serif. Its modern, objective, and neutral aesthetic is highly suitable for both headlines and body text in a professional tablet application, ensuring readability and a premium feel.
- Use clean, vector-based icons that align with a modern, native tablet app aesthetic for clarity and touch interaction targets (e.g., Undo/Redo, visibility toggles, locks, play button, import).
- The core layout follows a strict CSS Grid structure as specified, ensuring panel stability and predictable content flow, adapting responsively for mobile views by stacking vertically.
- Subtle, fluid micro-interactions and transitions should be used throughout the UI to enhance the premium tablet app experience, such as during mode changes, loading states, and panel expansions/collapses.
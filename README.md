# Motion-Duo

A Next.js application for creating motion graphics with AI-powered animation generation.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory and add your Google AI API key:
```bash
GOOGLE_GENAI_API_KEY=your_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

## Features

- Sketch mode: Draw shapes, paths, and text on a canvas
- Motion mode: AI-generated HTML/CSS animations based on your sketch
- Layer management
- Undo/redo support
- Multiple drawing tools (pen, shapes, eraser, fill, text)

## AI Animation Generation

The app uses Google's Gemini AI to generate HTML/CSS animations from your sketches. Make sure you have a valid API key configured in your `.env.local` file.

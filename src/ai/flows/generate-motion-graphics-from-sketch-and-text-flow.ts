'use server';
/**
 * @fileOverview A Genkit flow for generating HTML/CSS motion graphics based on a user's sketch and text description.
 *
 * - generateMotionGraphics - A function that triggers the AI generation process.
 * - GenerateMotionGraphicsInput - The input type for the generateMotionGraphics function.
 * - GenerateMotionGraphicsOutput - The return type for the generateMotionGraphics function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMotionGraphicsInputSchema = z.object({
  canvasDataUri: z
    .string()
    .optional()
    .describe(
      "A representation of the user's sketch on a canvas, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z
    .string()
    .describe(
      'A detailed text description of the desired motion graphics, including elements, animation styles, and desired interactions.'
    ),
  previousCode: z
    .string()
    .optional()
    .describe(
      'The previously generated HTML/CSS/JS code, if this is a refinement request. If provided, modify this code based on the new description.'
    ),
});
export type GenerateMotionGraphicsInput = z.infer<
  typeof GenerateMotionGraphicsInputSchema
>;

const GenerateMotionGraphicsOutputSchema = z.object({
  htmlCssMotionGraphics: z
    .string()
    .describe(
      'The generated HTML, CSS, and JS code representing the motion graphics, suitable for embedding in a web page.'
    ),
});
export type GenerateMotionGraphicsOutput = z.infer<
  typeof GenerateMotionGraphicsOutputSchema
>;

export async function generateMotionGraphics(
  input: GenerateMotionGraphicsInput
): Promise<GenerateMotionGraphicsOutput> {
  return generateMotionGraphicsFlow(input);
}

const generateMotionGraphicsPrompt = ai.definePrompt({
  name: 'generateMotionGraphicsPrompt',
  input: { schema: GenerateMotionGraphicsInputSchema },
  output: { schema: GenerateMotionGraphicsOutputSchema },
  model: 'googleai/gemini-2.5-pro',
  config: { temperature: 0.2 },

  prompt: `You are an expert in motion graphics, HTML, CSS, SVG, and JavaScript animation (e.g., vanilla JS, GSAP). Your task is to create clean, well-structured, and performant web-based motion graphics based on a provided sketch and a textual description.

You are encouraged to use HTML, advanced CSS (keyframes, variables), inline SVGs, and JavaScript to achieve any kind of animation described.

{{#if previousCode}}
This is a refinement request. Please modify the following previously generated code exactly as the new description requests:
Previous Code:
{{{previousCode}}}
{{/if}}

{{#if canvasDataUri}}
User Sketch: {{media url=canvasDataUri}}
{{/if}}

Motion Graphics Description: {{{description}}}

---

IMPORTANT RULES:
1. Always wrap the entire HTML output in a single root <div> element (e.g., <div class="motion-graphics-container" style="width: 100%; height: 100%; position: relative; overflow: hidden;">).
2. You MUST include <style> and <script> tags within this root.
3. Use GSAP via CDN (e.g., <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>) for animations to ensure the best web technology and absolutely zero frame drops.
4. Ensure perfect performance by only animating hardware-accelerated CSS properties (transform, opacity) and never layout properties (width, top, etc.).
5. Make the animation highly visually appealing, highly interactive if requested, and performant. Use structured SVGs for complex vector elements.`,
});

const generateMotionGraphicsFlow = ai.defineFlow(
  {
    name: 'generateMotionGraphicsFlow',
    inputSchema: GenerateMotionGraphicsInputSchema,
    outputSchema: GenerateMotionGraphicsOutputSchema,
  },
  async input => {
    console.log('[generateMotionGraphicsFlow] Input description length:', input.description?.length);

    if (input.canvasDataUri) {
      console.log('[generateMotionGraphicsFlow] Input canvasDataUri format check:', input.canvasDataUri?.startsWith('data:image/'));
      if (!input.canvasDataUri.startsWith('data:image/')) {
        console.error('[generateMotionGraphicsFlow] Invalid canvas data URI provided');
        throw new Error('Invalid canvas data URI.');
      }
    } else if (!input.previousCode) {
      throw new Error('You must provide either a sketch or previous code to refine.');
    }

    try {
      const { output } = await generateMotionGraphicsPrompt(input);
      if (!output || !output.htmlCssMotionGraphics) {
        console.error('[generateMotionGraphicsFlow] Prompt returned null output');
        throw new Error('Failed to generate motion graphics: AI returned no output.');
      }

      // Clean up the output in case AI included markdown code blocks inside the JSON string
      let cleanedHtml = output.htmlCssMotionGraphics;

      // Remove markdown code blocks if present
      cleanedHtml = cleanedHtml.replace(/```html\n?/g, '');
      cleanedHtml = cleanedHtml.replace(/```javascript\n?/g, '');
      cleanedHtml = cleanedHtml.replace(/```\n?/g, '');
      cleanedHtml = cleanedHtml.trim();

      // Ensure it starts with a div tag (or at least attempt to wrap if it doesn't and doesn't start with SVG)
      if (!cleanedHtml.startsWith('<div') && !cleanedHtml.startsWith('<svg')) {
        console.log('[generateMotionGraphicsFlow] Generated HTML missing div/svg tag, attempting to wrap automatically.');
        cleanedHtml = `<div class="motion-graphics-container" style="width: 100%; height: 100%; position: relative; overflow: hidden;">\n${cleanedHtml}\n</div>`;
      }

      console.log('[generateMotionGraphicsFlow] Successfully generated motion graphics');
      return {
        htmlCssMotionGraphics: cleanedHtml,
      };
    } catch (error: any) {
      console.error('[generateMotionGraphicsFlow] ERROR:', error);
      if (error.stack) console.error(error.stack);

      throw new Error(`Synthesis Failed: ${error.message || 'Unknown provider error'}`);
    }
  }

);

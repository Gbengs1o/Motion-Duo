'use server';
/**
 * @fileOverview A Genkit flow for generating HTML/CSS motion graphics based on a user's sketch and text description.
 *
 * - generateMotionGraphics - A function that triggers the AI generation process.
 * - GenerateMotionGraphicsInput - The input type for the generateMotionGraphics function.
 * - GenerateMotionGraphicsOutput - The return type for the generateMotionGraphics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMotionGraphicsInputSchema = z.object({
  canvasDataUri: z
    .string()
    .describe(
      "A representation of the user's sketch on a canvas, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z
    .string()
    .describe(
      'A detailed text description of the desired motion graphics, including elements, animation styles, and desired interactions.'
    ),
});
export type GenerateMotionGraphicsInput = z.infer<
  typeof GenerateMotionGraphicsInputSchema
>;

const GenerateMotionGraphicsOutputSchema = z.object({
  htmlCssMotionGraphics: z
    .string()
    .describe(
      'The generated HTML and CSS code representing the motion graphics, suitable for embedding in a web page.'
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
  input: {schema: GenerateMotionGraphicsInputSchema},
  output: {schema: GenerateMotionGraphicsOutputSchema},
  model: 'googleai/gemini-1.5-pro',
  prompt: `You are an expert in HTML, CSS, and animation. Your task is to create clean, well-structured, and performant HTML/CSS motion graphics based on a provided sketch and a textual description.

Generate only the HTML and CSS code, without any additional explanatory text or markdown outside of the code blocks. The HTML should be self-contained and the CSS should be embedded within a <style> tag in the HTML head.

Focus on creating smooth, visually appealing animations that align with the user's intent.

User Sketch: {{media url=canvasDataUri}}

Motion Graphics Description: {{{description}}}

---

Example Output Structure (ensure your output strictly follows this format):
<div class="animation-container">
  <style>
    .animation-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      background-color: transparent; /* Or a color based on description */
    }
    /* Your CSS animations and styles here */
  </style>
  <!-- Your HTML elements for animation here -->
</div>`,
});

const generateMotionGraphicsFlow = ai.defineFlow(
  {
    name: 'generateMotionGraphicsFlow',
    inputSchema: GenerateMotionGraphicsInputSchema,
    outputSchema: GenerateMotionGraphicsOutputSchema,
  },
  async input => {
    const {output} = await generateMotionGraphicsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate motion graphics.');
    }
    return output;
  }
);

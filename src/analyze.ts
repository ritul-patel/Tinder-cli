import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { extname } from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export interface AnalysisResult {
  score: number;
  action: 'RIGHT' | 'LEFT';
  reasoning: string;
  name: string;
  age: number;
  bio: string;
}

export class ProfileAnalyzer {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async analyze(pageText: string, imagePaths: string[]): Promise<AnalysisResult> {
    const profile = this.extractProfile(pageText);
    const imageAnalysis = await this.analyzeImages(imagePaths);
    const action = imageAnalysis.score >= 7.0 ? 'RIGHT' : 'LEFT';

    return {
      score: Math.round(imageAnalysis.score * 10) / 10,
      action,
      reasoning: imageAnalysis.reasoning,
      name: profile.name,
      age: profile.age,
      bio: profile.bio,
    };
  }

  private extractProfile(pageText: string): { name: string; age: number; bio: string } {
    const ageMatch = pageText.match(/\b(\d{2})\b/);
    const age = ageMatch ? parseInt(ageMatch[1]) : 0;

    const nameMatch = pageText.match(/^([A-Za-z][A-Za-z\s'-]+?)\s+\d{2}\b/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    const bioMatch = pageText.match(/(?:Verified!?\s*)(.+?)(?:\s*Open\s*Profile|$)/i);
    const bio = bioMatch ? bioMatch[1].trim() : '';

    return { name, age, bio };
  }

  private buildImageContent(url: string): { type: 'image_url'; image_url: { url: string } } {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return { type: 'image_url', image_url: { url } };
    }
    const buffer = readFileSync(url);
    const ext = extname(url).toLowerCase();
    const mime = MIME_TYPES[ext] ?? 'image/jpeg';
    return { type: 'image_url', image_url: { url: `data:${mime};base64,${buffer.toString('base64')}` } };
  }

  private parseResponse(content: string): { score: number; reasoning: string } | null {
    const cleaned = content.replace(/```(?:json)?\n?/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const obj = Array.isArray(parsed)
        ? parsed.reduce((a: any, b: any) => (b.score > a.score ? b : a), parsed[0])
        : parsed;
      return { score: obj.score ?? 0, reasoning: obj.reasoning ?? 'No reasoning provided' };
    } catch {
      const scoreMatch = cleaned.match(/"score"\s*:\s*([\d.]+)/);
      const reasonMatch = cleaned.match(/"reasoning"\s*:\s*"([^"]*)"/);
      if (scoreMatch) {
        return {
          score: parseFloat(scoreMatch[1]),
          reasoning: reasonMatch ? reasonMatch[1] : 'No reasoning provided',
        };
      }
    }
    return null;
  }

  private async analyzeImages(imagePaths: string[]): Promise<{ score: number; reasoning: string }> {
    if (!imagePaths || imagePaths.length === 0) {
      return { score: 0, reasoning: 'No images available' };
    }

    try {
      const imagesToAnalyze = imagePaths.slice(0, 4);
      const imageContents = imagesToAnalyze.map((url) => this.buildImageContent(url));

      const response = await this.client.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: this.getVisionPrompt(imagesToAnalyze.length) },
              ...imageContents,
            ],
          },
        ],
      });

      const content = response.choices[0].message.content ?? '';
      const result = this.parseResponse(content);
      if (result) return result;
    } catch (error) {
      console.error('Error analyzing images:', error);
    }

    return { score: 5, reasoning: 'Unable to analyze images' };
  }

  private getVisionPrompt(imageCount: number): string {
    return `Analyze ${imageCount} Tinder profile image(s). Rate attractiveness 0-10.

Rules:
- No visible face → score 0
- Overweight / obese body → score 0-2 max
- Slim / fit / average body + visible face → rate 1-10 based on face, grooming, confidence
- Only score 7+ if: face clearly visible, slim/fit body, attractive appearance

Return ONLY a single JSON object (no markdown):
{"score": <0-10>, "reasoning": "<one sentence>"}`;
  }
}

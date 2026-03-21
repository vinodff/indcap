/**
 * TemplateManager — localStorage-based caption template save/load system.
 * Allows creators to save and reuse their custom caption styles.
 */

import { CaptionStyle, EntryAnimation, ExitAnimation, WordHighlightMode, TextAlign } from '../types';

export interface CaptionTemplate {
  id: string;
  name: string;
  createdAt: number;
  // Style config
  captionStyle: CaptionStyle;
  fontFamily: string;
  fontWeight: string | number;
  fontScale: number;
  textColor: string;
  textAlign: TextAlign;
  uppercase: boolean;
  // Stroke
  strokeWidth: number;
  strokeColor: string;
  // Background
  bgEnabled: boolean;
  bgColor: string;
  bgPadding: number;
  bgRadius: number;
  // Position
  verticalPos: number;
  horizontalPos: number;
  // Animation
  entryAnimation: EntryAnimation;
  exitAnimation: ExitAnimation;
  wordHighlight: WordHighlightMode;
  animationSpeed: 'FAST' | 'MEDIUM' | 'SLOW';
}

const STORAGE_KEY = 'createrin_caption_templates';

export const TemplateManager = {
  /**
   * Save a new template to localStorage.
   */
  saveTemplate(name: string, config: Omit<CaptionTemplate, 'id' | 'name' | 'createdAt'>): CaptionTemplate {
    const templates = this.loadTemplates();
    const template: CaptionTemplate = {
      ...config,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: Date.now(),
    };
    templates.push(template);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return template;
  },

  /**
   * Load all saved templates from localStorage.
   */
  loadTemplates(): CaptionTemplate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as CaptionTemplate[];
    } catch {
      return [];
    }
  },

  /**
   * Delete a template by ID.
   */
  deleteTemplate(id: string): void {
    const templates = this.loadTemplates().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  },

  /**
   * Get a single template by ID.
   */
  getTemplate(id: string): CaptionTemplate | undefined {
    return this.loadTemplates().find(t => t.id === id);
  },

  /**
   * Rename a template.
   */
  renameTemplate(id: string, newName: string): void {
    const templates = this.loadTemplates().map(t =>
      t.id === id ? { ...t, name: newName } : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  },
};

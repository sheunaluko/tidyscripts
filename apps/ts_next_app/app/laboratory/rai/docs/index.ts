import * as getting_started from './getting_started';
import * as storage from './storage';
import * as templates from './templates';

export interface DocSection {
  id: string;
  title: string;
  order: number;
  content: string;
}

const modules = [getting_started, storage, templates];

export const sections: DocSection[] = modules
  .map(m => ({ id: m.id, title: m.title, order: m.order, content: m.content }))
  .sort((a, b) => a.order - b.order);

export const getSectionById = (id: string): DocSection | undefined =>
  sections.find(s => s.id === id);

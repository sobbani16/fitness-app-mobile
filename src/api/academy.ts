import { api } from './client';

// Knowledge Academy — member-facing read API. Only published content is
// reachable; editorial surfaces live in the Super Admin web workspace.

export interface AcademySource { key: string; title: string; journal?: string; year?: number; doi?: string; pmid?: string; url?: string; studyType?: string; status: string; }
export interface AcademyArticle {
  id: string; slug: string; category: string; publishedAt: string;
  revision: { title: string; claim: string; verdict: string; shortVerdict: string; explanation: string; takeaway?: string; appliesTo?: string; exceptions?: string; uncertainty?: string; certainty: string };
  sources: AcademySource[];
}
export interface AcademyListItem { id: string; slug: string; title: string; claim: string; verdict: string; shortVerdict: string; category: string; publishedAt: string; }
export interface FaqHit { id: string; canonicalQuestion: string; shortAnswer: string; }

export const getFeatured = () => api.get<{ featured: AcademyArticle | null }>('/academy/featured').then(r => r.data.featured);
export const listArticles = (category?: string) =>
  api.get<{ articles: AcademyListItem[] }>('/academy/articles', { params: { category } }).then(r => r.data.articles);
export const getArticle = (slug: string) => api.get<{ article: AcademyArticle }>(`/academy/articles/${slug}`).then(r => r.data.article);
export const searchFaq = (q: string) =>
  api.get<{ faqs: FaqHit[]; articles: { slug: string; title: string }[] }>('/academy/faq/search', { params: { q } }).then(r => r.data);
export const suggestQuestion = (question: string) =>
  api.post('/academy/suggestions', { question }).then(r => r.data);

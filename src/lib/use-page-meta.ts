import { useEffect } from 'react';

interface PageMeta {
  readonly title: string;
  readonly description: string;
  readonly noIndex?: boolean;
}

const setMeta = (name: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.append(element);
  }
  element.content = content;
};

export function usePageMeta({ title, description, noIndex = false }: PageMeta) {
  useEffect(() => {
    document.title = `${title} | CareConnect — Voice-First Care Management`;
    setMeta('description', description);
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
  }, [description, noIndex, title]);
}

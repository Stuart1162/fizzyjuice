import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description?: string;
  schema?: object;
}

const SCHEMA_SCRIPT_ID = 'seo-ld-json';
const DEFAULT_TITLE = 'Fizzy Juice - jobs board for kind people who care about food and each other';
const DEFAULT_DESC = 'A chef and hospitality job platform. We connect talented hospitality workers with companies who have a good reputation for treating their people right.';

const SeoHead: React.FC<SeoHeadProps> = ({ title, description, schema }) => {
  useEffect(() => {
    document.title = title;

    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (metaDesc && description) {
      metaDesc.setAttribute('content', description);
    }

    let schemaScript = document.getElementById(SCHEMA_SCRIPT_ID);
    if (schema) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = SCHEMA_SCRIPT_ID;
        (schemaScript as HTMLScriptElement).type = 'application/ld+json';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      const m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (m) m.setAttribute('content', DEFAULT_DESC);
      document.getElementById(SCHEMA_SCRIPT_ID)?.remove();
    };
  }, [title, description, schema]);

  return null;
};

export default SeoHead;

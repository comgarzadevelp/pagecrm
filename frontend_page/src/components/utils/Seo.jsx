import { useEffect } from 'react';
import PropTypes from 'prop-types';

const SITE_URL = 'https://comgarza.com';

const upsertMeta = (selector, attrs) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
};

const Seo = ({ title, description, path, noindex }) => {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });
    upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: url });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
  }, [title, description, path, noindex]);

  return null;
};

Seo.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  noindex: PropTypes.bool,
};

export default Seo;

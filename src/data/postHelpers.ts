import type { WPPost } from './getPostsQuery';

const NAMED_ENTITIES: Record<string, string> = {
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&laquo;': '\u00ab',
    '&raquo;': '\u00bb',
    '&ndash;': '\u2013',
    '&mdash;': '\u2014',
    '&hellip;': '\u2026',
    '&oacute;': '\u00f3',
    '&aacute;': '\u00e1',
    '&eacute;': '\u00e9',
};

/** Strip HTML tags and decode entities from a WordPress rendered field. */
export const cleanText = (html?: string): string => {
    if (!html) return '';

    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&[a-z]+;|&\d+;/gi, (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/** URL of the post's featured image, or null when the post has none. */
export const getFeaturedImage = (post: WPPost): string | null =>
    post._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large?.source_url
    || post._embedded?.['wp:featuredmedia']?.[0]?.source_url
    || null;

/** Intrinsic size of the post's featured image, used for width/height attributes. */
export const getFeaturedImageSize = (
    post: WPPost,
    fallbackWidth = 1200,
    fallbackHeight = 675
): { width: number; height: number } => {
    const media = post._embedded?.['wp:featuredmedia']?.[0];
    const size = media?.media_details?.sizes?.large
        ?? media?.media_details?.sizes?.medium_large;

    return {
        width: size?.width ?? media?.media_details?.width ?? fallbackWidth,
        height: size?.height ?? media?.media_details?.height ?? fallbackHeight,
    };
};

/** Name of the post's first category, or a generic fallback. */
export const getCategoryName = (post: WPPost): string => {
    const categories = post._embedded?.['wp:term']?.[0];
    return categories?.[0]?.name || 'Artyku\u0142';
};

/** Plain-text summary, falling back to the content when the excerpt is empty. */
export const getPostSummary = (post: WPPost, maxLength = 180): string => {
    const text = cleanText(post.excerpt?.rendered) || cleanText(post.content?.rendered);
    if (text.length <= maxLength) return text;

    return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}\u2026`;
};

/** Estimated reading time in minutes, derived from the post content. */
export const getReadTime = (post: WPPost): string => {
    const words = cleanText(post.content?.rendered).split(' ').filter(Boolean).length;
    return String(Math.max(1, Math.round(words / 200)));
};

/** Date formatted for the Polish locale. */
export const formatPostDate = (date?: string): string => {
    if (!date) return '';

    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pl-PL');
};
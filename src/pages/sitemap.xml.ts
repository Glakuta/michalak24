import type { APIRoute } from 'astro';
import { BLOG_CATEGORY_ID } from '../data/getPostsQuery';
import { KNOWLEDGE_BASE_CATEGORY_ID } from '../data/getKnowledgeBaseQuery';

// Renderowany na żądanie (SSR), aby nowe wpisy z WordPressa trafiały do mapy
// automatycznie, bez konieczności ponownego budowania strony.
export const prerender = false;

// --- Typy ---

type ChangeFreq =
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';

interface SitemapEntry {
    url: string;
    lastmod?: string;
    changefreq?: ChangeFreq;
    priority?: string;
}

interface WpItem {
    slug: string;
    modified?: string;
    acf?: Record<string, unknown>;
}

// Jeden "feed" = jeden prefiks URL w sitemapce.
// REST nie ma endpointu `/baza-wiedzy` ani `/uslugi` — wpisy bazy wiedzy
// żyją w `posts` (kategoria 12), a usługi w `pages`.
interface WpFeed {
    base: 'posts' | 'pages';
    params: Record<string, string>;
    urlPrefix: string;
    changefreq: ChangeFreq;
    priority: string;
    include?: (item: WpItem) => boolean;
}

// --- Konfiguracja feedów WP ---

const WP_FEEDS: readonly WpFeed[] = [
    {
        base: 'posts',
        params: { categories: String(BLOG_CATEGORY_ID) },
        urlPrefix: '/wpisy',
        changefreq: 'monthly',
        priority: '0.7',
    },
    {
        base: 'posts',
        params: { categories: String(KNOWLEDGE_BASE_CATEGORY_ID) },
        urlPrefix: '/baza-wiedzy',
        changefreq: 'monthly',
        priority: '0.7',
    },
    {
        base: 'pages',
        params: {},
        urlPrefix: '/uslugi',
        changefreq: 'monthly',
        priority: '0.8',
        // Do /uslugi trafiają tylko strony z danymi usługi (ACF),
        // dzięki czemu strona placeholder WP nie ląduje w sitemapce.
        include: (item) => Boolean(item.acf && Object.keys(item.acf).length > 0),
    },
] as const;

// --- Statyczne trasy (trailingSlash: 'never' → bez końcowego "/") ---

const STATIC_PAGES: readonly SitemapEntry[] = [
    { url: '/',         changefreq: 'weekly',  priority: '1.0' },
    { url: '/uslugi',   changefreq: 'weekly',  priority: '0.9' },
    { url: '/o-nas',    changefreq: 'monthly', priority: '0.7' },
    { url: '/wpisy',    changefreq: 'weekly',  priority: '0.8' },
    { url: '/baza-wiedzy', changefreq: 'weekly', priority: '0.8' },
] as const;

// --- Helpery ---

function toAbsoluteUrl(site: URL, path: string): string {
    return new URL(path, site).href;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function renderUrl(entry: SitemapEntry): string {
    const parts: string[] = [`    <loc>${escapeXml(entry.url)}</loc>`];
    if (entry.lastmod)    parts.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    if (entry.priority)   parts.push(`    <priority>${entry.priority}</priority>`);
    return `  <url>\n${parts.join('\n')}\n  </url>`;
}

/**
 * Pobiera WSZYSTKIE elementy danego feedu WP, obsługując paginację.
 * WP REST API domyślnie zwraca max 100 rekordów na stronę.
 */
async function fetchAllWpItems(feed: WpFeed): Promise<WpItem[]> {
    const backendUrl = import.meta.env.BACKEND_URL;
    if (!backendUrl) {
        console.error('[sitemap] Brak BACKEND_URL w zmiennych środowiskowych');
        return [];
    }

    const base = `${backendUrl.replace(/\/$/, '')}/wp/v2/${feed.base}`;
    const all: WpItem[] = [];
    const perPage = 100;
    let page = 1;

    while (true) {
        const url = new URL(base);
        url.searchParams.set('per_page', String(perPage));
        url.searchParams.set('page', String(page));
        url.searchParams.set('status', 'publish');
        url.searchParams.set('_fields', 'slug,date,modified,acf');
        for (const [key, value] of Object.entries(feed.params)) {
            url.searchParams.set(key, value);
        }

        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'Michalak24-Sitemap/1.0 (+https://michalak24.pl)',
                'Accept': 'application/json',
            },
        });

        if (res.status === 400 || res.status === 404) {
            // 400: page > total pages; 404: endpoint nie istnieje
            break;
        }

        if (!res.ok) {
            console.warn(`[sitemap] ${feed.base}: HTTP ${res.status} dla ${url}`);
            break;
        }

        const batch = (await res.json()) as WpItem[];
        if (!Array.isArray(batch) || batch.length === 0) break;

        const included = feed.include ? batch.filter(feed.include) : batch;
        all.push(...included);

        if (batch.length < perPage) break;
        page += 1;
    }

    return all;
}

// --- Endpoint ---

export const GET: APIRoute = async ({ site }) => {
    if (!site) {
        return new Response('Brak skonfigurowanego `site` w astro.config.mjs', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }

    const staticEntries: SitemapEntry[] = STATIC_PAGES.map((page) => ({
        ...page,
        url: toAbsoluteUrl(site, page.url),
    }));

    const dynamicEntries: SitemapEntry[] = [];

    for (const feed of WP_FEEDS) {
        try {
            const items = await fetchAllWpItems(feed);

            for (const item of items) {
                if (!item.slug) continue;
                dynamicEntries.push({
                    url: toAbsoluteUrl(site, `${feed.urlPrefix}/${item.slug}`),
                    lastmod: item.modified
                        ? new Date(item.modified).toISOString()
                        : undefined,
                    changefreq: feed.changefreq,
                    priority: feed.priority,
                });
            }
        } catch (err) {
            console.error(`[sitemap] Błąd przy pobieraniu ${feed.base}:`, err);
            // Kontynuujemy — lepiej zwrócić częściową mapę niż 500
        }
    }

    const allEntries = [...staticEntries, ...dynamicEntries];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.map(renderUrl).join('\n')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            // Krótki cache w przeglądarce + cache na krawędzi Vercel,
            // dzięki czemu nowe wpisy pojawiają się w mapie maksymalnie po ~1h.
            'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
};

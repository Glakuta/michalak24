import type { APIRoute } from 'astro';

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

interface WpPost {
    slug: string;
    date: string;        // ISO z WP
    modified: string;    // ISO z WP
    status: string;
}

interface WpEndpoint {
    restBase: string;
    urlPrefix: string;
    changefreq: ChangeFreq;
    priority: string;
}

// --- Konfiguracja endpointów WP ---

const WP_API_BASE = import.meta.env.WP_API_URL ?? 'https://twoj-cms.pl/wp-json/wp/v2';

const WP_ENDPOINTS: readonly WpEndpoint[] = [
    { restBase: 'posts',        urlPrefix: '/wpisy',        changefreq: 'monthly', priority: '0.7' },
    { restBase: 'baza-wiedzy',  urlPrefix: '/baza-wiedzy',  changefreq: 'monthly', priority: '0.7' },
    { restBase: 'uslugi',       urlPrefix: '/uslugi',       changefreq: 'monthly', priority: '0.8' },
] as const;

// --- Statyczne trasy ---

const STATIC_PAGES: readonly SitemapEntry[] = [
    { url: '/',        changefreq: 'weekly',  priority: '1.0' },
    { url: '/uslugi/', changefreq: 'weekly',  priority: '0.9' },
    { url: '/o-nas/',  changefreq: 'monthly', priority: '0.7' },
    { url: '/wpisy/',        changefreq: 'weekly', priority: '0.8' },
    { url: '/baza-wiedzy/',  changefreq: 'weekly', priority: '0.8' },
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
 * Pobiera WSZYSTKIE wpisy z danego endpointu WP, obsługując paginację.
 * WP REST API domyślnie zwraca max 100 wpisów na stronę.
 */
async function fetchAllWpPosts(restBase: string): Promise<WpPost[]> {
    const base = `${import.meta.env.BACKEND_URL}/wp/v2/posts`;
    if (!base) {
        console.error('[sitemap] Brak BACKEND_URL w zmiennych środowiskowych');
        return [];
    }

    const cleanBase = base.replace(/\/$/, '');
    const all: WpPost[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const url = new URL(`${cleanBase}/${restBase}`);
        console.log(url.toString());
        url.searchParams.set('per_page', String(perPage));
        url.searchParams.set('page', String(page));
        url.searchParams.set('status', 'publish');
        url.searchParams.set('_fields', 'slug,date,modified,status');

        console.log(`[sitemap] Fetch: ${url.toString()}`);

        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'Michalak24-Sitemap/1.0 (+https://michalak24.pl)',
                'Accept': 'application/json',
            },
        });

        if (res.status === 400) {
            // WP zwraca 400, gdy page > total pages
            console.log(`[sitemap] ${restBase}: koniec paginacji na page=${page}`);
            break;
        }

        if (!res.ok) {
            console.warn(`[sitemap] ${restBase}: HTTP ${res.status} dla ${url}`);
            break;
        }

        const batch = (await res.json()) as WpPost[];
        if (!Array.isArray(batch) || batch.length === 0) break;

        all.push(...batch);
        console.log(`[sitemap] ${restBase}: page=${page}, +${batch.length} (razem ${all.length})`);

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

    for (const cfg of WP_ENDPOINTS) {
        try {
            const posts = await fetchAllWpPosts(cfg.restBase);

            for (const post of posts) {
                dynamicEntries.push({
                    url: toAbsoluteUrl(site, `${cfg.urlPrefix}/${post.slug}/`),
                    lastmod: post.modified ? new Date(post.modified).toISOString() : undefined,
                    changefreq: cfg.changefreq,
                    priority: cfg.priority,
                });
            }
        } catch (err) {
            console.error(`[sitemap] Błąd przy pobieraniu ${cfg.restBase}:`, err);
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
            'Cache-Control': 'public, max-age=3600',
        },
    });
};
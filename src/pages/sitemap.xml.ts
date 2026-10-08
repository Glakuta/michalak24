import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

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

type CollectionName = 'wpisy' | 'baza-wiedzy' | 'uslugi';

interface CollectionConfig {
    name: CollectionName;
    urlPrefix: string;
    changefreq: ChangeFreq;
    priority: string;
}

const COLLECTIONS: readonly CollectionConfig[] = [
    { name: 'wpisy',        urlPrefix: '/wpisy',        changefreq: 'monthly', priority: '0.7' },
    { name: 'baza-wiedzy',  urlPrefix: '/baza-wiedzy',  changefreq: 'monthly', priority: '0.7' },
    { name: 'uslugi',       urlPrefix: '/uslugi',       changefreq: 'monthly', priority: '0.8' },
] as const;


const STATIC_PAGES: readonly SitemapEntry[] = [
    { url: '/',        changefreq: 'weekly',  priority: '1.0' },
    { url: '/uslugi/', changefreq: 'weekly',  priority: '0.9' },
    { url: '/o-nas/',  changefreq: 'monthly', priority: '0.7' },
] as const;

function getLastmod(data: Record<string, unknown>): string | undefined {
    const candidate = data.updatedAt ?? data.pubDate ?? data.date;
    if (candidate instanceof Date) return candidate.toISOString();
    if (typeof candidate === 'string') {
        const parsed = new Date(candidate);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }
    return undefined;
}


function toAbsoluteUrl(site: URL, path: string): string {
    return new URL(path, site).href;
}


function renderUrl(entry: SitemapEntry): string {
    const parts: string[] = [`    <loc>${escapeXml(entry.url)}</loc>`];
    if (entry.lastmod)    parts.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    if (entry.priority)   parts.push(`    <priority>${entry.priority}</priority>`);
    return `  <url>\n${parts.join('\n')}\n  </url>`;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}



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

    for (const cfg of COLLECTIONS) {
        const items: CollectionEntry<CollectionName>[] = await getCollection(cfg.name);

        for (const item of items) {
            if ('draft' in item.data && item.data.draft === true) continue;

            const path = `${cfg.urlPrefix}/${item.slug}/`;

            dynamicEntries.push({
                url: toAbsoluteUrl(site, path),
                lastmod: getLastmod(item.data as Record<string, unknown>),
                changefreq: cfg.changefreq,
                priority: cfg.priority,
            });
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
            'Cache-Control': 'public, max-age=3600', // 1h cache — świeżość vs obciążenie
        },
    });
};
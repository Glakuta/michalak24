import {getEnv} from "astro/env/runtime";

export interface WPPost {
    id: number;
    slug: string;
    date: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    categories: number[];
    _embedded?: {
        'wp:featuredmedia'?: Array<{
            source_url: string;
            media_details?: {
                width?: number;
                height?: number;
                sizes?: {
                    large?: { source_url: string; width?: number; height?: number };
                    medium_large?: { source_url: string; width?: number; height?: number };
                    full?: { source_url: string; width?: number; height?: number };
                };
            };
        }>;
        'wp:term'?: Array<Array<{
            id: number;
            name: string;
            taxonomy: string;
        }>>;
    };
}

export const getPostsQuery = async (): Promise<WPPost[]> => {
    try {
        const response = await fetch(
            `${import.meta.env.BACKEND_URL}/wp/v2/posts?_embed&per_page=20`
        );
        if (!response.ok) {
            console.error('WP API error:', response.status);
            return [];
        }
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};
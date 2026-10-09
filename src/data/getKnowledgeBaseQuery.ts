import { getEnv } from "astro/env/runtime";

export const getKnowledgeBaseQuery = async (): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.BACKEND_URL}/wp/v2/posts?categories=pierwsza-pomoc&per_page=20`);
        return await response.json();
    } catch (e) {
        console.error(e);
    }
};

export const getKnowledgeBasePostQuery = async (slug: string): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.BACKEND_URL}/wp/v2/posts?slug=${slug}&categories=pierwsza-pomoc`);
        return await response.json();
    } catch (e) {
        console.error(e);
    }
};
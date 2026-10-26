export const KNOWLEDGE_BASE_CATEGORY_ID = 12;

export const getKnowledgeBaseQuery = async (): Promise<any[]> => {
    try {
        const response = await fetch(
            `${import.meta.env.BACKEND_URL}/wp/v2/posts?_embed&per_page=20&categories=${KNOWLEDGE_BASE_CATEGORY_ID}`
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

export const getKnowledgeBasePostQuery = async (slug: string): Promise<any[]> => {
    try {
        const response = await fetch(
            `${import.meta.env.BACKEND_URL}/wp/v2/posts?_embed&slug=${slug}&categories=${KNOWLEDGE_BASE_CATEGORY_ID}`
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

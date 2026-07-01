export const getSinglePostQuery = async (slug: string): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.BACKEND_URL}/wp/v2/posts?slug=${slug}`);
        return await response.json();
    }catch (e) {
        console.error(e);
    }
}
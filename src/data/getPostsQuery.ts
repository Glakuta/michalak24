export const getPostsQuery = async (slug: string): Promise<any> => {
    try {
        const response = await fetch(`https://michalak24.pl/wp-json/wp/v2/posts?slug=${slug}`);
        return await response.json();

    }catch (e) {
        console.error(e);
    }
}
export const getSlugQuery = async (slug: string): Promise<any> => {
    try {
        const response = await fetch(`http://michalak24.pl/wp-json/wp/v2/pages?slug=${slug}`);
        return await response.json();

    }catch (e) {
        console.error(e);
    }
}
import {getEnv} from "astro/env/runtime";

export const getPostsQuery = async (): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.BACKEND_URL}/wp/v2/posts`);
        return await response.json();
    }catch (e) {
        console.error(e);
    }
}
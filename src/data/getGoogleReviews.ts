export const getGoogleReviews = async (): Promise<void> => {
    const response = await fetch((`${import.meta.env.GOOGLE_MAPS_PLACE_ID}`));
}
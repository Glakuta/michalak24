const googlePlaceId = import.meta.env.GOOGLE_MAPS_PLACE_ID
const googleMapsApiKey = import.meta.env.GOOGLE_API_KEY

const url = `https://places.googleapis.com/v1/places/${googlePlaceId}?languageCode=pl&key=${googleMapsApiKey}`;

export const getGoogleReviews = async (): Promise<any> => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Goog-FieldMask': 'id,displayName,reviews'
            }
        });

        const data = await response.json();
        return data.reviews;

    } catch (error) {
        console.error("Błąd pobierania opinii:", error);
    }
}
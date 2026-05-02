import { config } from "../config/env.js"

export const geocodeAddress = async (address) => {
  if (config.mapboxToken) {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`)
    url.searchParams.set("access_token", config.mapboxToken)
    url.searchParams.set("limit", "1")
    const response = await fetch(url)
    const data = await response.json()
    const [longitude, latitude] = data.features?.[0]?.center ?? []
    return latitude && longitude ? { latitude, longitude } : null
  }

  if (config.geoapifyKey) {
    const url = new URL("https://api.geoapify.com/v1/geocode/search")
    url.searchParams.set("text", address)
    url.searchParams.set("apiKey", config.geoapifyKey)
    url.searchParams.set("limit", "1")
    const response = await fetch(url)
    const data = await response.json()
    const feature = data.features?.[0]?.properties
    return feature ? { latitude: feature.lat, longitude: feature.lon } : null
  }

  return null
}

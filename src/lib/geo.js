export const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371, rad = (x) => (x * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
// distancia aproximada por ruta (factor 1.3 sobre línea recta)
export const kmRuta = (lat1, lon1, lat2, lon2) => Math.round(haversine(lat1, lon1, lat2, lon2) * 1.3)

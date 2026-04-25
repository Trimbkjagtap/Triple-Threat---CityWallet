// Centralized cache key builders. Never construct cache keys inline.

export const k = {
  weather: (cityKey: string) => `wx:v1:${cityKey}`,
  events: (cityKey: string) => `ev:v1:${cityKey}`,
  geocode: (addressHash: string) => `geo:v1:${addressHash}`,
  staticMap: (centerHash: string, zoom: number) => `map:v1:${centerHash}:${zoom}`,
  payone: (merchantId: string, epochHour: number) => `pay:v1:${merchantId}:hour:${epochHour}`,
  pulse: (merchantId: string) => `pulse:v1:${merchantId}`,
  offer: (offerId: string) => `offer:v1:${offerId}`,
  token: (token: string) => `tok:v1:${token}`,
  tokenRedeemed: (token: string) => `tok:redeemed:v1:${token}`,
  rules: (merchantId: string) => `rules:v1:${merchantId}`,
  stats: (merchantId: string, kind: string) => `stats:v1:${merchantId}:${kind}`,
  feed: (merchantId: string) => `feed:v1:${merchantId}`,
  pubsub: {
    pulseFired: (merchantId: string) => `pulse:fired:${merchantId}`,
    demandCross: (merchantId: string) => `demand:cross:${merchantId}`,
    weatherRefreshed: (cityKey: string) => `wx:refreshed:${cityKey}`,
    merchantEvents: (merchantId: string) => `merchant:${merchantId}:events`,
  },
};

import {
  buildPublicBoatsSearchPath,
  createPublicBoatListClient,
  loadPublicBoatsFromUrl,
} from "@jumpinboat/shared";

const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL;

  if (configuredBaseUrl && configuredBaseUrl.length > 0) {
    return configuredBaseUrl;
  }

  return "http://localhost:3000";
};

const getPublicBoatsUrl = (filters: Parameters<typeof buildPublicBoatsSearchPath>[0]) =>
  new URL(buildPublicBoatsSearchPath(filters), getApiBaseUrl()).toString();

const loadPublicBoats = loadPublicBoatsFromUrl(getPublicBoatsUrl, {
  cache: "no-store",
});

export const {
  publicBoatListAtoms,
  usePublicBoatFilters,
  usePublicBoatList,
} = createPublicBoatListClient(loadPublicBoats);

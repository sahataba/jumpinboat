import {
  buildPublicBoatsSearchPath,
  createPublicBoatListClient,
  loadPublicBoatsFromUrl,
} from "@jumpinboat/shared";

const loadPublicBoats = loadPublicBoatsFromUrl(buildPublicBoatsSearchPath, {
  cache: "no-store",
});

export const {
  publicBoatListAtoms,
  usePublicBoatFilters,
  usePublicBoatList,
} = createPublicBoatListClient(loadPublicBoats);

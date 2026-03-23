import {
  buildPublicBoatsSearchPath,
  createPublicBoatListClient,
  loadPublicBoatsFromUrl,
  type PublicBoatListFilters,
} from "@jumpinboat/shared";

import { getApiBaseUrl } from "./api-base";

const loadPublicBoats = loadPublicBoatsFromUrl(
  (filters: PublicBoatListFilters) =>
    `${getApiBaseUrl()}${buildPublicBoatsSearchPath(filters)}`,
);

export const {
  publicBoatListAtoms,
  usePublicBoatFilters,
  usePublicBoatList,
} = createPublicBoatListClient(loadPublicBoats);

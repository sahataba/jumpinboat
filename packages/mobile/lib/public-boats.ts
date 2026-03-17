import { Platform } from "react-native";
import {
  buildPublicBoatsSearchPath,
  createPublicBoatListClient,
  loadPublicBoatsFromUrl,
  type PublicBoatListFilters,
} from "@jumpinboat/shared";

const getApiBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
};

const loadPublicBoats = loadPublicBoatsFromUrl(
  (filters: PublicBoatListFilters) =>
    `${getApiBaseUrl()}${buildPublicBoatsSearchPath(filters)}`,
);

export const {
  publicBoatListAtoms,
  usePublicBoatFilters,
  usePublicBoatList,
} = createPublicBoatListClient(loadPublicBoats);

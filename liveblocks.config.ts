import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { Layer, Color } from "@/types/canvas";
export {
  RoomProvider,
  useMutation,
  useSelf,
  useStorage,
  useHistory,
  useCanUndo,
  useCanRedo,
  useOthers,
  useOther,
  useOthersMapped,
  useOthersConnectionIds,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      selection: string[];
      pencilDraft: [x: number, y: number, pressure: number][] | null;
      penColor: Color | null;
    };

    Storage: {
      layers: LiveMap<string, LiveObject<Layer>>;
      layerIds: LiveList<string>;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        picture: string;
      };
    };

    RoomEvent: {};
    ThreadMetadata: {};
    RoomInfo: {};
  }
}

export {};
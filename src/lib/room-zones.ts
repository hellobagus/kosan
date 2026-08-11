/** Zona/warna unit (menggantikan label "Lantai" di UI kamar). */

export type RoomZoneKey = "blue" | "green" | "purple" | "other";

export type RoomZone = {
  key: RoomZoneKey;
  label: string;
  /** Hex from price list */
  hex: string;
  /** Tailwind / inline helpers */
  chipActive: string;
  chipIdle: string;
  text: string;
  /** Soft background for unit card */
  cardBg: string;
  cardBorder: string;
  cardBgActive: string;
};

export const ROOM_ZONES: Record<Exclude<RoomZoneKey, "other">, RoomZone> = {
  blue: {
    key: "blue",
    label: "Blue",
    hex: "#00B0F1",
    chipActive: "text-white border-transparent",
    chipIdle: "bg-white text-slate-700 border-slate-200 hover:border-[#00B0F1]",
    text: "text-[#00B0F1]",
    cardBg: "bg-[#00B0F1]/15",
    cardBorder: "border-[#00B0F1]/40",
    cardBgActive: "bg-[#00B0F1]/25",
  },
  green: {
    key: "green",
    label: "Green",
    hex: "#91D14F",
    chipActive: "text-white border-transparent",
    chipIdle: "bg-white text-slate-700 border-slate-200 hover:border-[#91D14F]",
    text: "text-[#6BA82E]",
    cardBg: "bg-[#91D14F]/20",
    cardBorder: "border-[#91D14F]/50",
    cardBgActive: "bg-[#91D14F]/35",
  },
  purple: {
    key: "purple",
    label: "Purple",
    hex: "#CC99FF",
    chipActive: "text-white border-transparent",
    chipIdle: "bg-white text-slate-700 border-slate-200 hover:border-[#CC99FF]",
    text: "text-[#9B59D6]",
    cardBg: "bg-[#CC99FF]/25",
    cardBorder: "border-[#CC99FF]/60",
    cardBgActive: "bg-[#CC99FF]/40",
  },
};

/** Mapping level lantai seed Sixty Six → warna */
export const FLOOR_LEVEL_ZONE: Record<number, Exclude<RoomZoneKey, "other">> = {
  1: "blue",
  2: "green",
  3: "purple",
};

/** Nama lantai di DB untuk Sixty Six */
export const FLOOR_ZONE_NAMES: Record<number, string> = {
  1: "Blue",
  2: "Green",
  3: "Purple",
};

export function resolveRoomZone(input: {
  floorName?: string | null;
  floorLevel?: number | null;
  roomNumber?: string | null;
}): RoomZone {
  const name = (input.floorName || "").toLowerCase();
  if (
    name.includes("blue") ||
    name.includes("biru") ||
    name === "b"
  ) {
    return ROOM_ZONES.blue;
  }
  if (
    name.includes("green") ||
    name.includes("hijau") ||
    name === "g" ||
    name === "h"
  ) {
    return ROOM_ZONES.green;
  }
  if (
    name.includes("purple") ||
    name.includes("ungu") ||
    name.includes("violet") ||
    name === "p" ||
    name === "u"
  ) {
    return ROOM_ZONES.purple;
  }

  const num = (input.roomNumber || "").toUpperCase();
  if (num.startsWith("B-") || /^B\d/.test(num)) return ROOM_ZONES.blue;
  if (num.startsWith("H-") || /^H\d/.test(num)) return ROOM_ZONES.green;
  if (num.startsWith("U-") || /^U\d/.test(num)) return ROOM_ZONES.purple;

  const level = input.floorLevel ?? null;
  if (level != null && FLOOR_LEVEL_ZONE[level]) {
    return ROOM_ZONES[FLOOR_LEVEL_ZONE[level]];
  }

  return {
    key: "other",
    label: input.floorName || (level != null ? `Zone ${level}` : "Other"),
    hex: "#64748B",
    chipActive: "bg-slate-700 text-white border-slate-700",
    chipIdle: "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
    text: "text-slate-600",
    cardBg: "bg-slate-100",
    cardBorder: "border-slate-200",
    cardBgActive: "bg-slate-200",
  };
}

export function zoneLabelForRoom(input: {
  floorName?: string | null;
  floorLevel?: number | null;
  roomNumber?: string | null;
}): string {
  return resolveRoomZone(input).label;
}

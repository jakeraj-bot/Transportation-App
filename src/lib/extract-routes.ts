export type ParsedRouteLine = {
  routeNumber: string;
  destination: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
};

const REQUIRED_BITS = [
  "ROUTE NO",
  "DESTINATION",
  "THE STARTING DATE OF THIS ROUTE IS",
];

export function hasRequiredRouteWording(text: string) {
  const upper = text.toUpperCase();
  return REQUIRED_BITS.every((bit) => upper.includes(bit));
}

export function parseRoutePacket(text: string): ParsedRouteLine[] {
  if (!text.trim()) return [];
  const chunks = text.split(/ROUTE\s*NO\.?\s*/i).slice(1);
  const lines: ParsedRouteLine[] = [];

  for (const chunk of chunks) {
    const number = (chunk.match(/^[:\s]*([A-Z0-9-]+)/i)?.[1] || "").trim();
    const destination =
      chunk.match(/DESTINATION\(S\)?[:\s]*([^\n]+(?:\n(?!\s*Hours)[^\n]+)*)/i)?.[1]?.replace(/\s+/g, " ").trim() ||
      chunk.match(/DESTINATION[:\s]*([^\n]+)/i)?.[1]?.trim() ||
      "";
    const hours = chunk.match(/Hours[:\s]*([0-9: ]+[AP]M)\s*[-–]\s*([0-9: ]+[AP]M)/i);
    const dates =
      chunk.match(
        /STARTING DATE OF THIS ROUTE IS[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})\s*[-–]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i
      ) ||
      chunk.match(/([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})\s*[-–]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/);

    if (number) {
      lines.push({
        routeNumber: number,
        destination,
        startTime: hours?.[1]?.trim() || "",
        endTime: hours?.[2]?.trim() || "",
        startDate: dates?.[1] || "",
        endDate: dates?.[2] || "",
      });
    }
  }
  return lines;
}

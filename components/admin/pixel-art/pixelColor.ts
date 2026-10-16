export function rgbaKey(color?: string) {
  if (!color) return "0,0,0,0";
  const value = color.trim().toLowerCase();
  if (value === "transparent") return "0,0,0,0";
  const hex = value.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (hex) {
    const expanded = hex.length <= 4 ? [...hex].map(channel => channel + channel).join("") : hex;
    return `${parseInt(expanded.slice(0, 2), 16)},${parseInt(expanded.slice(2, 4), 16)},${parseInt(expanded.slice(4, 6), 16)},${expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) : 255}`;
  }
  const channels = value.match(/^rgba?\((.*)\)$/)?.[1].split(/[,\s/]+/).filter(Boolean);
  if (!channels || channels.length < 3) return `raw:${value}`;
  const byte = (channel: string) => Math.round(Math.max(0, Math.min(255, parseFloat(channel) * (channel.endsWith("%") ? 2.55 : 1))));
  const alpha = channels[3] ? parseFloat(channels[3]) * (channels[3].endsWith("%") ? 2.55 : 255) : 255;
  return `${byte(channels[0])},${byte(channels[1])},${byte(channels[2])},${Math.round(Math.max(0, Math.min(255, alpha)))}`;
}

export function sameRgbaColor(first?: string, second?: string) {
  return rgbaKey(first) === rgbaKey(second);
}

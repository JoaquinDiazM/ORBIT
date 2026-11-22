export const MAP_INVITATION_MAX_LENGTH = 80;

export function normalizeMapInvitation(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  const text = value.trim().normalize("NFC");
  return text.length <= MAP_INVITATION_MAX_LENGTH ? text : null;
}

export const ZONE_UNLOCK_AUDIO_KEY = "zone_unlocked";

export function locationCompletionCueOptions(completionResult) {
  return Array.isArray(completionResult?.newlyUnlockedAreaIds)
    && completionResult.newlyUnlockedAreaIds.length > 0
    ? Object.freeze({ specificAssetKey: ZONE_UNLOCK_AUDIO_KEY })
    : undefined;
}

export function playLocationCompletionCue(audio, completionResult) {
  return audio?.playInteractionCue?.(
    locationCompletionCueOptions(completionResult),
  );
}

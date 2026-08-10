// ============================================================
// TrackPush — Web (Utilisateur) build
// This version has no server at all — everything lives in this
// browser's local storage. isOfflinePrimaryDevice() always
// returns true so the rest of the app (which already knows how
// to run fully client-side via store.js/local-api.js) never
// tries to reach a server that doesn't exist.
// ============================================================

function isOfflinePrimaryDevice(){
  return true;
}

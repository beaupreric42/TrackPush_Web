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

// Cette version n'a jamais de serveur avec lequel choisir de se
// synchroniser — la carte "Mode hors-ligne (cet appareil)" (le
// bouton bascule + son explication sur "les autres appareils qui
// parlent au serveur") n'a aucun sens ici et ne doit JAMAIS
// s'afficher. À la place, la sauvegarde manuelle (export/import
// JSON) est le SEUL filet de sécurité pour les données de
// l'utilisateur — elle doit toujours être visible.
document.addEventListener('DOMContentLoaded', () => {
  const offlineSection = document.getElementById('offline-primary-section');
  if (offlineSection) offlineSection.hidden = true;
  const backupSection = document.getElementById('backup-section');
  if (backupSection) backupSection.hidden = false;
});

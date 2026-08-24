import type { MessageType } from '../types';

// Aperçu du dernier message façon WhatsApp — libellé texte selon le type
// (sans contenu réel pour les médias, pas d'emoji), sinon le texte tel quel
// pour un message classique. Partagé entre MessagesPage.tsx et
// MessagesPopover.tsx (et son équivalent mobile MessagesScreen.tsx).
export function formatLastMessagePreview(
  lastMessage: string | null | undefined,
  lastType: MessageType | undefined,
  lastEncrypted?: boolean,
): string {
  switch (lastType) {
    case 'voice':    return 'Message vocal';
    case 'image':    return 'Photo';
    case 'video':    return 'Vidéo';
    case 'file':     return 'Document';
    case 'sticker':  return 'Sticker';
    case 'location': return 'Position';
    case 'share':    return 'Publication partagée';
    default:
      if (lastEncrypted) return 'Message';
      return lastMessage || '…';
  }
}

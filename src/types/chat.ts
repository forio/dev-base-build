/**
 * Corrected ChatMessageReadOutView — epicenter-libs declares id/created
 * as strings, but the API actually returns numbers.
 */
export type ChatMessage = {
  senderKey: string;
  receiverKey: string | null;
  created: number;
  id: number;
  message: string;
};

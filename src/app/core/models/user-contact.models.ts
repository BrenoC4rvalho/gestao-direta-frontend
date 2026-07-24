export type PhoneVerificationStatus =
  | 'NOT_INFORMED'
  | 'PENDING'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'BLOCKED';

export type PreferredMessagingChannel = 'NONE' | 'TELEGRAM' | 'WHATSAPP';
export type UserContactStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type MessagingAccountStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type MessagingChannel = 'TELEGRAM' | 'WHATSAPP';

export interface MessagingAccount {
  id: number;
  channel: MessagingChannel;
  status: MessagingAccountStatus;
  username: string | null;
  displayName: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface UserContact {
  id: number;
  phoneNumber: string | null;
  phoneVerificationStatus: PhoneVerificationStatus;
  phoneVerifiedAt: string | null;
  preferredChannel: PreferredMessagingChannel;
  status: UserContactStatus;
  messagingAccounts: MessagingAccount[];
}

export interface UpdatePhoneRequest {
  phoneNumber: string;
}

export interface CreateMessagingLinkCodeRequest {
  channel: 'TELEGRAM';
}

export interface MessagingLinkCodeResponse {
  code: string;
  channel: 'TELEGRAM';
  expiresAt: string;
}

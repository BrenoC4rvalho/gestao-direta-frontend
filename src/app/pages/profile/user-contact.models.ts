export type PhoneVerificationStatus =
  | 'NOT_INFORMED'
  | 'PENDING'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'BLOCKED';

export interface UserContact {
  id: string;
  phoneNumber: string | null;
  phoneVerificationStatus: PhoneVerificationStatus;
  phoneVerifiedAt: string | null;
  preferredChannel: 'TELEGRAM' | 'WHATSAPP' | 'NONE';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

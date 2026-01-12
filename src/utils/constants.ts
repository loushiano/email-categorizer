import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const jwtConstants = {
  secret: process.env.SECRET_KEY || 'secret',
};

export enum UserStatus {
  VALID = 'valid',
  EXPIRED = 'expired',
}

export enum UnsubscribeStatus {
  NONE = 'none',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum EmailProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const EMAIL_LIMIT_PER_CREDENTIAL = 100;

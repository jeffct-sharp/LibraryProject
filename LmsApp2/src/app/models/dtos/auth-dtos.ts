/**
 * Authentication related DTOs
 */
import { MemberResponseDto } from './member-dtos';

export interface LoginMemberDto {
  email: string;
  password: string;
}

export interface RegisterMemberDto {
  name: string;           // Required, max 100 chars
  email: string;          // Required, valid email format
  password: string;       // Required, min 8 chars
  phone: string;          // Required, max 10 chars
  address?: string;       // Optional, max 255 chars
  role?: string;          // Optional, defaults to "User"
}

export interface TokenResponseDto {
  email: string;
  roles: string[];
  token: string;
  memberId?: number;
  expiration?: string;
  member?: MemberResponseDto;
}

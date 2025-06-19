/**
 * Member related DTOs
 */

export interface UpdateMemberDto {
  memberID: number;       // Required
  name?: string;          // Optional, max 100 chars
  phone?: string;         // Optional, max 20 chars
  address?: string;       // Optional, max 255 chars
}

export interface MemberResponseDto {
  memberID: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  membershipStatus: string;
}

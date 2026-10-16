// ============================================================
// OmniCast - Forgot Password DTOs
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address associated with the account',
  })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Reset token delivered via email',
  })
  @IsString()
  resetToken: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword: string;
}

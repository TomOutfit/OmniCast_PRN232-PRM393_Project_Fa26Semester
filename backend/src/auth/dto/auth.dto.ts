// ============================================================
// OmniCast - Auth DTOs
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User password' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token from login response',
  })
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email to send reset link' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email' })
  @IsString()
  resetToken: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword: string;
}

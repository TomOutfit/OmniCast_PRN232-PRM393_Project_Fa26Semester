import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class PayosStatusDto {
  @ApiProperty({ description: 'PayOS order code returned when checkout was created' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  orderCode: number;

  @ApiProperty({ description: 'Private, one-time status token returned with the checkout link' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  statusToken: string;
}

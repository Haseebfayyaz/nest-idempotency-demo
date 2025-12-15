import { IsInt, IsPositive } from 'class-validator';

export class ConfirmOrderDto {
  @IsInt()
  @IsPositive()
  totalCents!: number;
}



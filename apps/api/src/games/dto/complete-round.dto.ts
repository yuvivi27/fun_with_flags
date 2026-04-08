import { IsInt, Max, Min } from 'class-validator';

export class CompleteRoundDto {
  @IsInt()
  @Min(0)
  score!: number;

  @IsInt()
  @Min(0)
  correct!: number;

  @IsInt()
  @Min(1)
  @Max(200)
  total!: number;
}

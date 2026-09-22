import { IsIn } from "class-validator";
import { PaymentStatus } from "@bsc/shared";

export class SetPaymentStatusDto {
  @IsIn(Object.values(PaymentStatus))
  paymentStatus!: string;
}

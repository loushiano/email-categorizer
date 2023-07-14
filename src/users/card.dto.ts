import { AutoMap } from "@automapper/classes";
import { IsBoolean, IsNotEmpty, Matches } from "class-validator";

export class CreditCardDTO {
    @AutoMap()
    id: string;

    @AutoMap()
    @IsNotEmpty()
    digits: string;

    @AutoMap()
    @IsNotEmpty()
    csv: string;

    @AutoMap()
    @IsNotEmpty()
    @Matches(/^[0-9][0-9]\/[0-9][0-9]$/)
    expiry: string;

    brand: string;

    last4: string;
    
    active:boolean;

    email:string;



}
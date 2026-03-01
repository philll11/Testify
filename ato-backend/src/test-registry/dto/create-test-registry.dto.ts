import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTestRegistryDto {
    @IsString()
    @IsNotEmpty()
    readonly targetComponentId: string;

    @IsString()
    @IsNotEmpty()
    readonly testComponentId: string;
}

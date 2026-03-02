import { PartialType } from '@nestjs/swagger';
import { CreateTestRegistryDto } from './create-test-registry.dto';

export class UpdateTestRegistryDto extends PartialType(CreateTestRegistryDto) {}
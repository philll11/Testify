import { Controller, Get, Query } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { TestResultQueryDto } from './dto/test-result-query.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

@Controller('test-results')
export class TestResultsController {
    constructor(private readonly testResultsService: TestResultsService) { }

    @Get()
    @RequirePermission(PERMISSIONS.COLLECTION_VIEW) // Uses the same permission as viewing collections
    findAll(@Query() query: TestResultQueryDto) {
        return this.testResultsService.findEnrichedResults(query);
    }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Counter } from './entities/counter.entity';
import { UpdateCounterDto } from './dto/update-counter.dto';

@Injectable()
export class CountersService {
  constructor(
    @InjectRepository(Counter)
    private readonly counterRepository: Repository<Counter>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Retrieves all counter documents from the database.
   * @returns A promise that resolves to an array of all counters.
   */
  async findAll(): Promise<Counter[]> {
    return this.counterRepository.find();
  }

  /**
   * Updates the prefix for a specific counter.
   * @param counterId The internal ID of the counter to update (e.g., 'subsidiary').
   * @param updateCounterDto The DTO containing the new prefix.
   * @returns A promise that resolves to the updated counter document.
   */
  async update(
    counterId: string,
    updateCounterDto: UpdateCounterDto,
  ): Promise<Counter> {
    const counter = await this.counterRepository.findOneBy({ _id: counterId });
    if (!counter) {
      throw new NotFoundException(`Counter with ID "${counterId}" not found.`);
    }

    counter.prefix = updateCounterDto.prefix;

    return this.counterRepository.save(counter);
  }

  /**
   * Atomically finds a counter document, increments its sequence value, and returns the updated document.
   * If the counter does not exist, it creates it with the provided default prefix and a sequence of 1.
   * @param sequenceName The name of the sequence (e.g., 'subsidiary').
   * @param defaultPrefix The default prefix to use if the counter is created (e.g., 'SUB').
   * @returns A promise that resolves to the counter document with the new sequence value and prefix.
   */
  async getNextSequenceValue(
    sequenceName: string,
    defaultPrefix: string,
  ): Promise<Counter> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use pessimistic write lock to ensure atomic increment
      let counter = await queryRunner.manager.findOne(Counter, {
        where: { _id: sequenceName },
        lock: { mode: 'pessimistic_write' },
      });

      if (!counter) {
        // Handle creation
        counter = queryRunner.manager.create(Counter, {
          _id: sequenceName,
          prefix: defaultPrefix,
          sequence_value: 1,
        });
      } else {
        // Handle increment
        counter.sequence_value += 1;
      }

      const savedCounter = await queryRunner.manager.save(counter);
      await queryRunner.commitTransaction();
      return savedCounter;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

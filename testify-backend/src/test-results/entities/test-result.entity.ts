import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Collection } from '../../collections/entities/collection.entity';

export enum TestResultStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    PASSED = 'PASSED',
    FAILED = 'FAILED',
    ERROR = 'ERROR'
}

@Entity('test_results')
export class TestResult {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    collectionId: string;

    @ManyToOne(() => Collection, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collectionId' })
    collection: Collection;

    @Column({ type: 'varchar' })
    testId: string; // References the test registry

    @Column({ nullable: true })
    externalExecutionId: string; // The ID returned from Boomi/Platform

    @Column({
        type: 'enum',
        enum: TestResultStatus,
        default: TestResultStatus.PENDING,
    })
    status: TestResultStatus;

    @Column({ type: 'jsonb', nullable: true })
    rawResult: any;

    @Column({ nullable: true })
    errorMessage: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;
}

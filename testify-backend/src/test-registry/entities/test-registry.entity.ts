import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('test_registry')
@Index(['targetComponentId', 'testComponentId'], { unique: true })
export class TestRegistry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'target_component_id' })
    targetComponentId: string;

    @Column({ name: 'test_component_id' })
    testComponentId: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

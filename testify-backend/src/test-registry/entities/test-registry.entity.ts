import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('test_registry')
@Index(['profileId', 'targetComponentId', 'testComponentId'], { unique: true })
export class TestRegistry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'profile_id', nullable: false, type: 'uuid' })
    profileId: string;

    @Column({ name: 'target_component_id' })
    targetComponentId: string;

    @Column({ name: 'target_component_name', nullable: true })
    targetComponentName?: string;

    @Column({ name: 'target_component_path', nullable: true })
    targetComponentPath?: string;

    @Column({ name: 'target_component_type', nullable: true })
    targetComponentType?: string;

    @Column({ name: 'test_component_id' })
    testComponentId: string;

    @Column({ name: 'test_component_name', nullable: true })
    testComponentName?: string;

    @Column({ name: 'test_component_path', nullable: true })
    testComponentPath?: string;

    @Column({ name: 'test_component_type', nullable: true })
    testComponentType?: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

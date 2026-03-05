import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CollectionStatus, CollectionType } from '../enums/collection.enums';
import { CollectionItem } from './collection-item.entity';

@Entity('collections')
export class Collection {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: CollectionStatus,
        default: CollectionStatus.DRAFT,
    })
    status: CollectionStatus;

    @Column({
        type: 'enum',
        enum: CollectionType,
    })
    collectionType: CollectionType;

    @Column({ type: 'uuid', nullable: true })
    environmentId: string;

    @Column({ nullable: true })
    failureReason: string;

    @Column({ type: 'int', default: 0 })
    totalExpectedTests: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => CollectionItem, item => item.collection, { cascade: true })
    items: CollectionItem[];
}

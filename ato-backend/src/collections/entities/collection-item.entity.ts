import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Collection } from './collection.entity';
import { CollectionItemSourceType } from '../enums/collection.enums';

@Entity('collection_items')
export class CollectionItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    collectionId: string;

    @ManyToOne(() => Collection, collection => collection.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collectionId' })
    collection: Collection;

    @Column()
    componentId: string;

    @Column({
        type: 'enum',
        enum: CollectionItemSourceType,
        default: CollectionItemSourceType.ARG,
    })
    sourceType: CollectionItemSourceType;
}
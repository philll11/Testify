import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('discovered_components')
@Index(['profileId', 'componentId'], { unique: true })
export class DiscoveredComponent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    profileId: string;

    @Column()
    componentId: string;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column({ nullable: true })
    folderId: string;

    @Column({ type: 'text', nullable: true })
    folderPath: string;

    @Column({ type: 'boolean', default: false })
    @Index()
    isTest: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_integration_credentials')
export class UserIntegrationCredential {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    platformName: string; // e.g., 'Boomi', 'Salesforce'

    @Column({ length: 100 })
    profileName: string; // User-defined alias, e.g., 'Production Boomi'

    @Column({ type: 'text' })
    encryptedData: string; // JSON blob encrypted as Base64/Hex

    @Column({ length: 32 }) // IV is typically 12 bytes (GCM) or 16 bytes (CBC), stored as Hex/Base64
    iv: string;

    @Column({ length: 32 }) // Auth tag (GCM)
    authTag: string;

    @ManyToOne(() => User, (user) => user.credentials, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

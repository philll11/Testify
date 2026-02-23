import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { IntegrationPlatform } from '../../constants/integration-platform.enum';
import { PlatformProfile } from '../../platform-profile/entities/platform-profile.entity';

@Entity('platform_environments')
export class PlatformEnvironment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: IntegrationPlatform,
  })
  platformType: IntegrationPlatform;

  /**
   * Encrypted JSON containing username, accountId, token/password
   */
  @Column({ type: 'text' })
  @Exclude()
  encryptedData: string;

  @Column()
  @Exclude()
  iv: string;

  @Column({ nullable: true })
  @Exclude()
  authTag: string;

  @ManyToOne(() => PlatformProfile, (profile) => profile.environments)
  @JoinColumn({ name: 'profileId' })
  profile: PlatformProfile;

  @Column({ nullable: true })
  profileId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('Stream')
export class Stream {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  streamKey!: string;

  @Column()
  streamUrl!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.streams)
  user!: User;

  @Column({ default: false })
  isActive!: boolean;

  @Column({ nullable: true })
  title!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastActiveAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
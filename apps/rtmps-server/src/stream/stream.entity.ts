import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("streams")
export class Stream {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  streamKey!: string;

  @Column()
  streamUrl!: string;

  // Standardized to 'user_id' for consistency
  @Column({ name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.streams)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ default: false })
  isActive!: boolean;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;
  
  // ✨ NEW: Added a field to store the thumbnail URL.
  @Column({ name: 'thumbnail_url', nullable: true, type: 'text' })
  thumbnailUrl?: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastActiveAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

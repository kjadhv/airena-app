import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Stream } from './stream.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  displayName!: string;

  @Column({ nullable: true })
  photoURL!: string;

  @Column({ default: false })
  isCreator!: boolean;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ nullable: true })
  firebaseUid!: string;

  @OneToMany(() => Stream, (stream) => stream.user)
  streams!: Stream[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
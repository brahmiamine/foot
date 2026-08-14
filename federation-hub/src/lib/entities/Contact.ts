import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'contact_messages' })
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'varchar', length: 255 })
    email!: string

    @Column({ type: 'varchar', length: 500 })
    subject!: string

    @Column({ type: 'text' })
    message!: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    device_fingerprint?: string | null

    @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_at?: Date
}


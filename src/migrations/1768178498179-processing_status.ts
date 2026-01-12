import { MigrationInterface, QueryRunner } from "typeorm";

export class ProcessingStatus1768178498179 implements MigrationInterface {
    name = 'ProcessingStatus1768178498179'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` ADD \`processing_status\` enum ('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` ADD \`processed_at\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` ADD \`processing_attempts\` int NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`processing_attempts\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`processed_at\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`processing_status\``);
    }

}

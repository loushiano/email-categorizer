import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnsubscribeStatusAndEmailLimit1736700000000 implements MigrationInterface {
    name = 'AddUnsubscribeStatusAndEmailLimit1736700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add unsubscribe_status enum column to user_incoming_emails
        await queryRunner.query(`
            ALTER TABLE \`user_incoming_emails\`
            ADD \`unsubscribe_status\` enum('none', 'pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'none'
        `);

        // Add processing_status enum column to user_incoming_emails
        await queryRunner.query(`
            ALTER TABLE \`user_incoming_emails\`
            ADD \`processing_status\` enum('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending'
        `);

        // Add processed_at timestamp column
        await queryRunner.query(`
            ALTER TABLE \`user_incoming_emails\`
            ADD \`processed_at\` bigint NULL
        `);

        // Add processing_attempts column
        await queryRunner.query(`
            ALTER TABLE \`user_incoming_emails\`
            ADD \`processing_attempts\` int NOT NULL DEFAULT 0
        `);

        // Update existing processed emails to have completed status
        await queryRunner.query(`
            UPDATE \`user_incoming_emails\`
            SET \`processing_status\` = 'completed', \`processing_attempts\` = 1
            WHERE \`is_processed\` = 1
        `);

        // Add email_count and is_limit_reached columns to users table (per user limit)
        await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD \`email_count\` int NOT NULL DEFAULT 0
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD \`is_limit_reached\` tinyint NOT NULL DEFAULT 0
        `);

        // Update existing email counts for each user (sum across all credentials)
        await queryRunner.query(`
            UPDATE \`users\` u
            SET u.email_count = (
                SELECT COUNT(*)
                FROM \`user_incoming_emails\` uie
                INNER JOIN \`user_credentials\` uc ON uie.credential_id = uc.id
                WHERE uc.user_id = u.id
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_limit_reached\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email_count\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`processing_attempts\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`processed_at\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`processing_status\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`unsubscribe_status\``);
    }
}

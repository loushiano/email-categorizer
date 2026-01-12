import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnsubscribeRetryFields1736700100000 implements MigrationInterface {
    name = 'AddUnsubscribeRetryFields1736700100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add unsubscribe_attempted_at timestamp column
        await queryRunner.query(`
            ALTER TABLE \`user_incoming_emails\`
            ADD \`unsubscribe_attempted_at\` bigint NULL
        `);

        // Add unsubscribe_attempts column
        await queryRunner.query(`
            ALTER TABLE \`user_incoming_emails\`
            ADD \`unsubscribe_attempts\` int NOT NULL DEFAULT 0
        `);

        // Update existing unsubscribed emails to have 1 attempt
        await queryRunner.query(`
            UPDATE \`user_incoming_emails\`
            SET \`unsubscribe_attempts\` = 1
            WHERE \`unsubscribed\` = 1
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`unsubscribe_attempts\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP COLUMN \`unsubscribe_attempted_at\``);
    }
}

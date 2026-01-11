import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigrate1768163689520 implements MigrationInterface {
    name = 'InitialMigrate1768163689520'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_email_categories\` (\`id\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`user_id\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(255) NOT NULL, \`fname\` varchar(255) NOT NULL, \`lname\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'valid', \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_credentials\` (\`id\` varchar(255) NOT NULL, \`inbox_email\` varchar(255) NOT NULL, \`tokens\` text NOT NULL, \`expiry_date\` bigint NOT NULL, \`watcher_date\` bigint NOT NULL, \`last_history_id\` varchar(255) NULL, \`user_id\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_incoming_emails\` (\`id\` varchar(255) NOT NULL, \`from\` varchar(255) NOT NULL, \`subject\` varchar(500) NULL, \`html_text\` longtext NULL, \`text\` longtext NULL, \`message_id\` varchar(255) NOT NULL, \`attachments\` json NULL, \`summary\` text NULL, \`has_unsubscribe\` tinyint NOT NULL DEFAULT 0, \`is_processed\` tinyint NOT NULL DEFAULT 0, \`unsubscribed\` tinyint NOT NULL DEFAULT 0, \`creation_date\` bigint NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`credential_id\` varchar(255) NULL, \`category_id\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_email_categories\` ADD CONSTRAINT \`FK_779da1b3cd6137234263dddf21f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_credentials\` ADD CONSTRAINT \`FK_dd0918407944553611bb3eb3ddc\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` ADD CONSTRAINT \`FK_67c3c3898e198ea93feba50299c\` FOREIGN KEY (\`credential_id\`) REFERENCES \`user_credentials\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` ADD CONSTRAINT \`FK_6be865eafbb3a04d24a26a45dad\` FOREIGN KEY (\`category_id\`) REFERENCES \`user_email_categories\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP FOREIGN KEY \`FK_6be865eafbb3a04d24a26a45dad\``);
        await queryRunner.query(`ALTER TABLE \`user_incoming_emails\` DROP FOREIGN KEY \`FK_67c3c3898e198ea93feba50299c\``);
        await queryRunner.query(`ALTER TABLE \`user_credentials\` DROP FOREIGN KEY \`FK_dd0918407944553611bb3eb3ddc\``);
        await queryRunner.query(`ALTER TABLE \`user_email_categories\` DROP FOREIGN KEY \`FK_779da1b3cd6137234263dddf21f\``);
        await queryRunner.query(`DROP TABLE \`user_incoming_emails\``);
        await queryRunner.query(`DROP TABLE \`user_credentials\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP TABLE \`user_email_categories\``);
    }

}

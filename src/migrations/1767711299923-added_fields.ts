import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedFields1767711299923 implements MigrationInterface {
    name = 'AddedFields1767711299923'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`main_entities\` ADD \`amount\` float NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`main_entities\` ADD \`rate\` float NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`main_entities\` ADD \`targetCurrency\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`main_entities\` ADD \`conversion\` float NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`main_entities\` ADD \`sessionId\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`main_entities\` DROP COLUMN \`conversion\``);
        await queryRunner.query(`ALTER TABLE \`main_entities\` DROP COLUMN \`targetCurrency\``);
        await queryRunner.query(`ALTER TABLE \`main_entities\` DROP COLUMN \`rate\``);
        await queryRunner.query(`ALTER TABLE \`main_entities\` DROP COLUMN \`amount\``);
    }

}

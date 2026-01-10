import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigrate1767707691790 implements MigrationInterface {
    name = 'InitialMigrate1767707691790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`main_entities\` (\`id\` int NOT NULL AUTO_INCREMENT, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`main_entities\``);
    }

}

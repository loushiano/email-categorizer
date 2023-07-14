import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './role.entity';
import { Repository } from 'typeorm';
import { RoleDto } from './role.dto';
import { InjectMapper } from '@automapper/nestjs';
import { Mapper } from '@automapper/core';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private roleRepo: Repository<RoleEntity>,
    @InjectMapper() private readonly classMapper: Mapper,
  ) {}
  async findRole(role: Role) {
    return await this.roleRepo.findOne({ where: { name: role } });
  }

  async getRoles() {
    return await this.roleRepo.find();
  }

  async getRole(id: number) {
    return await this.roleRepo.findOne(id);
  }

  async createRole(role: RoleDto) {
    let newRole: RoleEntity = await this.classMapper.map(
      role,
      RoleDto,
      RoleEntity,
    );
    await this.roleRepo.save(newRole);
  }

  async modifyRole(role: RoleDto, id: number) {
    let newRole: RoleEntity = await this.classMapper.map(
      role,
      RoleDto,
      RoleEntity,
    );
    newRole.id = id;
    await this.roleRepo.save(newRole);
  }
  async deleteRole(id: number) {
    await this.roleRepo.delete(id);
  }
}

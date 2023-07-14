import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { createMap, forMember, mapFrom, Mapper } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { RoleDto } from './role.dto';
import { RoleEntity } from './role.entity';

@Injectable()
export class RoleProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  override get profile() {
    return (mapper) => {
      createMap(
        mapper,
        RoleDto,
        RoleEntity,
        forMember(
          (dest) => dest.permissions,
          mapFrom((src) => {
            return src.permissions;
          }),
        ),
      );
      createMap(
        mapper,
        RoleEntity,
        RoleDto,
        forMember(
          (dest) => dest.permissions,
          mapFrom((src) => {
            return src.permissions;
          }),
        ),
      );
    };
  }
}

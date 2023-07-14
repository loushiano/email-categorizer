import 'reflect-metadata';
import * as _ from 'lodash';
import { Logger } from '@nestjs/common';

/**
 * `@ApmTransaction` decorator
 *
 *
 */
// tslint:disable-next-line: no-unused-vars
export function Logging(logger: Logger, msg: string) {
  // tslint:disable-next-line: only-arrow-functions
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    if (descriptor) {
      return _generateDescriptor(descriptor, propertyKey, logger, msg);
    }
  };
}

function _generateDescriptor(
  descriptor: PropertyDescriptor,
  functionName: string,
  logger: Logger,
  msg: string,
): PropertyDescriptor {
  // Save a reference to the original method
  const originalMethod = descriptor.value;
  // Rewrite original method with try/catch wrapper
  descriptor.value = async function (...args: any[]) {
    return await originalMethod.apply(this, args);

    // return monitorAsyncWrapper(async () => originalMethod.apply(this, args), functionName, labels);
  };
  return descriptor;
}

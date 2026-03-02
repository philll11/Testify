// backend/src/users/decorators/is-existing-contact-users.decorator.ts

import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsExistingUsersConstraint } from '../validators/is-existing-contact-users.validator';

export function IsExistingUsers(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsExistingUsersConstraint,
    });
  };
}

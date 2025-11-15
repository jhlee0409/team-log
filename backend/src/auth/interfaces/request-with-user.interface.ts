import { Request } from 'express';
import { ValidatedUser } from './jwt-payload.interface';

export interface RequestWithUser extends Request {
  user: ValidatedUser;
}

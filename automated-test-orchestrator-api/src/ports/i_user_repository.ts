// src/ports/i_user_repository.ts

import { User, CreateUserDTO, UpdateUserDTO } from '../domain/user.js';

export interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(user: CreateUserDTO): Promise<User>;

    update(id: string, user: UpdateUserDTO): Promise<User>;
    incrementTokenVersion(id: string): Promise<void>;
}

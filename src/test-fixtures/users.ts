import { User } from '../domain/types';

export const MOCK_USERS: User[] = [
  {
    id: 'user_admin_1',
    name: 'Marina Costa',
    email: 'marina.costa@maplebeararaxa.com.br',
    role: 'ADMIN',
    cargo: 'Coordenadora Pedagógica',
  },
  {
    id: 'user_admin_2',
    name: 'Carlos Eduardo Ferreira',
    email: 'carlos.eduardo@maplebeararaxa.com.br',
    role: 'ADMIN',
    cargo: 'Diretor Administrativo',
  },
  {
    id: 'user_admin_3',
    name: 'Beatriz Lima Prado',
    email: 'beatriz.lima@maplebeararaxa.com.br',
    role: 'ADMIN',
    cargo: 'Supervisora de Operações',
  },
  {
    id: 'user_sec_1',
    name: 'Juliana Silva',
    email: 'juliana.silva@maplebeararaxa.com.br',
    role: 'SECRETARIA',
    cargo: 'Secretária de Matrículas',
  },
  {
    id: 'user_sec_2',
    name: 'Fernanda Rocha',
    email: 'fernanda.rocha@maplebeararaxa.com.br',
    role: 'SECRETARIA',
    cargo: 'Assistente da Secretaria',
  },
];

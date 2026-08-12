import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool } from 'mysql2/promise';

export interface DirectoryUserContact {
  id: string;
  email: string;
  name: string;
  phoneNumber: string | null;
}

export interface DirectoryTeamBranding {
  id: string;
  name: string;
  nameAr: string | null;
  logoUrl: string | null;
}

/**
 * Accès en lecture seule à la base partagée `foot` (tables `User`, `teams`),
 * utilisée uniquement pour :
 *  - résoudre les cibles broadcast génériques TEAM/ROLE/MEMBERS (§22), qui
 *    reposent sur des colonnes communes à tout l'écosystème (role, teamId) ;
 *  - récupérer le contact (email) d'un destinataire pour l'envoi email ;
 *  - récupérer le branding club pour les templates (§34).
 *
 * Ne contient et ne contiendra jamais de logique métier football/billetterie
 * (§32) : les cibles CATEGORY/SELLER, qui dépendent de données propres à
 * teamManager/marketplace-api, doivent être pré-résolues par l'application
 * appelante (voir RecipientResolverService).
 *
 * Optionnelle : si DIRECTORY_DB_HOST n'est pas configuré, ce service reste
 * inactif (isEnabled() === false) et toute tentative de résolution générique
 * échoue explicitement plutôt que d'échouer silencieusement.
 */
@Injectable()
export class SharedDirectoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SharedDirectoryService.name);
  private pool: Pool | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('DIRECTORY_DB_HOST');
    if (!host) {
      this.logger.warn(
        'DIRECTORY_DB_HOST not set: broadcast targets (TEAM/ROLE/MEMBERS) and club branding are disabled.',
      );
      return;
    }
    this.pool = mysql.createPool({
      host,
      port: this.config.get<number>('DIRECTORY_DB_PORT') ?? 3306,
      user: this.config.get<string>('DIRECTORY_DB_USERNAME'),
      password: this.config.get<string>('DIRECTORY_DB_PASSWORD'),
      database: this.config.get<string>('DIRECTORY_DB_DATABASE'),
      connectionLimit: 5,
      waitForConnections: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  isEnabled(): boolean {
    return this.pool !== null;
  }

  private requirePool(): Pool {
    if (!this.pool) {
      throw new Error(
        'Shared directory database is not configured (DIRECTORY_DB_HOST missing)',
      );
    }
    return this.pool;
  }

  async findActiveUserIdsByTeam(teamId: string): Promise<string[]> {
    const [rows] = await this.requirePool().query<mysql.RowDataPacket[]>(
      'SELECT id FROM `User` WHERE teamId = ? AND isActive = 1',
      [teamId],
    );
    return rows.map((row) => row.id as string);
  }

  async findActiveUserIdsByRole(
    role: string,
    teamId?: string,
  ): Promise<string[]> {
    const params: unknown[] = [role];
    let sql = 'SELECT id FROM `User` WHERE role = ? AND isActive = 1';
    if (teamId) {
      sql += ' AND teamId = ?';
      params.push(teamId);
    }
    const [rows] = await this.requirePool().query<mysql.RowDataPacket[]>(
      sql,
      params,
    );
    return rows.map((row) => row.id as string);
  }

  async getUserContact(userId: string): Promise<DirectoryUserContact | null> {
    const [rows] = await this.requirePool().query<mysql.RowDataPacket[]>(
      'SELECT id, email, name, phoneNumber FROM `User` WHERE id = ? LIMIT 1',
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      phoneNumber: (row.phoneNumber as string | null) ?? null,
    };
  }

  async getTeamBranding(teamId: string): Promise<DirectoryTeamBranding | null> {
    const [rows] = await this.requirePool().query<mysql.RowDataPacket[]>(
      'SELECT id, nom, nom_ar, logo_url FROM `teams` WHERE id = ? LIMIT 1',
      [teamId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id as string,
      name: row.nom as string,
      nameAr: (row.nom_ar as string) ?? null,
      logoUrl: (row.logo_url as string) ?? null,
    };
  }
}

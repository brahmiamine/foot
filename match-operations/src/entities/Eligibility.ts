import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity("saisons")
export class SeasonRegulation {
  @PrimaryColumn({type:"char",length:36}) id!: string;
  @Column({type:"boolean",name:"requires_player_contract",default:false}) requiresPlayerContract!: boolean;
  @Column({type:"boolean",name:"requires_medical_clearance",default:false}) requiresMedicalClearance!: boolean;
}
@Entity("competition_registrations")
export class CompetitionRegistrationRead {
  @PrimaryColumn({type:"char",length:36}) id!: string;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"char",length:36,name:"team_id"}) teamId!: string;
  @Column({type:"varchar",length:32}) status!: string;
}
@Entity("player_registrations")
export class PlayerRegistrationRead {
  @PrimaryColumn({type:"char",length:36}) id!: string;
  @Column({type:"varchar",length:191,name:"player_id"}) playerId!: string;
  @Column({type:"char",length:36,name:"club_id"}) clubId!: string;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"varchar",length:32}) status!: string;
  @Column({type:"varchar",length:32,name:"eligibility_status"}) eligibilityStatus!: string;
}
@Entity("person_licenses")
export class PersonLicenseRead {
  @PrimaryColumn({type:"char",length:36}) id!: string;
  @Column({type:"varchar",length:191,name:"person_reference_id"}) personReferenceId!: string;
  @Column({type:"char",length:36,nullable:true,name:"club_id"}) clubId?: string|null;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"varchar",length:32,name:"person_type"}) personType!: string;
  @Column({type:"varchar",length:32}) status!: string;
  @Column({type:"datetime",nullable:true,name:"expires_at"}) expiresAt?: Date|null;
}
@Entity("player_contracts")
export class PlayerContractRead {
  @PrimaryColumn({type:"char",length:36}) id!: string;
  @Column({type:"varchar",length:191,name:"player_id"}) playerId!: string;
  @Column({type:"char",length:36,name:"club_id"}) clubId!: string;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"date",name:"start_date"}) startDate!: string;
  @Column({type:"date",name:"end_date"}) endDate!: string;
  @Column({type:"varchar",length:32}) status!: string;
  @Column({type:"varchar",length:32,name:"federation_status"}) federationStatus!: string;
}
@Entity("Suspension")
export class SuspensionRead {
  @PrimaryColumn({type:"varchar",length:191}) id!: string;
  @Column({type:"varchar",length:191}) playerId!: string;
  @Column({type:"varchar",length:191,nullable:true}) teamId?: string|null;
  @Column({type:"int"}) matchesCount!: number;
  @Column({type:"int",default:0}) matchesPurged!: number;
  @Column({type:"varchar",length:32}) status!: string;
  @Column({type:"int",nullable:true}) overrideMatchesCount?: number|null;
}
@Entity("player_transfers")
export class PlayerTransferRead {
  @PrimaryColumn({type:"varchar",length:191}) id!: string;
  @Column({type:"varchar",length:191,name:"player_id"}) playerId!: string;
  @Column({type:"char",length:36,name:"from_team_id"}) fromTeamId!: string;
  @Column({type:"char",length:36,name:"to_team_id"}) toTeamId!: string;
  @Column({type:"date",name:"effective_date"}) effectiveDate!: string;
  @Column({type:"varchar",length:32}) status!: string;
}
@Entity("medical_eligibilities")
export class MedicalEligibilityRead {
  @PrimaryColumn({type:"char",length:36}) id!: string;
  @Column({type:"varchar",length:191,name:"player_id"}) playerId!: string;
  @Column({type:"char",length:36,name:"club_id"}) clubId!: string;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"date",name:"expires_at"}) expiresAt!: string;
  @Column({type:"varchar",length:32}) status!: string;
}
@Entity("eligibility_checks")
export class EligibilityCheckWrite {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({type:"varchar",length:191,name:"player_id"}) playerId!: string;
  @Column({type:"char",length:36,name:"club_id"}) clubId!: string;
  @Column({type:"char",length:36,name:"match_id"}) matchId!: string;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"boolean"}) eligible!: boolean;
  @Column({type:"json",name:"blocking_reasons"}) blockingReasons!: string[];
  @Column({type:"json"}) warnings!: string[];
  @Column({type:"varchar",length:191,nullable:true,name:"actor_user_id"}) actorUserId?: string|null;
  @Column({type:"varchar",length:50,name:"actor_role"}) actorRole!: string;
  @Column({type:"varchar",length:45,nullable:true,name:"ip_address"}) ipAddress?: string|null;
  @Column({type:"varchar",length:512,nullable:true,name:"user_agent"}) userAgent?: string|null;
  @CreateDateColumn({type:"datetime",name:"checked_at"}) checkedAt!: Date;
}

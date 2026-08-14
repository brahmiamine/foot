import { getDataSource } from "@/lib/db";
import { PlayerControl } from "@/entities/PlayerControl";
import { Repository } from "typeorm";

/**
 * Service for PlayerControl operations (contrôle du numéro de maillot / de
 * l'identité de chaque joueur inscrit — écran "Contrôles" avant le match).
 */
export class PlayerControlService {
  private async getRepository(): Promise<Repository<PlayerControl>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PlayerControl);
  }

  async findBySheet(sheetId: number): Promise<PlayerControl[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId } });
  }

  async setChecked(sheetId: number, matchLineupId: number, checked: boolean, note?: string | null): Promise<PlayerControl> {
    const repository = await this.getRepository();
    let control = await repository.findOne({ where: { sheetId, matchLineupId } });
    if (control) {
      control.checked = checked;
      control.checkedAt = checked ? new Date() : null;
      if (note !== undefined) control.note = note;
    } else {
      control = repository.create({
        sheetId,
        matchLineupId,
        checked,
        checkedAt: checked ? new Date() : null,
        note: note ?? null,
      });
    }
    return repository.save(control);
  }
}

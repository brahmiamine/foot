-- Migration : gestion des déplacements pour les matchs à l'extérieur
-- (heure de départ, point de rendez-vous, véhicules/chauffeurs/places,
-- joueurs présents, parents accompagnateurs, offres/besoins de transport).
-- Additive uniquement, propre à teamManager, scopée par team_id.

USE foot;

CREATE TABLE cms_trips (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NOT NULL DEFAULT 'seniors',
  match_type ENUM('OFFICIAL', 'FRIENDLY') NULL,
  match_id CHAR(36) NULL,
  friendly_match_id BIGINT NULL,
  departure_time DATETIME NOT NULL,
  meeting_point VARCHAR(255) NULL,
  notes TEXT NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trips_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trips_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_trips_friendly_match FOREIGN KEY (friendly_match_id) REFERENCES cms_friendly_matches(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_trips_creator FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL,
  INDEX idx_cms_trips_team_category (team_id, category, departure_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_trip_vehicles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trip_id BIGINT NOT NULL,
  vehicle_type ENUM('BUS', 'MINIBUS', 'CAR', 'OTHER') NOT NULL DEFAULT 'MINIBUS',
  label VARCHAR(100) NULL,
  driver_name VARCHAR(150) NULL,
  seats INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_cms_trip_vehicles_trip FOREIGN KEY (trip_id) REFERENCES cms_trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_trip_participants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trip_id BIGINT NOT NULL,
  participant_type ENUM('PLAYER', 'PARENT', 'STAFF') NOT NULL DEFAULT 'PLAYER',
  player_id VARCHAR(191) NULL,
  name VARCHAR(150) NULL,
  transport_offer ENUM('NONE', 'NEEDS_TRANSPORT', 'CAN_DRIVE') NOT NULL DEFAULT 'NONE',
  offered_seats INT NULL,
  vehicle_id BIGINT NULL,
  confirmed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trip_participants_trip FOREIGN KEY (trip_id) REFERENCES cms_trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trip_participants_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trip_participants_vehicle FOREIGN KEY (vehicle_id) REFERENCES cms_trip_vehicles(id) ON DELETE SET NULL,
  CONSTRAINT chk_cms_trip_participants_player CHECK (
    (participant_type = 'PLAYER' AND player_id IS NOT NULL) OR
    (participant_type IN ('PARENT', 'STAFF') AND name IS NOT NULL)
  ),
  INDEX idx_cms_trip_participants_trip (trip_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

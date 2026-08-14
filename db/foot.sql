-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mariadb_container:3306
-- Generation Time: Aug 02, 2026 at 03:23 PM
-- Server version: 12.3.2-MariaDB-ubu2404
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `foot`
--

-- --------------------------------------------------------

--
-- Table structure for table `arbitres`
--

CREATE TABLE `arbitres` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `nom` varchar(255) NOT NULL,
  `nom_en` varchar(255) DEFAULT NULL,
  `nom_ar` varchar(255) DEFAULT NULL,
  `nationalite` varchar(255) DEFAULT NULL,
  `nationalite_ar` varchar(255) DEFAULT NULL,
  `date_naissance` date DEFAULT NULL,
  `photo_url` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `arbitres`
--

INSERT INTO `arbitres` (`id`, `nom`, `nom_en`, `nom_ar`, `nationalite`, `nationalite_ar`, `date_naissance`, `photo_url`, `created_at`) VALUES
('09a09383-a22e-449e-b6bd-64bcbc6fb0cd', 'Mohamed Ali Karouia', 'Mohamed Ali Karouia', 'محمد علي كروية', 'Tunisie', 'تونس', '1985-07-19', NULL, '2025-11-17 13:41:31'),
('12ace6bc-4bc4-4339-8c7e-22d8402c1fee', 'Bedis Ben Saleh', 'Bedis Ben Saleh', 'بديس بن صالح', 'Tunisie', 'تونس', '1986-11-13', NULL, '2025-11-17 13:41:31'),
('1387dc7b-acb0-46db-97c6-d566f21f4ad9', 'Aymen Nasri', 'Aymen Nasri', 'أيمن نصري', 'Tunisie', 'تونس', '1983-02-21', '/api/uploads/arbitre/Aymen_Nasri-1763744559561.jpg', '2025-11-17 13:41:31'),
('246171b4-11a1-44a1-9ad9-85c3b2e0f81b', 'Abdelhamid Badreddine', 'Abdelhamid Badreddine', 'عبد الحميد بدر الدين', 'Tunisie', 'تونس', '9978-05-19', '/api/uploads/arbitre/_____________________-1763765344596.jpg', '2025-11-21 22:47:10'),
('28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', 'Hamza Jeaied', 'Hamza Jeaied', 'حمزة الجعيد', 'Tunisie', 'تونس', '1990-03-16', NULL, '2025-11-17 13:41:31'),
('2bc18c95-59ac-43e7-9797-058a7f68825e', 'Amir Lousif', 'Amir Lousif', 'أمير اللّوصيف', 'Tunisie', 'تونس', '1989-02-08', '/api/uploads/arbitre/Amir_Lousif-1763741427639.jpg', '2025-11-17 13:41:31'),
('2bd3e2da-6d16-440e-9973-b2f25068aa61', 'Sofiene Ouertani', 'Sofiene Ouertani', 'سفيان الورتاني', 'Tunisie', 'تونس', '1979-12-28', NULL, '2025-11-17 13:41:31'),
('2e4e6d91-56a8-4af0-a152-0eaf415ecef4', 'Bassem Belaid', 'Bassem Belaid', 'باسم بلعيد', 'Tunisie', 'تونس', '1981-12-10', NULL, '2025-11-17 13:41:31'),
('3b961988-7089-4446-859d-138be2fe6f37', 'Amine Fgair', 'Amine Fgair', 'أمين فغير', 'Tunisie', 'تونس', '1989-09-17', NULL, '2025-11-17 13:41:31'),
('3d7077da-436a-43c7-952d-9873bd5be225', 'Nidhal Letaif', 'Nidhal Letaif', 'نضال لطيف', 'Tunisie', 'تونس', '1983-01-27', '/api/uploads/arbitre/Nidhal_Letaif-1763740828381.webp', '2025-11-17 13:41:31'),
('4fb6b839-5c6e-4613-a202-a491046c937d', 'Khalil Jery', 'Khalil Jery', 'خليل جري', 'Tunisie', 'تونس', '1988-05-12', NULL, '2025-11-17 13:41:31'),
('527bf814-1273-4c64-9fdf-b04768c87516', 'Seifeddine Ouertani', 'Seifeddine Ouertani', 'سيف الدين الورتاني', 'Tunisie', 'تونس', '1981-04-07', '/api/uploads/arbitre/Sofe_edinne_Ouertani_-1763736573190.webp', '2025-11-17 13:41:31'),
('5adfd381-9d2a-4d4d-bc4e-614d6ac12839', 'Abdelhamid Badreddine', 'Abdelhamid Badreddine', 'عبد الحميد بدر الدين', 'Tunisie', 'تونس', '1978-05-19', NULL, '2025-11-17 13:41:31'),
('6f7c4693-f48d-4521-a014-41ee3b68cbcd', 'Haythem Trabelsi', 'Haythem Trabelsi', 'هيثم الترابلسي', 'Tunisie', 'تونس', '1982-04-22', NULL, '2025-11-17 13:41:31'),
('8b8754b0-9add-47cb-9d6e-b51499c471cc', 'Sadok Selmi', 'Sadok Selmi', 'صادق سلمي', 'Tunisie', 'تونس', '1975-01-04', '/api/uploads/arbitre/sadok-selmi-1-1763736610000.jpg', '2025-11-17 13:41:31'),
('8dbf331c-b981-4929-828b-9bf475943b1d', 'Houssem Belhadj Ali', 'Houssem Belhadj Ali', 'حسام بالحاج علي', 'Tunisie', 'تونس', '1984-06-24', NULL, '2025-11-17 13:41:31'),
('9101a9b6-dad6-4b19-bc74-4930429e1aa0', 'Hosni Naili', 'Hosni Naili', 'حسني نيلي', 'Tunisie', 'تونس', '1982-08-01', NULL, '2025-11-17 13:41:31'),
('9d434827-cb60-4d7f-9946-2eed37dddc84', 'Fradj Abdellaoui', 'Fradj Abdellaoui', 'فرج عبد اللاوي', 'Tunisie', 'تونس', '1980-03-14', '/api/uploads/arbitre/Fradj_Abdellaoui-1763740951142.jpg', '2025-11-17 13:41:31'),
('a642b107-ab33-4cbd-b1ac-9b831ee7ca73', 'Houssem Ben Sassi', 'Houssem Ben Sassi', 'حسام بن ساسي', 'Tunisie', 'تونس', '1987-08-18', NULL, '2025-11-17 13:41:31'),
('a8d247fb-dc14-4254-97df-fbfddb79d506', 'Amir Ayadi', 'Amir Ayadi', 'أمير عيادي', 'Tunisie', 'تونس', '1985-01-09', '/api/uploads/arbitre/Amir_Ayadi-1763741287670.jpg', '2025-11-17 13:41:31'),
('ad74feeb-b4ed-423b-b350-dda01c277633', 'Houssem Boulaaras', 'Houssem Boulaaras', 'حسام بوالعراس', 'Tunisie', 'تونس', '1985-12-06', '/api/uploads/arbitre/Arbitre_Houssem_Boulares-1763744820479.jpg', '2025-11-17 13:41:31'),
('b39c9bf9-ba79-4df1-a184-370e490f66a0', 'Achref Harakati', 'Achref Harakati', 'أشرف الحركاتي', 'Tunisie', 'تونس', '1987-09-29', NULL, '2025-11-17 13:41:31'),
('b5608682-9950-486e-bafd-3078cec401ba', 'Khaled Gouider', 'Khaled Gouider', 'خالد قويدر', 'Tunisie', 'تونس', '1978-11-02', '/api/uploads/arbitre/Khaled_Gouider-1763744611736.jpg', '2025-11-17 13:41:31'),
('bdd4fb56-f7e9-422f-b802-44007ac2b061', 'Mehrez Malki', 'Mehrez Malki', 'محرز المالكي', 'Tunisie', 'تونس', '1984-10-30', '/api/uploads/arbitre/Mehrez-Malki-arbitre-neue-1763744664025.jpg', '2025-11-17 13:41:31'),
('cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', 'Walid Mansri', 'Walid Mansri', 'وليد منصري', 'Tunisie', 'تونس', '1984-09-05', '/api/uploads/arbitre/1551093251_img-1763736404515.jpg', '2025-11-17 13:41:31'),
('cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', 'Montassar Belarbi', 'Montassar Belarbi', 'منتصر بالربي', 'Tunisie', 'تونس', '1986-06-03', NULL, '2025-11-17 13:41:31'),
('e3b26885-e0a1-41d9-9957-c1cd721ebb0a', 'Naim Hosni', 'Naim Hosni', 'نعيم حسني', 'Tunisie', 'تونس', '1980-07-25', '/api/uploads/arbitre/naim_hosni_1674331525-1763740872094.jpg', '2025-11-17 13:41:31');

-- --------------------------------------------------------

--
-- Table structure for table `AuditLog`
--

CREATE TABLE `AuditLog` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `entity` varchar(191) NOT NULL,
  `entityId` varchar(191) NOT NULL,
  `before` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before`)),
  `after` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `AuditLog`
--

INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `before`, `after`, `createdAt`) VALUES
('cmn7wx4gl0006c9ygvoeov2y5', 'user-admin', 'CREATE', 'Card', 'cmn7wx4ab0004c9yg9i86almb', 'null', '{\"id\":\"cmn7wx4ab0004c9yg9i86almb\",\"playerId\":\"ob-m3\",\"matchId\":\"match-ob-j30\",\"type\":\"YELLOW\",\"minute\":45,\"cardReasonId\":null,\"commentFr\":\"Test API fix\",\"commentAr\":null,\"createdAt\":\"2026-03-26T20:15:59.964Z\",\"createdBy\":\"user-admin\",\"isNeutralized\":false}', '2026-03-26 20:16:00.197'),
('cmn7wyzfb0007c9ygxwxpn0ap', 'user-admin', 'UPDATE', 'Settings', 'settings-default', '{\"id\":\"settings-default\",\"clubNameFr\":\"Olympique de Béja\",\"clubNameAr\":null,\"clubLogo\":null,\"yellowsBeforeSuspend\":3,\"redCard1Matches\":1,\"redCard2Matches\":2,\"redCard3Matches\":3,\"yellowFineAmount\":\"30\",\"redFineAmount\":\"50\",\"fineDueDays\":15,\"alertEmails\":\"admin@ob.tn,direction@ob.tn\",\"cronFrequency\":\"weekly\",\"updatedAt\":\"2026-03-26T19:49:50.811Z\"}', '{\"id\":\"settings-default\",\"clubNameFr\":\"Olympique de Béja\",\"clubNameAr\":\"الأولمبي الباجي\",\"clubLogo\":null,\"yellowsBeforeSuspend\":3,\"redCard1Matches\":1,\"redCard2Matches\":2,\"redCard3Matches\":3,\"yellowFineAmount\":\"30\",\"redFineAmount\":\"50\",\"fineDueDays\":15,\"alertEmails\":\"admin@ob.tn,direction@ob.tn\",\"cronFrequency\":\"weekly\",\"updatedAt\":\"2026-03-26T20:17:26.946Z\"}', '2026-03-26 20:17:26.997'),
('cmn7x1zqk000ac9ygg4b0brrq', 'user-admin', 'CREATE', 'Card', 'cmn7x1zo80008c9ygmhd2fhns', 'null', '{\"id\":\"cmn7x1zo80008c9ygmhd2fhns\",\"playerId\":\"ob-d2\",\"matchId\":\"match-ob-j21\",\"type\":\"YELLOW\",\"minute\":1,\"cardReasonId\":null,\"commentFr\":\"\",\"commentAr\":\"\",\"createdAt\":\"2026-03-26T20:19:47.286Z\",\"createdBy\":\"user-admin\",\"isNeutralized\":false}', '2026-03-26 20:19:47.370'),
('cmn7x2k75000ec9ygxiz59xim', 'user-admin', 'CREATE', 'Card', 'cmn7x2k4o000bc9ygewjq84i8', 'null', '{\"id\":\"cmn7x2k4o000bc9ygewjq84i8\",\"playerId\":\"ob-d2\",\"matchId\":\"match-ob-j22\",\"type\":\"YELLOW\",\"minute\":2,\"cardReasonId\":null,\"commentFr\":\"\",\"commentAr\":\"\",\"createdAt\":\"2026-03-26T20:20:13.798Z\",\"createdBy\":\"user-admin\",\"isNeutralized\":false}', '2026-03-26 20:20:13.888'),
('cmn7x2vsl000hc9yg7ws05kcb', 'user-admin', 'CREATE', 'Card', 'cmn7x2vro000fc9yglqseegcu', 'null', '{\"id\":\"cmn7x2vro000fc9yglqseegcu\",\"playerId\":\"ob-d2\",\"matchId\":\"match-ob-j23\",\"type\":\"YELLOW\",\"minute\":2,\"cardReasonId\":null,\"commentFr\":\"\",\"commentAr\":\"\",\"createdAt\":\"2026-03-26T20:20:28.883Z\",\"createdBy\":\"user-admin\",\"isNeutralized\":false}', '2026-03-26 20:20:28.916');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` char(36) NOT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` char(36) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `admin_username` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `action`, `entity_type`, `entity_id`, `summary`, `admin_username`, `ip_address`, `created_at`) VALUES
('3b62d368-beb4-4b10-9d97-ef9a6443c64c', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 09:56:05'),
('57bf41b4-5fb9-44ea-a6fc-4f0e4557787b', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 09:51:17'),
('5ba695a8-e523-4aa9-a1da-cda9f0febff2', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 09:12:47'),
('6873a676-9422-4722-99af-ad6d3e6dbc49', 'toggle', 'league', 'comp-coupe', 'Coupe de Tunisie → désactivée', 'admin', '127.0.0.1', '2026-08-02 15:21:27'),
('70d54e05-6d1e-4513-b467-585f08d0a048', 'toggle', 'league', '46ba1a85-c821-11f0-86aa-56018b9f5d54', 'Coupe de France → désactivée', 'admin', '127.0.0.1', '2026-08-02 00:17:07'),
('7f81ab22-e662-4e0c-908f-fe2d5952b9ce', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 09:46:43'),
('8080db27-9cac-4981-919f-329a3e3a3c1f', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 15:21:03'),
('8447549a-5c98-4119-8334-0411a2a772a3', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 09:22:31'),
('a1c115d1-d7f7-49e1-a361-aba151007328', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 00:16:45'),
('a3bd8a09-fcae-4422-a85f-1e42bf5dab92', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 09:44:21'),
('bef7acc0-8ffc-49ca-bb49-27c774654e9a', 'login', 'admin_session', NULL, NULL, 'admin', '127.0.0.1', '2026-08-02 09:41:37'),
('df4b70bf-24e8-45ab-828d-f443a9e5913e', 'toggle', 'league', '46ba1a85-c821-11f0-86aa-56018b9f5d54', 'Coupe de France → désactivée', 'admin', '127.0.0.1', '2026-08-02 15:21:27');

-- --------------------------------------------------------

--
-- Table structure for table `Card`
--

CREATE TABLE `Card` (
  `id` varchar(191) NOT NULL,
  `playerId` varchar(191) NOT NULL,
  `matchId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL,
  `type` enum('YELLOW','RED','DOUBLE_YELLOW') NOT NULL,
  `minute` int(11) DEFAULT NULL,
  `cardReasonId` varchar(191) DEFAULT NULL,
  `commentFr` varchar(191) DEFAULT NULL,
  `commentAr` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `createdBy` varchar(191) NOT NULL,
  `isNeutralized` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Card`
--

INSERT INTO `Card` (`id`, `playerId`, `matchId`, `type`, `minute`, `cardReasonId`, `commentFr`, `commentAr`, `createdAt`, `createdBy`, `isNeutralized`) VALUES
('card-j10-1', 'ob-17', 'match-ob-j10', 'YELLOW', 72, NULL, 'Simulation contestée', 'محاولة تمثيل متنازع عليها', '2026-03-26 19:49:51.053', 'user-admin', 0),
('card-j10-2', 'ob-21', 'match-ob-j10', 'YELLOW', 89, NULL, '2e jaune pour Fadhli — suspension', 'ثاني صفراء لفضلي — إيقاف', '2026-03-26 19:49:51.055', 'user-admin', 0),
('card-j2-1', 'ob-6', 'match-ob-j2', 'YELLOW', 34, NULL, 'Faute tactique', 'خطأ تكتيكي', '2026-03-26 19:49:51.039', 'user-admin', 0),
('card-j3-1', 'ob-21', 'match-ob-j3', 'YELLOW', 55, NULL, 'Protestation', 'احتجاج على الحكم', '2026-03-26 19:49:51.040', 'user-admin', 0),
('card-j3-2', 'ob-4', 'match-ob-j3', 'YELLOW', 78, NULL, 'Faute sur attaquant', 'خطأ على المهاجم', '2026-03-26 19:49:51.042', 'user-admin', 0),
('card-j4-1', 'ob-14', 'match-ob-j4', 'YELLOW', 22, NULL, 'Faute défensive', 'خطأ دفاعي', '2026-03-26 19:49:51.044', 'user-admin', 0),
('card-j5-1', 'ob-23', 'match-ob-j5', 'RED', 60, NULL, 'Faute grossière sur contre-attaque', 'خطأ جسيم على هجمة مرتدة', '2026-03-26 19:49:51.046', 'user-admin', 0),
('card-j6-1', 'ob-18', 'match-ob-j6', 'YELLOW', 67, NULL, 'Retard dans le dégagement', 'تأخر في التدخل', '2026-03-26 19:49:51.047', 'user-admin', 0),
('card-j7-1', 'ob-2', 'match-ob-j7', 'YELLOW', 41, NULL, 'Faute sur ailier', 'خطأ على الجناح', '2026-03-26 19:49:51.049', 'user-admin', 0),
('card-j7-2', 'ob-6', 'match-ob-j7', 'YELLOW', 88, NULL, '2e jaune — faute grossière', 'ثاني صفراء — خطأ جسيم', '2026-03-26 19:49:51.050', 'user-admin', 0),
('card-j8-1', 'ob-24', 'match-ob-j8', 'YELLOW', 15, NULL, 'Faute au milieu', 'خطأ في الوسط', '2026-03-26 19:49:51.052', 'user-admin', 0),
('cmn7w4ppv0000j5ygi94a5wzb', 'ob-m3', 'match-ob-j23', 'YELLOW', 12, NULL, '', '', '2026-03-26 19:53:54.733', 'user-admin', 0),
('cmn7woohf0000c9ygzhn3ixow', 'ob-m3', 'match-ob-j22', 'YELLOW', 13, NULL, '', '', '2026-03-26 20:09:26.256', 'user-admin', 0),
('cmn7wqx420002c9yghkkq29n8', 'ob-d5', 'match-ob-j23', 'YELLOW', 1, NULL, '', '', '2026-03-26 20:11:10.752', 'user-admin', 0),
('cmn7wx4ab0004c9yg9i86almb', 'ob-m3', 'match-ob-j30', 'YELLOW', 45, NULL, 'Test API fix', NULL, '2026-03-26 20:15:59.964', 'user-admin', 0),
('cmn7x1zo80008c9ygmhd2fhns', 'ob-d2', 'match-ob-j21', 'YELLOW', 1, NULL, '', '', '2026-03-26 20:19:47.286', 'user-admin', 1),
('cmn7x2k4o000bc9ygewjq84i8', 'ob-d2', 'match-ob-j22', 'YELLOW', 2, NULL, '', '', '2026-03-26 20:20:13.798', 'user-admin', 0),
('cmn7x2vro000fc9yglqseegcu', 'ob-d2', 'match-ob-j23', 'YELLOW', 2, NULL, '', '', '2026-03-26 20:20:28.883', 'user-admin', 0);

-- --------------------------------------------------------

--
-- Table structure for table `CardReason`
--

CREATE TABLE `CardReason` (
  `id` varchar(191) NOT NULL,
  `labelFr` varchar(191) NOT NULL,
  `labelAr` varchar(191) DEFAULT NULL,
  `type` enum('YELLOW','RED','BOTH') NOT NULL DEFAULT 'BOTH',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `email` varchar(255) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `message` text NOT NULL,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `contact_messages`
--

INSERT INTO `contact_messages` (`id`, `email`, `subject`, `message`, `device_fingerprint`, `created_at`) VALUES
('3d95e28d-c7d1-11f0-86aa-56018b9f5d54', 'ybrahmi07@gmail.com', 'dfd', 'dfdf', 'eecea206b30e52cb8a0e887a33ca82bc', '2025-11-22 18:33:26');

-- --------------------------------------------------------

--
-- Table structure for table `Convocation`
--

CREATE TABLE `Convocation` (
  `id` varchar(191) NOT NULL,
  `matchId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL,
  `playerId` varchar(191) NOT NULL,
  `status` enum('TITULAR','SUBSTITUTE','BLANK','ENTERING','OUT_OF_LIST','SUSPENDED') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Convocation`
--

INSERT INTO `Convocation` (`id`, `matchId`, `playerId`, `status`) VALUES
('conv-j10-1', 'match-ob-j10', 'ob-1', 'TITULAR'),
('conv-j10-10', 'match-ob-j10', 'ob-17', 'TITULAR'),
('conv-j10-11', 'match-ob-j10', 'ob-19', 'TITULAR'),
('conv-j10-12', 'match-ob-j10', 'ob-16', 'SUBSTITUTE'),
('conv-j10-13', 'match-ob-j10', 'ob-12', 'SUBSTITUTE'),
('conv-j10-14', 'match-ob-j10', 'ob-18', 'SUBSTITUTE'),
('conv-j10-15', 'match-ob-j10', 'ob-26', 'SUBSTITUTE'),
('conv-j10-16', 'match-ob-j10', 'ob-f3', 'SUBSTITUTE'),
('conv-j10-17', 'match-ob-j10', 'ob-23', 'SUBSTITUTE'),
('conv-j10-18', 'match-ob-j10', 'ob-m2', 'SUBSTITUTE'),
('conv-j10-19', 'match-ob-j10', 'ob-33', 'BLANK'),
('conv-j10-2', 'match-ob-j10', 'ob-2', 'TITULAR'),
('conv-j10-3', 'match-ob-j10', 'ob-14', 'TITULAR'),
('conv-j10-4', 'match-ob-j10', 'ob-4', 'TITULAR'),
('conv-j10-5', 'match-ob-j10', 'ob-3', 'TITULAR'),
('conv-j10-6', 'match-ob-j10', 'ob-6', 'TITULAR'),
('conv-j10-7', 'match-ob-j10', 'ob-24', 'TITULAR'),
('conv-j10-8', 'match-ob-j10', 'ob-21', 'TITULAR'),
('conv-j10-9', 'match-ob-j10', 'ob-13', 'TITULAR');

-- --------------------------------------------------------

--
-- Table structure for table `critere_definitions`
--

CREATE TABLE `critere_definitions` (
  `id` varchar(64) NOT NULL,
  `categorie` enum('arbitre','var','assistant') NOT NULL,
  `label_fr` varchar(255) NOT NULL,
  `label_en` varchar(255) DEFAULT NULL,
  `label_ar` varchar(255) NOT NULL,
  `description_fr` text DEFAULT NULL,
  `description_ar` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `critere_definitions`
--

INSERT INTO `critere_definitions` (`id`, `categorie`, `label_fr`, `label_en`, `label_ar`, `description_fr`, `description_ar`, `created_at`) VALUES
('assistant_collaboration', 'assistant', 'Travail des assistants', 'Assistant crew work', 'عمل الحكام المساعدين', 'Évalue la précision des hors-jeu, la cohérence avec l\'arbitre central et la qualité des signalisations.', 'تقييم دقّة التسلل، الانسجام مع الحكم الرئيسي، وجودة الإشارات.', '2025-11-17 13:41:31'),
('communication', 'arbitre', 'Communication (VAR, assistants, joueurs)', 'Communication (VAR, assistants, players)', 'التواصل (الفار، المساعدين، اللاعبين)', 'Mesure la qualité de la communication avec les joueurs, capitaines, VAR et assistants.', 'تقييم جودة التواصل مع اللاعبين، القادة، الفار، وحكام الخط.', '2025-11-17 13:41:31'),
('decisions', 'arbitre', 'Décisions (cartons jaunes / rouges)', 'Decisions (yellow/red cards)', 'القرارات (البطاقات الصفراء / الحمراء)', 'Analyse la justesse des cartons, la cohérence disciplinaire et la gestion des situations tendues.', 'تحليل صحة البطاقات، الانسجام في القرارات الانضباطية وقدرة الحكم على إدارة المواقف الصعبة.', '2025-11-17 13:41:31'),
('deplacement', 'arbitre', 'Déplacement et placement', 'Movement & positioning', 'التحرك والتمركز', 'Évalue le placement, la posture, la lecture du jeu et la capacité à anticiper pour être bien positionné.', 'تقييم التمركز، الوضعية، قراءة اللعب، والاستباق للتموضع الصحيح.', '2025-11-17 13:41:31'),
('sifflet', 'arbitre', 'Sifflet (faute / hors-jeu)', 'Whistle (foul/offside)', 'الصافرة (الأخطاء / التسلل)', 'Évalue la précision du sifflet dans les fautes et les hors-jeu, la clarté du son, le timing et la cohérence.', 'تقييم دقّة الصافرة في الأخطاء وحالات التسلل، وضوح الصوت، التوقيت، وانسجام التدخلات.', '2025-11-17 13:41:31'),
('var_qualite', 'var', 'VAR', 'VAR quality', 'استخدام تقنية الفار', 'Analyse la qualité des interventions VAR, la rapidité, la clarté et le respect du protocole.', 'تحليل جودة تدخلات الفار، السرعة، وضوح القرار، واحترام بروتوكول الفار.', '2025-11-17 13:41:31');

-- --------------------------------------------------------

--
-- Table structure for table `federations`
--

CREATE TABLE `federations` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `code` varchar(8) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `nom_en` varchar(255) DEFAULT NULL,
  `nom_ar` varchar(255) DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `federations`
--

INSERT INTO `federations` (`id`, `code`, `nom`, `nom_en`, `nom_ar`, `logo_url`, `is_active`, `created_at`) VALUES
('0474fb65-cf01-4229-8d69-b18525f8c1d3', 'TUN', 'Fédération Tunisienne de Football', 'Tunisian Football Federation', 'الجامعة التونسية لكرة القدم', '/uploads/federations/federation-1763923159335.png', 1, '2025-11-17 13:41:31'),
('3eecbb7c-fb3c-4d2d-989b-1eb01f21cae0', 'FRA', 'Fédération Française de Football', 'French Football Federation', 'الاتحاد الفرنسي لكرة القدم', '/uploads/federations/images-1763763822564.jpg', 0, '2025-11-17 13:41:31'),
('9164f5ff-51f2-4768-8a2d-8cdb43e5c203', 'ARABE', 'Union arabe de football', 'Arab Football Union', 'الاتحاد العربي لكرة القدم', '/uploads/federations/arabe-1764156710462.png', 0, '2025-11-26 11:25:27');

-- --------------------------------------------------------

--
-- Table structure for table `Fine`
--

CREATE TABLE `Fine` (
  `id` varchar(191) NOT NULL,
  `type` enum('CARD','VIRAGE','DIRECTOR','DISCIPLINARY') NOT NULL,
  `amount` decimal(10,3) NOT NULL,
  `reasonFr` varchar(191) NOT NULL,
  `reasonAr` varchar(191) DEFAULT NULL,
  `playerId` varchar(191) DEFAULT NULL,
  `cardId` varchar(191) DEFAULT NULL,
  `directorNameFr` varchar(191) DEFAULT NULL,
  `directorNameAr` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','PAID','OVERDUE') NOT NULL DEFAULT 'PENDING',
  `paidAt` datetime(3) DEFAULT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `teamId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Fine`
--

INSERT INTO `Fine` (`id`, `type`, `amount`, `reasonFr`, `reasonAr`, `playerId`, `cardId`, `directorNameFr`, `directorNameAr`, `status`, `paidAt`, `dueDate`, `createdAt`, `teamId`) VALUES
('cmn7w4ppz0001j5ygoqqin62i', 'CARD', 30.000, 'Frais carton YELLOW', NULL, 'ob-m3', 'cmn7w4ppv0000j5ygi94a5wzb', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 18:53:54.718', '2026-03-26 19:53:54.733', 'team-ob'),
('cmn7woohj0001c9yg367n6wcg', 'CARD', 30.000, 'Frais carton YELLOW', NULL, 'ob-m3', 'cmn7woohf0000c9ygzhn3ixow', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 19:09:26.233', '2026-03-26 20:09:26.256', 'team-ob'),
('cmn7wqx450003c9ygdmi7hlxm', 'CARD', 30.000, 'Frais carton YELLOW', NULL, 'ob-d5', 'cmn7wqx420002c9yghkkq29n8', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 19:11:10.752', '2026-03-26 20:11:10.752', 'team-ob'),
('cmn7wx4b60005c9ygx38fuw3r', 'CARD', 30.000, 'Frais carton YELLOW', NULL, 'ob-m3', 'cmn7wx4ab0004c9yg9i86almb', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 19:15:59.897', '2026-03-26 20:15:59.964', 'team-ob'),
('cmn7x1zod0009c9ygp8r35u9z', 'CARD', 30.000, 'Frais carton YELLOW', NULL, 'ob-d2', 'cmn7x1zo80008c9ygmhd2fhns', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 19:19:47.285', '2026-03-26 20:19:47.286', 'team-ob'),
('cmn7x2k4r000cc9ygnvf4pt01', 'CARD', 30.000, 'Frais carton YELLOW', NULL, 'ob-d2', 'cmn7x2k4o000bc9ygewjq84i8', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 19:20:13.797', '2026-03-26 20:20:13.798', 'team-ob'),
('cmn7x2vrr000gc9yg9trchl9g', 'CARD', 30.000, 'Frais carton YELLOW', NULL, 'ob-d2', 'cmn7x2vro000fc9yglqseegcu', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 19:20:28.882', '2026-03-26 20:20:28.883', 'team-ob'),
('fine-dir-j9', 'DIRECTOR', 150.000, 'Envahissement du terrain par un dirigeant en fin de match — J9 vs ESS', 'اقتحام الملعب من قبل مسؤول في نهاية المباراة — ج9 ضد النجم الساحلي', NULL, NULL, 'Hedi Benali', 'هادي بن علي', 'OVERDUE', NULL, '2026-04-15 18:49:51.072', '2026-03-26 19:49:51.072', 'team-ob'),
('fine-j10-jaune', 'CARD', 30.000, '3ème carton jaune — 3e avertissement cumulatif (Fadhli)', 'البطاقة الصفراء الثالثة — الإنذار التراكمي الثالث (فضلي)', 'ob-21', 'card-j10-2', NULL, NULL, 'OVERDUE', NULL, '2026-04-10 18:49:51.065', '2026-03-26 19:49:51.066', 'team-ob'),
('fine-j5-rouge', 'CARD', 50.000, 'Carton rouge J5 vs CAB — faute grossière', 'بطاقة حمراء ج5 ضد النادي الرياضي البنزرتي — خطأ جسيم', 'ob-23', 'card-j5-1', NULL, NULL, 'PAID', '2025-09-20 00:00:00.000', '2025-09-28 00:00:00.000', '2026-03-26 19:49:51.063', 'team-ob'),
('fine-virage-j3', 'VIRAGE', 200.000, 'Banderole non conforme aux règlements — J3', 'لافتة مخالفة للوائح — الجولة 3', NULL, NULL, NULL, NULL, 'PAID', '2025-09-01 00:00:00.000', '2025-09-10 00:00:00.000', '2026-03-26 19:49:51.070', 'team-ob'),
('fine-virage-j7', 'VIRAGE', 500.000, 'Comportement des supporters — jets de projectiles J7 vs CA Déplacement Tunis', 'سلوك المشجعين — رمي مقذوفات ج7 ضد النادي الأفريقي خارج أرضنا', NULL, NULL, NULL, NULL, 'OVERDUE', NULL, '2026-04-25 18:49:51.067', '2026-03-26 19:49:51.068', 'team-ob');

-- --------------------------------------------------------

--
-- Table structure for table `journees`
--

CREATE TABLE `journees` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `saison_id` char(36) NOT NULL,
  `numero` int(11) DEFAULT NULL,
  `nom_fr` varchar(255) DEFAULT NULL,
  `nom_en` varchar(255) DEFAULT NULL,
  `nom_ar` varchar(255) DEFAULT NULL,
  `date_journee` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `journees`
--

INSERT INTO `journees` (`id`, `saison_id`, `numero`, `nom_fr`, `nom_en`, `nom_ar`, `date_journee`, `created_at`) VALUES
('014d9162-1d24-4e83-8bad-476a2a4e69ff', 'eb7ed626-93dc-4ac1-9ec5-24d41aaf70cb', NULL, 'Journée 1', 'Round 1', 'الجولة 1 ', '2025-12-01', '2025-11-27 13:58:16'),
('01d720af-d115-4a77-9dc6-25650edf54b4', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 23, NULL, NULL, NULL, '2026-03-21', '2025-11-17 13:41:31'),
('032d5376-ce87-485a-b5f0-69e2ae5963b8', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 12, NULL, NULL, NULL, '2025-11-01', '2025-11-17 13:41:31'),
('04832252-8f8a-41e4-8a34-c9a92e5763c4', '7fbaaf72-a912-4644-bce4-973f34fe964b', 25, NULL, NULL, NULL, '2027-05-22', '2026-08-01 22:22:00'),
('077425c1-9605-4e05-b518-df7f442ac8af', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 11, NULL, NULL, NULL, '2025-10-25', '2025-11-17 13:41:31'),
('091b2a62-704a-4a70-a3dd-01befbcfe456', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 19, NULL, NULL, NULL, '2026-02-21', '2025-11-17 13:41:31'),
('1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', '7fbaaf72-a912-4644-bce4-973f34fe964b', 6, NULL, NULL, NULL, '2026-09-26', '2026-08-01 22:22:00'),
('12e13f25-9435-4305-8baa-4cfd58491cb9', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 10, NULL, NULL, NULL, '2025-10-18', '2025-11-17 13:41:31'),
('16dd7826-a16e-45d9-acfa-b0f9dd4d7d66', '42aa25f1-0796-4981-ad84-b79b383502c9', 2, NULL, NULL, NULL, '2025-08-25', '2025-11-17 13:41:31'),
('1868b8fc-2b8c-4e86-b764-758495557dd9', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 7, NULL, NULL, NULL, '2025-09-20', '2025-11-17 13:41:31'),
('1b150c46-c9a4-4dd4-b231-47e98a0f97af', '68f85e02-adca-47e4-9b9b-4f1731156063', 1, NULL, NULL, NULL, '2025-09-12', '2025-11-17 13:41:31'),
('1f17186a-ea65-4503-b76f-c3a968ce5a63', '42aa25f1-0796-4981-ad84-b79b383502c9', 3, NULL, NULL, NULL, '2025-09-01', '2025-11-17 13:41:31'),
('20d2ea1f-a97a-48ad-afe7-69ae69ee9dd4', '68f85e02-adca-47e4-9b9b-4f1731156063', 3, NULL, NULL, NULL, '2025-09-26', '2025-11-17 13:41:31'),
('23d3e6b5-0f3d-446b-a492-8b7685036c8f', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 5, NULL, NULL, NULL, '2025-09-11', '2025-11-17 13:41:31'),
('244c6b6b-ec7c-43f8-bfda-41cd871352d9', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 30, NULL, NULL, NULL, '2026-05-09', '2025-11-17 13:41:31'),
('245e3def-0365-4557-823d-d7c102ea08cd', '7fbaaf72-a912-4644-bce4-973f34fe964b', 11, NULL, NULL, NULL, '2026-10-31', '2026-08-01 22:22:00'),
('27633172-2183-4d4f-8b5a-f75a43943f98', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 3, NULL, NULL, NULL, '2025-08-21', '2025-11-17 13:41:31'),
('27e5265f-b6c2-4818-a9e1-f32e528d386a', '7fbaaf72-a912-4644-bce4-973f34fe964b', 5, NULL, NULL, NULL, '2026-09-19', '2026-08-01 22:22:00'),
('3666ccca-906a-467f-ae78-3f70c206cdf8', '7fbaaf72-a912-4644-bce4-973f34fe964b', 17, NULL, NULL, NULL, '2027-01-23', '2026-08-01 22:22:00'),
('4133dea6-9a9f-44f8-b85a-de2cad05a067', '7fbaaf72-a912-4644-bce4-973f34fe964b', 12, NULL, NULL, NULL, '2026-11-07', '2026-08-01 22:22:00'),
('441cbe9e-688f-41d0-8020-49cb9053d8ed', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 22, NULL, NULL, NULL, '2026-03-14', '2025-11-17 13:41:31'),
('4609f010-05c6-4a02-ac76-54150e41b056', '42aa25f1-0796-4981-ad84-b79b383502c9', 7, NULL, NULL, NULL, '2025-11-23', '2025-11-23 10:06:25'),
('465ebab2-0638-436e-8df5-48755893c6d4', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 2, NULL, NULL, NULL, '2025-08-15', '2025-11-17 13:41:31'),
('49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', '7fbaaf72-a912-4644-bce4-973f34fe964b', 16, NULL, NULL, NULL, '2027-01-16', '2026-08-01 22:22:00'),
('4c877f82-7b81-4702-91df-d68194333714', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 14, NULL, NULL, NULL, '2025-11-08', '2025-11-17 13:41:31'),
('4c97e3c0-5e89-41c7-af0e-15d97eca724e', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 24, NULL, NULL, NULL, '2026-03-28', '2025-11-17 13:41:31'),
('5580cfd7-a665-492d-b59d-c47f5961b4fa', '7fbaaf72-a912-4644-bce4-973f34fe964b', 13, NULL, NULL, NULL, '2026-11-14', '2026-08-01 22:22:00'),
('56c431fd-bbbf-4ac2-b0aa-846a9a83f96a', '42aa25f1-0796-4981-ad84-b79b383502c9', 5, NULL, NULL, NULL, '2025-09-15', '2025-11-17 13:41:31'),
('56eae259-ab24-47f8-be6e-464497492264', '68f85e02-adca-47e4-9b9b-4f1731156063', 2, NULL, NULL, NULL, '2025-09-19', '2025-11-17 13:41:31'),
('635d7d15-1fab-4fe8-99bf-f8864c7f2cee', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 13, NULL, NULL, NULL, '2025-11-04', '2025-11-17 13:41:31'),
('64be10f9-eba3-4c9f-8ab6-3f2da5731ee1', 'baee982f-4bd7-450e-ad1f-7f12eeeb3fe3', 3, NULL, NULL, NULL, '2025-09-08', '2025-11-17 13:41:31'),
('657031ab-4ed7-4009-8f63-22882d5560eb', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 28, NULL, NULL, NULL, '2026-04-25', '2025-11-17 13:41:31'),
('6993f748-709d-46ad-be83-e0acaa3f783b', '7fbaaf72-a912-4644-bce4-973f34fe964b', 30, NULL, NULL, NULL, '2027-06-26', '2026-08-01 22:22:00'),
('6a53bc9d-1a6d-4055-be5d-75e7cec5d252', '7fbaaf72-a912-4644-bce4-973f34fe964b', 21, NULL, NULL, NULL, '2027-02-20', '2026-08-01 22:22:00'),
('6a824526-4436-47df-84a9-1a9d2862090a', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 6, NULL, NULL, NULL, '2025-09-16', '2025-11-17 13:41:31'),
('6e193b48-5127-416c-be0f-2fe6b2f12eb5', '7fbaaf72-a912-4644-bce4-973f34fe964b', 26, NULL, NULL, NULL, '2027-05-29', '2026-08-01 22:22:00'),
('71cfe4d0-3264-4560-8f2e-179f6116f1e7', '7fbaaf72-a912-4644-bce4-973f34fe964b', 28, NULL, NULL, NULL, '2027-06-12', '2026-08-01 22:22:00'),
('826630ec-47cf-41c3-931f-1e3a91f298db', '42aa25f1-0796-4981-ad84-b79b383502c9', 1, NULL, NULL, NULL, '2025-08-18', '2025-11-17 13:41:31'),
('8359d667-7a80-4618-92fb-e9f6312f034b', 'baee982f-4bd7-450e-ad1f-7f12eeeb3fe3', 4, NULL, NULL, NULL, '2025-09-15', '2025-11-17 13:41:31'),
('855043e7-f2ee-40ac-a4e4-5a04127b7f5a', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 9, NULL, NULL, NULL, '2025-10-03', '2025-11-17 13:41:31'),
('889b7aac-1a2d-4e6d-b9ff-af5bf4572f7a', 'baee982f-4bd7-450e-ad1f-7f12eeeb3fe3', 5, NULL, NULL, NULL, '2025-09-22', '2025-11-17 13:41:31'),
('8ff543c1-8832-4f51-968d-88131f54b876', '7fbaaf72-a912-4644-bce4-973f34fe964b', 9, NULL, NULL, NULL, '2026-10-17', '2026-08-01 22:22:00'),
('90aec0dc-59cb-46e2-be30-2eddf4330168', '7fbaaf72-a912-4644-bce4-973f34fe964b', 10, NULL, NULL, NULL, '2026-10-24', '2026-08-01 22:22:00'),
('97ab705c-74bb-474b-87da-3b06c5b655f7', 'baee982f-4bd7-450e-ad1f-7f12eeeb3fe3', 1, NULL, NULL, NULL, '2025-08-25', '2025-11-17 13:41:31'),
('98a129dc-eec0-45b1-be0d-af704a6cc21d', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 15, NULL, NULL, NULL, '2025-11-22', '2025-11-17 13:41:31'),
('9afcdf84-bc27-4312-aece-2b05a5afbbc3', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 26, NULL, NULL, NULL, '2026-04-11', '2025-11-17 13:41:31'),
('9c68a0d1-53d0-45e4-858f-5c86a7c9254e', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 27, NULL, NULL, NULL, '2026-04-18', '2025-11-17 13:41:31'),
('9f198c9a-6da1-4660-9b8a-6123290922fe', '68f85e02-adca-47e4-9b9b-4f1731156063', 5, NULL, NULL, NULL, '2025-10-10', '2025-11-17 13:41:31'),
('a05810fa-710e-4655-b52c-b8d2f87aa454', '7fbaaf72-a912-4644-bce4-973f34fe964b', 18, NULL, NULL, NULL, '2027-01-30', '2026-08-01 22:22:00'),
('a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', '7fbaaf72-a912-4644-bce4-973f34fe964b', 15, NULL, NULL, NULL, '2026-11-28', '2026-08-01 22:22:00'),
('a63610d6-c62c-4ac5-ae51-47c261120270', '7fbaaf72-a912-4644-bce4-973f34fe964b', 22, NULL, NULL, NULL, '2027-02-27', '2026-08-01 22:22:00'),
('ab2907dc-e76c-4d53-aa9b-2b6a739e2c18', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 31, NULL, NULL, NULL, '2026-01-29', '2025-11-26 11:19:25'),
('b3715c77-739f-4023-8f11-c19f52d1ee82', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 4, NULL, NULL, NULL, '2025-08-27', '2025-11-17 13:41:31'),
('b39f0dc7-2a7b-400a-8618-97f34a50009c', 'baee982f-4bd7-450e-ad1f-7f12eeeb3fe3', 2, NULL, NULL, NULL, '2025-09-01', '2025-11-17 13:41:31'),
('b66b24f3-5dd3-4c32-b71d-9e56fec97242', '7fbaaf72-a912-4644-bce4-973f34fe964b', 20, NULL, NULL, NULL, '2027-02-13', '2026-08-01 22:22:00'),
('b7c48021-d42c-4fab-a0c3-0f79e89c17cf', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 29, NULL, NULL, NULL, '2026-05-02', '2025-11-17 13:41:31'),
('bd37911e-d31b-4cd9-a468-ee841468b671', '7fbaaf72-a912-4644-bce4-973f34fe964b', 14, NULL, NULL, NULL, '2026-11-21', '2026-08-01 22:22:00'),
('bedef8cd-e26b-43fd-9e2b-647cd6836af7', '7fbaaf72-a912-4644-bce4-973f34fe964b', 29, NULL, NULL, NULL, '2027-06-19', '2026-08-01 22:22:00'),
('bfa3d876-7d45-453a-839f-c05cbf193d79', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 18, NULL, NULL, NULL, '2026-02-14', '2025-11-17 13:41:31'),
('c02ae96e-f9b5-4d84-9018-7ef99732d29c', '42aa25f1-0796-4981-ad84-b79b383502c9', 4, NULL, NULL, NULL, '2025-09-08', '2025-11-17 13:41:31'),
('c19ea472-8fe4-420c-a753-2bf209fd1c0d', '7fbaaf72-a912-4644-bce4-973f34fe964b', 24, NULL, NULL, NULL, '2027-05-15', '2026-08-01 22:22:00'),
('c24b8973-8bb3-4747-be78-8fd56c09eafc', '7fbaaf72-a912-4644-bce4-973f34fe964b', 8, NULL, NULL, NULL, '2026-10-10', '2026-08-01 22:22:00'),
('c862ff7a-4491-4ea9-8b49-822e25ee0766', '68f85e02-adca-47e4-9b9b-4f1731156063', 4, NULL, NULL, NULL, '2025-10-03', '2025-11-17 13:41:31'),
('ce9c4944-7287-46da-8272-622e080926cf', '7fbaaf72-a912-4644-bce4-973f34fe964b', 2, NULL, NULL, NULL, '2026-08-29', '2026-08-01 22:22:00'),
('d1f73515-9fff-4259-932f-2d8b0707c09e', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 20, NULL, NULL, NULL, '2026-02-28', '2025-11-17 13:41:31'),
('db2cd558-8f6c-43a5-84d1-2a397a193b4f', '7fbaaf72-a912-4644-bce4-973f34fe964b', 27, NULL, NULL, NULL, '2027-06-05', '2026-08-01 22:22:00'),
('e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 17, NULL, NULL, NULL, '2026-02-07', '2025-11-17 13:41:31'),
('e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 25, NULL, NULL, NULL, '2026-04-04', '2025-11-17 13:41:31'),
('e34504f1-91ce-42a4-8b04-d954315024a6', '7fbaaf72-a912-4644-bce4-973f34fe964b', 19, NULL, NULL, NULL, '2027-02-06', '2026-08-01 22:22:00'),
('e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 1, NULL, NULL, NULL, '2025-08-09', '2025-11-17 13:41:31'),
('e917bd56-fe29-44d6-a2d7-c5171f3835b5', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 8, NULL, NULL, NULL, '2025-09-26', '2025-11-17 13:41:31'),
('eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', '7fbaaf72-a912-4644-bce4-973f34fe964b', 3, NULL, NULL, NULL, '2026-09-05', '2026-08-01 22:22:00'),
('eb9de900-0b3e-41e3-8cfb-078357bee420', '7fbaaf72-a912-4644-bce4-973f34fe964b', 23, NULL, NULL, NULL, '2027-05-08', '2026-08-01 22:22:00'),
('f1644655-e073-4239-b9dd-8d8d7447945d', '7fbaaf72-a912-4644-bce4-973f34fe964b', 1, NULL, NULL, NULL, '2026-08-22', '2026-08-01 22:22:00'),
('f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', '7fbaaf72-a912-4644-bce4-973f34fe964b', 4, NULL, NULL, NULL, '2026-09-12', '2026-08-01 22:22:00'),
('fbdcd54f-71ba-4654-aee1-0d0e7f63e548', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 16, NULL, NULL, NULL, '2026-01-31', '2025-11-17 13:41:31'),
('fd2bc658-c54f-4d71-8c99-5027522055e6', '7fbaaf72-a912-4644-bce4-973f34fe964b', 7, NULL, NULL, NULL, '2026-10-03', '2026-08-01 22:22:00'),
('ff2855a7-f8d2-45d5-9134-d1016c6108cd', 'eceda276-b6a0-45af-aa67-a15b10f5d5db', 21, NULL, NULL, NULL, '2026-03-07', '2025-11-17 13:41:31'),
('md-2526-j1', 'season-2526', 1, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j10', 'season-2526', 10, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j11', 'season-2526', 11, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j12', 'season-2526', 12, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j13', 'season-2526', 13, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j14', 'season-2526', 14, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j15', 'season-2526', 15, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j16', 'season-2526', 16, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j17', 'season-2526', 17, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j18', 'season-2526', 18, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j19', 'season-2526', 19, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j2', 'season-2526', 2, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j20', 'season-2526', 20, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j21', 'season-2526', 21, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j22', 'season-2526', 22, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j23', 'season-2526', 23, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j24', 'season-2526', 24, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j25', 'season-2526', 25, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j26', 'season-2526', 26, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j27', 'season-2526', 27, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j28', 'season-2526', 28, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j29', 'season-2526', 29, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j3', 'season-2526', 3, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j30', 'season-2526', 30, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j4', 'season-2526', 4, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j5', 'season-2526', 5, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j6', 'season-2526', 6, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j7', 'season-2526', 7, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j8', 'season-2526', 8, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2526-j9', 'season-2526', 9, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j1', 'season-2627', 1, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j10', 'season-2627', 10, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j11', 'season-2627', 11, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j12', 'season-2627', 12, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j13', 'season-2627', 13, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j14', 'season-2627', 14, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j15', 'season-2627', 15, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j2', 'season-2627', 2, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j3', 'season-2627', 3, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j4', 'season-2627', 4, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j5', 'season-2627', 5, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j6', 'season-2627', 6, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j7', 'season-2627', 7, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j8', 'season-2627', 8, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57'),
('md-2627-j9', 'season-2627', 9, NULL, NULL, NULL, NULL, '2026-08-02 13:37:57');

-- --------------------------------------------------------

--
-- Table structure for table `ligues`
--

CREATE TABLE `ligues` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `federation_id` char(36) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `nom_en` varchar(255) DEFAULT NULL,
  `nom_ar` varchar(255) DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `ligues`
--

INSERT INTO `ligues` (`id`, `federation_id`, `nom`, `nom_en`, `nom_ar`, `logo_url`, `is_active`, `created_at`) VALUES
('2136aa04-3718-4a2d-8ed0-54ad6f38033c', '0474fb65-cf01-4229-8d69-b18525f8c1d3', 'Ligue Professionnelle 1', 'Tunisian Ligue 1', 'الرابطة المحترفة الأولى', '/uploads/leagues/l1-1763763887754.png', 1, '2025-11-17 13:41:31'),
('33fa5498-99b1-4802-8070-ec4dc42ee039', '3eecbb7c-fb3c-4d2d-989b-1eb01f21cae0', 'Ligue 2', 'Ligue 2 BKT', 'الدوري الفرنسي الدرجة الثانية', '/uploads/leagues/f2-1763763993095.png', 0, '2025-11-17 13:41:31'),
('46ba1a85-c821-11f0-86aa-56018b9f5d54', '3eecbb7c-fb3c-4d2d-989b-1eb01f21cae0', 'Coupe de France', 'French Cup', 'كأس فرنسا', '/uploads/leagues/coupe_france-1763896498194.png', 0, '2025-11-23 11:12:20'),
('4d929795-b0a2-4db9-8a44-05f8e0d25578', '3eecbb7c-fb3c-4d2d-989b-1eb01f21cae0', 'Ligue 1', 'Ligue 1 Uber Eats', 'الدوري الفرنسي الدرجة الأولى', '/uploads/leagues/f1-1763764025465.webp', 0, '2025-11-17 13:41:31'),
('900ebb49-6af2-401f-b2ce-43f783220830', '0474fb65-cf01-4229-8d69-b18525f8c1d3', 'Ligue Professionnelle 2', 'Tunisian Ligue 2', 'الرابطة المحترفة الثانية', '/uploads/leagues/l2-1763763955691.png', 0, '2025-11-17 13:41:31'),
('b5cb50f8-2a54-4781-a20d-7194cb930098', '9164f5ff-51f2-4768-8a2d-8cdb43e5c203', 'FIFA Arab Cup', 'Coupe arabe de la FIFA, Qatar 2025™', 'كأس العرب FIFA قطر 2025™', '/uploads/leagues/2025_fifa_arab_cup-1764157042268.png', 0, '2025-11-26 11:36:44'),
('comp-coupe', '0474fb65-cf01-4229-8d69-b18525f8c1d3', 'Coupe de Tunisie', NULL, NULL, NULL, 0, '2026-08-02 13:37:57'),
('comp-ligue1', '0474fb65-cf01-4229-8d69-b18525f8c1d3', 'Ligue 1 Professionnelle', NULL, NULL, NULL, 1, '2026-08-02 13:37:57');

-- --------------------------------------------------------

--
-- Table structure for table `matches`
--

CREATE TABLE `matches` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `journee_id` char(36) NOT NULL,
  `equipe_home` char(36) NOT NULL,
  `equipe_away` char(36) NOT NULL,
  `date` datetime DEFAULT NULL,
  `score_home` int(11) DEFAULT NULL,
  `score_away` int(11) DEFAULT NULL,
  `arbitre_id` char(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` enum('UPCOMING','IN_PROGRESS','FINISHED','CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  `illegal_player_used` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `matches`
--

INSERT INTO `matches` (`id`, `journee_id`, `equipe_home`, `equipe_away`, `date`, `score_home`, `score_away`, `arbitre_id`, `created_at`, `status`, `illegal_player_used`) VALUES
('0081c3db-7053-41c3-b023-3988e5f0465b', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('00c2df0a-bb16-4b06-8599-c8fed619f31e', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('00de38ee-73c9-4930-9ce4-7d4387e4a06f', '12e13f25-9435-4305-8baa-4cfd58491cb9', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2025-10-22 16:00:00', 1, 2, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('01635515-1946-47c5-9bbc-e6b6c5f083a7', 'ce9c4944-7287-46da-8272-622e080926cf', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('02d72489-341a-45ee-88dc-342820541b16', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('02d79de8-8f56-4649-a17f-15ffd3b542ae', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-04-04 20:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('03487483-247f-4442-adc1-5e67ac2f0c91', '3666ccca-906a-467f-ae78-3f70c206cdf8', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0391cc56-5a26-4bc1-84f0-81bc7e8c2c1f', 'a63610d6-c62c-4ac5-ae51-47c261120270', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('03c68fb1-f599-4001-87f7-47b0a169df2e', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2026-01-31 14:00:00', NULL, NULL, '527bf814-1273-4c64-9fdf-b04768c87516', '2025-11-17 13:41:31', 'UPCOMING', 0),
('03fb2c10-c4d8-48a7-bb58-f774be913796', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-04-04 19:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('042c829f-1fae-4034-87d2-eaae0260a6e3', '98a129dc-eec0-45b1-be0d-af704a6cc21d', '621863f9-2393-4941-b6a1-a44addcb592c', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2025-11-22 14:00:00', 0, 1, '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '2025-11-17 13:41:31', 'UPCOMING', 0),
('050d18e6-9d25-40bd-be67-3afbc4b1668e', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', '621863f9-2393-4941-b6a1-a44addcb592c', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-05-02 16:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('05be2c38-1521-4871-85bb-d967d42c1d55', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-03-07 17:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('05efcab5-9888-4acf-9605-8580e4e1ee02', 'e34504f1-91ce-42a4-8b04-d954315024a6', '115cb576-f2cf-463c-884b-a0d3c5917b70', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0613f648-783e-4f91-8cb8-4e6d20a0c9cc', '4133dea6-9a9f-44f8-b85a-de2cad05a067', '115cb576-f2cf-463c-884b-a0d3c5917b70', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('071ce187-8f2b-40b1-a6f1-2aa29724d889', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('07e58785-de67-497b-b54d-99ce47c5ae0e', '3666ccca-906a-467f-ae78-3f70c206cdf8', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('08111819-e433-4dec-ad6f-582317a1827a', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-03-28 19:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('08260688-e374-4d08-b38c-094291443346', '3666ccca-906a-467f-ae78-3f70c206cdf8', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('087000c9-a428-4fec-9095-b72fbd5b1d3a', '20d2ea1f-a97a-48ad-afe7-69ae69ee9dd4', 'ea090fa2-b5f0-4858-8dc7-5d601a027895', '9f25c163-ece5-4970-b94d-08940772471f', '2025-09-26 17:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('090d2f4a-fc48-45a8-9908-495d7d8bf4eb', 'f1644655-e073-4239-b9dd-8d8d7447945d', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0a994b44-0023-414b-8f95-383fd1c65b33', '5580cfd7-a665-492d-b59d-c47f5961b4fa', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0b175c5e-cde6-4533-964f-1df2a68385bd', 'd1f73515-9fff-4259-932f-2d8b0707c09e', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-02-28 23:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('0b3c4af0-dc91-41fc-99f2-8afcc8d2c7f0', '8359d667-7a80-4618-92fb-e9f6312f034b', '8a0922d3-063d-409f-9697-175e09069bff', '4887fbc2-6b67-4408-b91a-72b7f855d5ee', '2025-09-15 19:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('0b853c09-2c2a-47fc-bbca-0c0c1e45b312', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0c4cd488-1382-4b87-8d28-a5d73490a8e8', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0c882a44-ef5a-4885-8e80-5f9d1974db20', 'a05810fa-710e-4655-b52c-b8d2f87aa454', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0cd8e97a-60ca-441f-8686-cd5f8b1a5675', 'f1644655-e073-4239-b9dd-8d8d7447945d', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0ce449cf-d71d-412b-b7a1-36ed78b37b37', '8ff543c1-8832-4f51-968d-88131f54b876', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0d65b729-2096-4873-8f46-c76e1fe08828', 'bfa3d876-7d45-453a-839f-c05cbf193d79', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-02-14 22:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('0e248227-1e75-4d92-839a-3365589e8665', '3666ccca-906a-467f-ae78-3f70c206cdf8', '7a7c6ab0-0c98-495d-9237-11de8528535a', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0e6bbcfa-7a52-4970-9968-c522504dae9d', '4133dea6-9a9f-44f8-b85a-de2cad05a067', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('0ec7f5c6-9824-4179-b241-298c2acf02e2', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-01-31 14:00:00', NULL, NULL, '5adfd381-9d2a-4d4d-bc4e-614d6ac12839', '2025-11-17 13:41:31', 'UPCOMING', 0),
('0f1c3d16-4f0e-4d05-99c3-bf48d0856ed1', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-02-07 23:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('10f67fc3-fa13-4a8f-a7a8-a528e07c69b6', '8359d667-7a80-4618-92fb-e9f6312f034b', '7fe5613c-c3c4-4d09-a721-45434df61e1a', '86e638ae-4702-4844-a16a-75c7a5ee8644', '2025-09-15 17:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('11556cce-414c-46ad-88e6-cd0f397b2bec', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-05-09 22:00:00', NULL, NULL, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('12258b94-eaab-4d90-902b-07e89ea6b747', '091b2a62-704a-4a70-a3dd-01befbcfe456', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-02-21 21:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('12e54b04-4904-4947-a3bf-be7000508e7a', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('12f8f902-c7dd-4d01-8fb3-8369e62bbec0', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-03-28 17:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('12fc8c29-f324-4eac-8e22-b1d9237e76d7', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('13793de8-d469-4d73-a275-f93715a0c0fb', '56eae259-ab24-47f8-be6e-464497492264', '9f25c163-ece5-4970-b94d-08940772471f', 'f03f3a80-2164-46f3-b44a-5d63815a77af', '2025-09-19 19:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('1483aa4e-a430-4a9b-82a3-46bfff79d59b', 'bd37911e-d31b-4cd9-a468-ee841468b671', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('1584a5bd-95e5-42dc-a4f2-6a4fc6f19b51', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2026-03-28 16:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('158fbbcb-0d2a-4aaf-806f-21f1aabfa276', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('16a1ffa1-e795-44dd-ad87-bb5573c1b47f', '27633172-2183-4d4f-8b5a-f75a43943f98', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-08-22 17:30:00', 2, 1, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('16f4d0f7-4e8a-410f-8504-b0b21d33a1ef', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-01-31 14:00:00', NULL, NULL, '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '2025-11-17 13:41:31', 'UPCOMING', 0),
('170655b4-1d56-4d6f-9260-85b1d77ab64b', '1868b8fc-2b8c-4e86-b764-758495557dd9', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-09-21 16:30:00', 1, 0, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('17908578-f9d6-46c9-af68-ab7cc556de7e', '657031ab-4ed7-4009-8f63-22882d5560eb', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-04-25 21:00:00', NULL, NULL, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('17b3faf6-85d3-4474-8cf5-a87999547fab', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('17f2a9b6-a7a1-4912-bf87-afd23777ff58', 'a05810fa-710e-4655-b52c-b8d2f87aa454', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('17f6157c-d433-443a-8ca2-03c90fb26fab', '1868b8fc-2b8c-4e86-b764-758495557dd9', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2025-09-24 16:30:00', 2, 0, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('18c4e7a3-e10b-4c43-a83e-ec169277d4a9', '12e13f25-9435-4305-8baa-4cfd58491cb9', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-10-18 16:00:00', 2, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('190d4496-0307-4c9f-ac26-c2d96b229348', '5580cfd7-a665-492d-b59d-c47f5961b4fa', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('19326928-fcd6-4016-a196-1ad7715bfcd0', '465ebab2-0638-436e-8df5-48755893c6d4', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-08-15 17:30:00', 1, 0, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('19c6c089-75af-48c8-b752-11d8de1db3ca', '1b150c46-c9a4-4dd4-b231-47e98a0f97af', 'e1f0dc3f-ff29-46ea-b111-25295a9f263f', '502b7ba7-c302-4f34-8027-a22f0bf9c400', '2025-09-12 15:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('19edad20-a312-4d4a-9135-215edaa7bfec', '01d720af-d115-4a77-9dc6-25650edf54b4', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-03-21 18:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('1a08d399-c0d9-474a-be44-bac4d4d7259f', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('1a2fb61b-2a66-4017-9d54-2eeb0d86ce54', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('1acf759a-34e0-4d01-b722-839a8d1c54c9', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-11-01 14:30:00', 2, 0, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('1bad042f-629d-4562-b78c-2f15785ef74d', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '7a7c6ab0-0c98-495d-9237-11de8528535a', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-04-11 20:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('1bb1476c-c52f-4d58-87a3-2252929b47ba', 'd1f73515-9fff-4259-932f-2d8b0707c09e', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-02-28 22:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('1c041fbc-544c-4468-b38f-9472445a0dd0', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-11-04 14:30:00', 0, 1, '527bf814-1273-4c64-9fdf-b04768c87516', '2025-11-17 13:41:31', 'UPCOMING', 0),
('1cc85cdf-2195-4da6-8bef-a28cbb5eb252', '12e13f25-9435-4305-8baa-4cfd58491cb9', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-10-21 16:00:00', 2, 1, '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('1e46dba0-9f1b-46b9-83b8-ebb71399582b', '245e3def-0365-4557-823d-d7c102ea08cd', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('1e800cfc-f6f8-41b3-93b3-d217f8cb6d63', 'e34504f1-91ce-42a4-8b04-d954315024a6', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('1f25f6d8-9823-464f-b102-a75fdcb30a0d', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('1f652d8f-a50c-4df4-b0de-21574fa0f76d', '077425c1-9605-4e05-b518-df7f442ac8af', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-10-29 14:30:00', 0, 0, '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '2025-11-17 13:41:31', 'UPCOMING', 0),
('20abe641-312c-4e01-9d62-0d33f60a7adb', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-04-11 23:00:00', NULL, NULL, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('20f9e924-f59c-4ef4-8715-d7246f5fd350', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-09-28 16:00:00', 2, 0, '28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', '2025-11-17 13:41:31', 'UPCOMING', 0),
('210cc309-916a-402a-8ef3-95088d22885d', 'fd2bc658-c54f-4d71-8c99-5027522055e6', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('21825493-5de0-442c-a347-b832042ecf7f', 'bd37911e-d31b-4cd9-a468-ee841468b671', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2397ef47-eccc-4a6d-be22-903170aa8dd6', '077425c1-9605-4e05-b518-df7f442ac8af', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-10-29 14:30:00', 0, 0, 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '2025-11-17 13:41:31', 'UPCOMING', 0),
('23cb056c-f9c4-4045-b537-58667725fd8c', '889b7aac-1a2d-4e6d-b9ff-af5bf4572f7a', '1f2195f5-d123-4d96-9d95-1f99ec96b077', '8a0922d3-063d-409f-9697-175e09069bff', '2025-09-22 17:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('251713d1-d729-484d-bd6f-c63a708073a1', '245e3def-0365-4557-823d-d7c102ea08cd', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('254d8497-2f4e-43e1-b873-6169acd3709c', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', '621863f9-2393-4941-b6a1-a44addcb592c', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-04-18 16:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('25543654-4968-4cd9-8357-f6c0eaa34da7', 'b3715c77-739f-4023-8f11-c19f52d1ee82', '7a7c6ab0-0c98-495d-9237-11de8528535a', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-08-27 17:30:00', 0, 3, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2600d773-d706-4eef-a87c-25b52b4eb035', '6993f748-709d-46ad-be83-e0acaa3f783b', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2678b7fb-8dfd-4cb1-909a-3a3f50f8f1e7', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('26bc8e07-f449-422f-a41a-29e732c9475f', 'a63610d6-c62c-4ac5-ae51-47c261120270', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('273fba36-30da-4f98-907e-3eaee90bb800', '465ebab2-0638-436e-8df5-48755893c6d4', '115cb576-f2cf-463c-884b-a0d3c5917b70', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-08-16 17:30:00', 1, 0, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2787539a-d5ca-491e-884e-f22f9b0f7f8c', '014d9162-1d24-4e83-8bad-476a2a4e69ff', 'c45f9ece-db4f-4f47-8511-29a8d59d69c5', '68bf3318-3455-476f-b8ae-7ccb80cf14c6', '2025-12-01 15:30:00', NULL, NULL, NULL, '2025-11-27 14:30:50', 'UPCOMING', 0),
('2825531f-dd51-4f1c-9912-f34ca41a6aac', '4133dea6-9a9f-44f8-b85a-de2cad05a067', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2867d5c3-d84b-48f4-864c-16c77d966027', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-05-08 23:00:00', NULL, NULL, 'b39c9bf9-ba79-4df1-a184-370e490f66a0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2868326d-704f-4df9-8a1b-cf21dfa32fe8', '441cbe9e-688f-41d0-8020-49cb9053d8ed', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-03-14 20:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('288c7fbb-e9ab-4f3b-9026-6c406e25f1de', '1f17186a-ea65-4503-b76f-c3a968ce5a63', '14a6c0a7-dc5e-4546-b463-f1ae55737400', 'bf490bff-8278-49bd-868f-030a7243ad42', '2025-09-01 17:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2959857c-ece2-42b8-a2e1-63d50065443e', '90aec0dc-59cb-46e2-be30-2eddf4330168', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2967a2ad-04b9-4baf-b75d-feef4a0a6577', '01d720af-d115-4a77-9dc6-25650edf54b4', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-03-21 17:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2977e90b-acf8-4aa7-9a0e-77956f96b12d', 'b3715c77-739f-4023-8f11-c19f52d1ee82', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-08-27 17:30:00', 0, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('298668f8-5447-473b-9232-45e8d083d966', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', '621863f9-2393-4941-b6a1-a44addcb592c', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2025-08-09 17:30:00', 1, 0, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('299fe9c5-ff46-4ef7-8f45-5f86ef64751a', 'a05810fa-710e-4655-b52c-b8d2f87aa454', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('29eb4834-09c0-4b6d-a3b5-ab509a065538', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', '621863f9-2393-4941-b6a1-a44addcb592c', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-03-07 16:00:00', NULL, NULL, '5adfd381-9d2a-4d4d-bc4e-614d6ac12839', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2ad280e6-f52a-432a-a8ac-89a9c9185abe', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-10-03 16:00:00', 0, 1, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2ad5e5fb-aad8-4b71-87bb-c0e9bfed2ff1', 'fd2bc658-c54f-4d71-8c99-5027522055e6', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2b36ae7b-1df0-4c53-be61-d235951934f5', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-09-11 17:00:00', 0, 0, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2ca7f18c-bee5-4005-837a-ef8469adab12', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2d617394-d5db-4e88-8217-6dad9f301662', 'a63610d6-c62c-4ac5-ae51-47c261120270', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2dbf5241-061d-432f-bdbd-f08fba1f13bd', '077425c1-9605-4e05-b518-df7f442ac8af', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-10-26 14:30:00', 0, 3, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2ef9f081-85f8-49e8-98d5-a33c16461f4e', 'eb9de900-0b3e-41e3-8cfb-078357bee420', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('2f308ddc-f42f-4a6e-b2f6-9068f1c7f26c', '97ab705c-74bb-474b-87da-3b06c5b655f7', '06baf8dd-851e-4f44-8c0c-b72aedabb9b1', '8a0922d3-063d-409f-9697-175e09069bff', '2025-08-25 15:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('2fe018d6-7095-4e88-89db-4f52a231f793', '98a129dc-eec0-45b1-be0d-af704a6cc21d', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-11-22 14:00:00', 1, 1, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('3047f1ee-b2d0-4d00-8cc4-c580a4186fd8', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2025-11-01 14:30:00', 2, 0, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('30543291-4083-4b05-8d65-9d51cda751fd', '8ff543c1-8832-4f51-968d-88131f54b876', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('30907d01-05bd-476a-9117-d348221f90d4', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-02-07 17:00:00', NULL, NULL, '527bf814-1273-4c64-9fdf-b04768c87516', '2025-11-17 13:41:31', 'UPCOMING', 0),
('309c9d1f-6277-4078-b8fd-352facba710e', '04832252-8f8a-41e4-8a34-c9a92e5763c4', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('30fb259e-f688-4c8b-b732-dc1fb8eaab46', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('314c9e56-dd87-4620-a1ac-a1df0e466490', '077425c1-9605-4e05-b518-df7f442ac8af', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-10-30 14:30:00', 2, 0, '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('3171f27b-f3af-4c67-b0c6-c656335f0845', 'ce9c4944-7287-46da-8272-622e080926cf', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('319ab5b1-7bc0-4c77-bd43-01b87627f302', '1b150c46-c9a4-4dd4-b231-47e98a0f97af', '9f25c163-ece5-4970-b94d-08940772471f', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2025-09-12 19:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('32ca14ee-28cc-44f5-b5ef-7e9a839c5faf', '6993f748-709d-46ad-be83-e0acaa3f783b', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('32d55a97-0e60-4cee-acfb-6512a6c6f125', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-11-06 14:30:00', 0, 0, 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '2025-11-17 13:41:31', 'UPCOMING', 0),
('3327abc8-bdae-46e2-9fcd-da613915e013', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-05-09 18:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('33576bf2-3a85-4e15-9249-47dd6e8af0aa', '4c877f82-7b81-4702-91df-d68194333714', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2025-11-09 14:00:00', 0, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('34d70e56-74fd-49ad-a39e-6b66f9a48127', '6a824526-4436-47df-84a9-1a9d2862090a', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-09-16 16:30:00', 2, 3, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('34f62f90-94d1-4d06-878f-579668b4a05b', 'c02ae96e-f9b5-4d84-9018-7ef99732d29c', 'ac880274-5bba-4f9d-bc91-b702f44f3c93', '14a6c0a7-dc5e-4546-b463-f1ae55737400', '2025-09-08 19:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('36170bd3-f328-4076-be5c-398272895ede', '8ff543c1-8832-4f51-968d-88131f54b876', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('362602d8-d4ee-4535-9460-7d148b7ae426', 'b39f0dc7-2a7b-400a-8618-97f34a50009c', '1f2195f5-d123-4d96-9d95-1f99ec96b077', '7fe5613c-c3c4-4d09-a721-45434df61e1a', '2025-09-01 19:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('36413321-6341-4d3b-a53b-2d4b026a0a01', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2025-09-11 17:00:00', 1, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('371cd0e6-c9d8-45a0-aafb-4fd683814f58', '27e5265f-b6c2-4818-a9e1-f32e528d386a', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('37408a04-df28-48b4-83e0-f00c4d708376', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-05-02 18:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('384addb3-e6db-49e4-9176-a5acd7cbb78a', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('385498f9-37aa-4909-9656-52008cf867ce', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-04-18 19:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('38b1205e-7b22-4a6c-82a1-dace75369a9d', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-11-05 14:30:00', 2, 0, '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('3b15e7f4-b5ba-4edd-8194-bf9e7aadcd8a', '6993f748-709d-46ad-be83-e0acaa3f783b', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('3bd1581c-29bb-44f8-ba3b-469d22f4c246', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-01-31 14:00:00', NULL, NULL, '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '2025-11-17 13:41:31', 'UPCOMING', 0),
('3be63bc4-9546-469c-8e37-0307e9360cef', 'ce9c4944-7287-46da-8272-622e080926cf', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('3c7fd6fa-8bed-4b58-9948-7ec16d000d85', '077425c1-9605-4e05-b518-df7f442ac8af', '9af94026-b63c-4689-ad02-8b7bde6fd810', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-10-29 14:30:00', 0, 2, '2bd3e2da-6d16-440e-9973-b2f25068aa61', '2025-11-17 13:41:31', 'UPCOMING', 0),
('3e004246-4796-4d5b-93e4-4d80b9766b78', '5580cfd7-a665-492d-b59d-c47f5961b4fa', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('3ec043af-04ae-46c7-993e-da51f6a1dcdf', 'fd2bc658-c54f-4d71-8c99-5027522055e6', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('3ed3256a-2de7-4a21-822c-236bfd2bacdc', 'eb9de900-0b3e-41e3-8cfb-078357bee420', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('3efdbea3-5727-497a-aaea-b62ccb9384ed', 'b3715c77-739f-4023-8f11-c19f52d1ee82', '115cb576-f2cf-463c-884b-a0d3c5917b70', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-08-28 17:30:00', 1, 1, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('40757057-4076-4c4c-abab-dd1731811f57', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('41033387-147c-418f-a53e-5e6539c56afd', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', '115cb576-f2cf-463c-884b-a0d3c5917b70', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('416056af-d9e0-4741-8ed9-b326a64291de', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('420390d6-3b51-418b-8242-30a7bdc8f2a6', 'eb9de900-0b3e-41e3-8cfb-078357bee420', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('42aee66e-0dce-42cd-9dff-efbc0bcb4977', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-01-31 14:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('439d6eea-e51d-4180-b714-f1aca2b5b8e8', '04832252-8f8a-41e4-8a34-c9a92e5763c4', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('43d0f8b6-021e-4bf8-978a-817936bfb92d', '1868b8fc-2b8c-4e86-b764-758495557dd9', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-09-24 16:30:00', 1, 0, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('43d6b35b-7b2a-4841-86d2-e7d87e0230a3', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', '7a7c6ab0-0c98-495d-9237-11de8528535a', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('4410c2bf-12c7-4afe-a20b-b38d63001a82', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('4446a52b-0fea-497a-acbd-46c4b8318ce5', '657031ab-4ed7-4009-8f63-22882d5560eb', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-04-25 20:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('448dcdd9-8c72-41ae-a2a6-257b46884b99', '8359d667-7a80-4618-92fb-e9f6312f034b', '1f2195f5-d123-4d96-9d95-1f99ec96b077', '06baf8dd-851e-4f44-8c0c-b72aedabb9b1', '2025-09-15 15:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('44c097f9-4a58-409d-975b-e10bb8202819', '27e5265f-b6c2-4818-a9e1-f32e528d386a', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('464b4367-a302-4161-a309-520b06fa30ba', '5580cfd7-a665-492d-b59d-c47f5961b4fa', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('46526327-9411-4cc9-9a05-136b67d23c77', 'ce9c4944-7287-46da-8272-622e080926cf', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('46eef75f-2398-4b68-a044-3f69644a30df', '091b2a62-704a-4a70-a3dd-01befbcfe456', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-02-21 20:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('483261bf-5f58-4a3e-928c-f75dc4032cc7', 'fd2bc658-c54f-4d71-8c99-5027522055e6', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('48c257d8-e2f4-4f49-ad3e-08588643b6e7', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-05-09 19:00:00', NULL, NULL, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('491e5636-03f8-4034-9917-f58fb70e07cf', '8ff543c1-8832-4f51-968d-88131f54b876', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('49bf7510-ac50-4580-afc9-d4d09e8d325f', 'c862ff7a-4491-4ea9-8b49-822e25ee0766', 'f03f3a80-2164-46f3-b44a-5d63815a77af', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2025-10-03 17:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('4a2124af-8525-4f65-8c9a-09b0063fb8b2', 'd1f73515-9fff-4259-932f-2d8b0707c09e', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-02-28 19:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('4a42ffa3-992e-451b-86eb-1e303607a63e', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-04-04 23:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('4a49686e-b530-479c-846c-f4bbf10157dd', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('4b2c30c5-e0ab-4d4b-b00f-b05494343378', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('4bb77de5-7f5c-42c8-ba7d-f950e8b5b5a3', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('4bedc666-0208-4874-b5c8-9f61b4cde4a1', '4c877f82-7b81-4702-91df-d68194333714', '7a7c6ab0-0c98-495d-9237-11de8528535a', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2025-11-08 14:00:00', 1, 1, '2bd3e2da-6d16-440e-9973-b2f25068aa61', '2025-11-17 13:41:31', 'UPCOMING', 0),
('4e72ec90-1658-4927-9f03-d5f00044bed5', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', '115cb576-f2cf-463c-884b-a0d3c5917b70', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('4ece5d57-0c6c-4ca6-9230-b4ec06345de1', 'bfa3d876-7d45-453a-839f-c05cbf193d79', '115cb576-f2cf-463c-884b-a0d3c5917b70', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-02-14 23:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('4eda7cc0-2441-42ea-8aa1-202e3c5f3f56', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2025-09-13 17:00:00', 1, 0, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('4f5bdf1c-1b92-40af-8a1c-75b6a43d0516', '1868b8fc-2b8c-4e86-b764-758495557dd9', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-09-21 16:30:00', 0, 0, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('4fb65a8a-32bb-4768-bfc8-224d23f86cca', 'fd2bc658-c54f-4d71-8c99-5027522055e6', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('50e8b8e8-78d6-4815-9d74-f72eaf80e9a0', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('514a1a93-48ad-4b83-98f2-aa12684c6a4a', '6a824526-4436-47df-84a9-1a9d2862090a', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-09-17 16:30:00', 0, 3, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('52791b9a-512d-497c-8d28-99b1cfd2e081', '90aec0dc-59cb-46e2-be30-2eddf4330168', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('53b36c75-c992-47f0-9221-77017bdc932b', '16dd7826-a16e-45d9-acfa-b0f9dd4d7d66', '14a6c0a7-dc5e-4546-b463-f1ae55737400', '47c1a0c3-e827-4089-95be-29cd8a553fae', '2025-08-25 15:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('53d3edaa-2c09-440a-8658-60e6dfafd2ed', '98a129dc-eec0-45b1-be0d-af704a6cc21d', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-11-23 14:00:00', 1, 2, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5445e852-0eee-4caf-9d7c-afece9db7a1d', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-04-11 16:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5638b57a-dda2-4ab4-ae23-639d66310622', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5689531d-a026-4126-90e8-d480b868d3fe', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('56956e49-d047-41b0-8857-65ec826c04c9', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5725191b-99f9-41b8-b485-e84103e30843', '8ff543c1-8832-4f51-968d-88131f54b876', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5762cf42-23b6-42a6-981b-c1f96a7fcef0', 'eb9de900-0b3e-41e3-8cfb-078357bee420', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('59797c13-8e31-45c1-a43e-812b41abb479', '04832252-8f8a-41e4-8a34-c9a92e5763c4', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('59fe9aa8-439d-4f6b-9440-456465691b97', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5a43e33a-a575-4a2b-8bd4-863361bdad33', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-10-04 16:00:00', 0, 6, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5ae51329-27f0-447f-9888-fff91c1edb65', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', '9af94026-b63c-4689-ad02-8b7bde6fd810', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-03-07 21:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5b4c3ba0-0b8e-4912-8b9f-11b436f8fbf9', 'a63610d6-c62c-4ac5-ae51-47c261120270', '9af94026-b63c-4689-ad02-8b7bde6fd810', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5bd36781-4152-4fe9-8f83-faf91f37bb42', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-05-02 17:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5bdacda2-d88e-40b3-922e-f1cf9ecae51b', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5be9dc6b-eb95-46cb-913d-3ef0dc08c0af', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5ce9d261-fbea-4683-9de3-08f32e727a51', '4133dea6-9a9f-44f8-b85a-de2cad05a067', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5daf1f0f-00f4-4fcf-b0f2-0a84520bca58', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', '115cb576-f2cf-463c-884b-a0d3c5917b70', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-01-31 14:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5dcda32b-fbfa-4c92-b5b1-427f141ced93', 'f1644655-e073-4239-b9dd-8d8d7447945d', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5dd47e8b-f86b-4539-ab17-63d27cb5fa8e', '465ebab2-0638-436e-8df5-48755893c6d4', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-08-15 17:30:00', 1, 1, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5deaff61-84db-439d-8a23-cbe8b855fa9b', 'bfa3d876-7d45-453a-839f-c05cbf193d79', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-02-14 20:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5e230cb7-ec15-4003-a457-d917a76d778f', 'fd2bc658-c54f-4d71-8c99-5027522055e6', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5e3cdb75-9832-4259-9861-4b6f1f2dab6e', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', '621863f9-2393-4941-b6a1-a44addcb592c', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-04-04 16:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5ea16650-ea35-4933-bb5e-be28609a4cf9', '90aec0dc-59cb-46e2-be30-2eddf4330168', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5f31f70a-dde3-496f-91f5-2259242b6d4a', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('5f6b497f-dae1-4053-91e7-5f11fa07288e', '56c431fd-bbbf-4ac2-b0aa-846a9a83f96a', 'f266ee4e-1103-43f0-8386-eb28c0989276', '14a6c0a7-dc5e-4546-b463-f1ae55737400', '2025-09-15 19:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('5f8929d8-5dc8-436c-8aa9-5b83c52e15e7', '245e3def-0365-4557-823d-d7c102ea08cd', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('604f1245-355a-449b-8fa8-3c3390cb8c2b', '56eae259-ab24-47f8-be6e-464497492264', 'ea090fa2-b5f0-4858-8dc7-5d601a027895', 'e1f0dc3f-ff29-46ea-b111-25295a9f263f', '2025-09-19 15:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('609363fa-531e-4e92-985b-379bb5d48cd2', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('60a3c601-98a7-4e89-ab2b-1f4707105f28', '6993f748-709d-46ad-be83-e0acaa3f783b', '115cb576-f2cf-463c-884b-a0d3c5917b70', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6178e1cd-5b8a-4815-b5b2-9435596c5991', '1b150c46-c9a4-4dd4-b231-47e98a0f97af', 'f03f3a80-2164-46f3-b44a-5d63815a77af', 'ea090fa2-b5f0-4858-8dc7-5d601a027895', '2025-09-12 17:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('618015a0-e731-4d23-a748-5f9875d651f1', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0);
INSERT INTO `matches` (`id`, `journee_id`, `equipe_home`, `equipe_away`, `date`, `score_home`, `score_away`, `arbitre_id`, `created_at`, `status`, `illegal_player_used`) VALUES
('6220c17b-828b-42c3-a71f-2cc77182d85b', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6236d576-6e20-4a07-bbd0-8e301e017782', 'bfa3d876-7d45-453a-839f-c05cbf193d79', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2026-02-14 17:00:00', NULL, NULL, '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '2025-11-17 13:41:31', 'UPCOMING', 0),
('62670f22-4c1c-486e-a587-3b0569d2cc55', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('62f3a148-8700-4940-9367-d5730c2b8fd8', '04832252-8f8a-41e4-8a34-c9a92e5763c4', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6313e3c4-d78d-4b8c-ae0a-b7d28e5d9667', '04832252-8f8a-41e4-8a34-c9a92e5763c4', '7a7c6ab0-0c98-495d-9237-11de8528535a', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6425fb1f-ff7c-4e62-8eef-241b14ed90a8', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('642d34bf-270f-4009-aed4-41d20a14fbaa', '657031ab-4ed7-4009-8f63-22882d5560eb', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-04-25 18:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6430c2b4-1181-4fd7-aa61-1875856c3dd2', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-03-07 18:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('64a25e2d-e7d9-4379-89f3-003c6213fef1', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', '9af94026-b63c-4689-ad02-8b7bde6fd810', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2026-04-18 21:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('64e0a93a-ecf1-4081-87fe-96e68a43b513', '245e3def-0365-4557-823d-d7c102ea08cd', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('660c93ff-e2b9-455e-b625-8cae2bd51668', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-04-11 18:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('664d4328-44ee-4b64-b3d9-327bcf2f2f40', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', '115cb576-f2cf-463c-884b-a0d3c5917b70', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2025-09-28 16:00:00', 1, 3, '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('66823e5d-d6af-4043-98f7-275b9050a554', '3666ccca-906a-467f-ae78-3f70c206cdf8', 'dd5d38a9-8da4-11f1-862a-368e37a00996', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6683d9c4-1d9e-49a5-8df9-4bdb0402b3a0', '98a129dc-eec0-45b1-be0d-af704a6cc21d', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-11-23 14:00:00', 0, 1, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('66a6dc68-fee2-455d-9fb0-f06a5ba639be', '4133dea6-9a9f-44f8-b85a-de2cad05a067', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('66b8e33d-1898-4de5-ac1d-4ed5405d9ec7', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-04-11 22:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('69621ee5-ee12-41c1-966d-1e4b4b337c27', '091b2a62-704a-4a70-a3dd-01befbcfe456', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-02-21 16:00:00', NULL, NULL, '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '2025-11-17 13:41:31', 'UPCOMING', 0),
('698ad730-9426-490b-83eb-c6dcb98eb4ad', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6998ed40-83a7-44ba-9637-862f119c53d7', '6993f748-709d-46ad-be83-e0acaa3f783b', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('69b8fcba-85ca-47e2-bbd9-d564db2df4dd', '27633172-2183-4d4f-8b5a-f75a43943f98', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-08-21 17:30:00', 0, 0, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6a1dd9d1-9ff1-4c19-9096-30207ce23dbd', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6a67a0ad-7081-4b3f-95f0-9a6716fd4fe3', '091b2a62-704a-4a70-a3dd-01befbcfe456', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-02-21 18:00:00', NULL, NULL, '5adfd381-9d2a-4d4d-bc4e-614d6ac12839', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6b0d0511-5dac-42d1-af41-f3522e36b1d8', '01d720af-d115-4a77-9dc6-25650edf54b4', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-03-21 22:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6c539b3f-174d-4dfe-b563-251e50d76847', 'eb9de900-0b3e-41e3-8cfb-078357bee420', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6cb6d446-5bf7-476b-a02b-fd89a3cefba7', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2025-08-10 17:30:00', 3, 1, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6d19131f-b493-4ddb-aaba-9bd1c934c3de', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6dd804af-4bc7-4315-83a0-5d913ec3fa30', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-10-04 16:00:00', 0, 0, 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6e7a7d34-afc0-4134-8e4f-77972c63f35d', '27e5265f-b6c2-4818-a9e1-f32e528d386a', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6f75b05a-ce47-415c-927d-2fdb23d77eb3', '01d720af-d115-4a77-9dc6-25650edf54b4', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-03-21 23:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6fa0b7e3-c8b3-4426-8432-1b48b3e03c51', 'f1644655-e073-4239-b9dd-8d8d7447945d', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6fca793d-1ae0-4b8b-a7ca-3e4800133e78', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('6fdaa136-4fb5-4a97-aad8-fb24bf1993e4', 'b3715c77-739f-4023-8f11-c19f52d1ee82', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-08-28 17:30:00', 2, 0, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('6fe1e8a5-cf02-4c29-a356-bb54aa85f673', '5580cfd7-a665-492d-b59d-c47f5961b4fa', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('71153b85-f04b-475c-9db9-f12aa1820876', 'e34504f1-91ce-42a4-8b04-d954315024a6', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('712255f4-95cd-499d-941a-1459a53351d6', 'd1f73515-9fff-4259-932f-2d8b0707c09e', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-02-28 21:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('71780674-fa91-4fef-a283-76802c29aa25', 'bd37911e-d31b-4cd9-a468-ee841468b671', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('71f4a685-7168-4c12-867f-da56b4d1c060', '4c877f82-7b81-4702-91df-d68194333714', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2025-11-08 14:00:00', 1, 1, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7210cefd-b54d-467b-b131-b50dbb791e00', '077425c1-9605-4e05-b518-df7f442ac8af', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2025-10-29 14:30:00', 0, 2, '527bf814-1273-4c64-9fdf-b04768c87516', '2025-11-17 13:41:31', 'UPCOMING', 0),
('721e1b49-78da-44da-b477-542739476d9b', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('731e1249-cd1d-4eb4-9a52-365c6f9ed115', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('7404b231-7b94-4f05-a5fa-c20eb5d57e1f', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-03-07 19:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('74a97b3f-b75e-4080-8f3b-4cff8bbe5127', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', '9af94026-b63c-4689-ad02-8b7bde6fd810', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('74eee976-ede1-4f60-adf7-87a73ef8cbb0', '465ebab2-0638-436e-8df5-48755893c6d4', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2025-08-15 17:30:00', 0, 1, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7507a6a7-f814-4630-9197-4f854136ffe0', 'a63610d6-c62c-4ac5-ae51-47c261120270', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('754987ac-ee9a-4b73-8ae5-0590fa261c8b', '27633172-2183-4d4f-8b5a-f75a43943f98', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2025-08-21 17:30:00', 0, 0, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('758faf45-9b7f-41ea-b886-4db8468ec4c9', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-04-18 22:00:00', NULL, NULL, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('76519eab-594e-4747-9a61-06ef14de5a38', '4133dea6-9a9f-44f8-b85a-de2cad05a067', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('7758d206-42f4-42c5-8084-c59ef41bd45f', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-08-10 17:30:00', 1, 1, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7768bff0-79ce-4dd7-a75b-ab2d5a9694a3', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-10-01 16:30:00', 0, 0, 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '2025-11-17 13:41:31', 'UPCOMING', 0),
('780f14e3-cdd8-4551-80a5-df900f437ae0', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('78d1194d-b301-47f2-9db4-4682127257b3', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('794ab68e-6c97-424b-9ffb-3d71e83279bf', 'c02ae96e-f9b5-4d84-9018-7ef99732d29c', 'e6f9c92f-96c4-4b26-b7d3-17acdc2af701', 'f266ee4e-1103-43f0-8386-eb28c0989276', '2025-09-08 17:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('79f87235-565b-4af4-a167-a0c1c66193bd', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', '9af94026-b63c-4689-ad02-8b7bde6fd810', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-10-05 16:00:00', 2, 0, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7a207688-9f67-4c7b-8ae3-aa86d37f286e', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-05-02 20:00:00', NULL, NULL, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7ada2f8b-d315-4298-a3c5-90a2c467e26f', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', '621863f9-2393-4941-b6a1-a44addcb592c', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-02-07 21:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7b34a45d-8efa-4856-b608-520550b50989', '3666ccca-906a-467f-ae78-3f70c206cdf8', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('7bf0b7c6-7ac3-4994-af6f-84c2a21b28b6', '889b7aac-1a2d-4e6d-b9ff-af5bf4572f7a', '86e638ae-4702-4844-a16a-75c7a5ee8644', '4887fbc2-6b67-4408-b91a-72b7f855d5ee', '2025-09-22 19:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7c081180-e752-4d2d-80e2-8fbc8f921ae4', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-08-09 17:30:00', 0, 0, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7c78a9dc-e779-4ea7-b436-f9735ea1bbb3', '657031ab-4ed7-4009-8f63-22882d5560eb', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-04-25 23:00:00', NULL, NULL, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7dabdeff-8fa8-4623-bb0e-c73661632c48', '1868b8fc-2b8c-4e86-b764-758495557dd9', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2025-09-24 16:30:00', 0, 2, '28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', '2025-11-17 13:41:31', 'UPCOMING', 0),
('7e737e70-dafd-4dc1-a9aa-44cc4cc1435f', 'a05810fa-710e-4655-b52c-b8d2f87aa454', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('7ee7718e-352d-4760-baa0-82148b2ce75e', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2025-10-05 16:00:00', 1, 0, '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '2025-11-17 13:41:31', 'UPCOMING', 0),
('804e34b7-6a2b-4eec-b8ab-e4649c1cff57', '091b2a62-704a-4a70-a3dd-01befbcfe456', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-02-21 23:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('8062d1b8-dc7b-43a7-9de2-1a33bb6433b2', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('80bce5ed-915e-42a7-b57d-2abf5195b063', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-08-09 17:30:00', 1, 0, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('80df95b0-e15f-4702-a49f-7135f1ac78c8', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('819f35c0-9211-414a-b878-dd3fae6c45d9', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2025-11-02 14:30:00', 3, 0, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('81ac87ae-ab93-461c-a023-f161a818c709', '657031ab-4ed7-4009-8f63-22882d5560eb', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-04-25 22:00:00', NULL, NULL, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('838f2a63-563b-402c-8d62-5cd8ad39c9d5', '01d720af-d115-4a77-9dc6-25650edf54b4', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-03-21 19:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('83bb54ba-456e-4864-995f-d34b678e55c5', '20d2ea1f-a97a-48ad-afe7-69ae69ee9dd4', 'e1f0dc3f-ff29-46ea-b111-25295a9f263f', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2025-09-26 15:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('83c3a9b8-17de-4cc2-a3c2-293c33e9ffd2', 'd1f73515-9fff-4259-932f-2d8b0707c09e', '115cb576-f2cf-463c-884b-a0d3c5917b70', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2026-02-28 17:00:00', NULL, NULL, '5adfd381-9d2a-4d4d-bc4e-614d6ac12839', '2025-11-17 13:41:31', 'UPCOMING', 0),
('84a56f83-5040-4491-924e-51ca8e2d57cd', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('84a8f850-bc27-4cfa-8429-1b0c408c653e', '12e13f25-9435-4305-8baa-4cfd58491cb9', '115cb576-f2cf-463c-884b-a0d3c5917b70', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2025-10-22 16:00:00', 0, 0, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('84d540e3-2874-4520-981a-a358ea1a076b', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('852f6563-6205-4cda-b639-6831a3df88cc', '04832252-8f8a-41e4-8a34-c9a92e5763c4', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('85b90800-5b38-4adc-b44e-196f97ade45c', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', '115cb576-f2cf-463c-884b-a0d3c5917b70', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('85f01acc-df62-4749-9fa4-d35bd7dc915f', '64be10f9-eba3-4c9f-8ab6-3f2da5731ee1', '8a0922d3-063d-409f-9697-175e09069bff', '7fe5613c-c3c4-4d09-a721-45434df61e1a', '2025-09-08 19:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('86617448-87b0-4ed5-aacd-57ad4080f344', '5580cfd7-a665-492d-b59d-c47f5961b4fa', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('86853c14-e697-44c0-b76e-bd654e47f5d6', 'e34504f1-91ce-42a4-8b04-d954315024a6', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('873d9ff2-55dd-4e09-b229-a1450b96518a', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('87a8f04d-823a-41d1-af69-5c784258f4af', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('885f7ed9-1d2d-4b38-801a-3d91fdfc8dc2', '465ebab2-0638-436e-8df5-48755893c6d4', '7a7c6ab0-0c98-495d-9237-11de8528535a', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-08-16 17:30:00', 1, 1, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('888fd182-873e-4a76-8958-1984407972c6', '441cbe9e-688f-41d0-8020-49cb9053d8ed', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-03-14 16:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('88ab09c5-334f-4840-ac77-86202f91374a', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('88c2b290-9ec3-4ff4-be9c-59d64dec9560', '27e5265f-b6c2-4818-a9e1-f32e528d386a', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('88dcbbfa-5c8e-4f55-94eb-5079a3fc19d3', '6a824526-4436-47df-84a9-1a9d2862090a', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-09-16 16:30:00', 1, 2, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('89972204-b709-4d36-b8d4-d131e6e5a6a1', 'a63610d6-c62c-4ac5-ae51-47c261120270', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('8b23d021-d3df-4a70-9e14-c400ca2a2bd1', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-09-14 17:00:00', 0, 1, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('8cbb2368-61db-44f5-ae90-5aa6b4bba548', 'e34504f1-91ce-42a4-8b04-d954315024a6', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('8cd3fc37-bf6a-43fe-866d-7db297ede996', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-11-05 14:30:00', 2, 2, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('8cedcba2-27b9-47ae-8ee9-34137d78d6b3', '441cbe9e-688f-41d0-8020-49cb9053d8ed', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-03-14 18:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('8e7426af-cc51-4da3-a165-95b7ea26dd9d', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('8ed4e9ef-6c7e-4cdf-905c-94d1b539914a', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-02-07 18:00:00', NULL, NULL, '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '2025-11-17 13:41:31', 'UPCOMING', 0),
('8ed68488-5c70-4df6-afa8-f6820d05ecce', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('8f23d208-88d9-4ab4-b331-5939f0b0153b', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-05-09 16:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('8f709975-873e-4ecd-a1e2-1ef23b6e370a', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('91548ecd-6941-4960-9175-4667c54ad32c', 'b3715c77-739f-4023-8f11-c19f52d1ee82', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2025-08-28 17:30:00', 2, 0, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('919dc3b8-c072-4c5e-a600-11110916d4ea', 'bd37911e-d31b-4cd9-a468-ee841468b671', '7a7c6ab0-0c98-495d-9237-11de8528535a', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('91e9802e-11ed-418b-84f8-1e85f233fd8d', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-03-07 23:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9228ad25-0218-4839-b307-3b280a0fc87a', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-03-28 22:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('924b18dc-b84b-4546-8b20-53bd0d90cb1d', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2026-05-02 23:00:00', NULL, NULL, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9256f64b-d1d1-4c3f-9085-c5d5798d4b19', 'c862ff7a-4491-4ea9-8b49-822e25ee0766', '9f25c163-ece5-4970-b94d-08940772471f', 'e1f0dc3f-ff29-46ea-b111-25295a9f263f', '2025-10-03 15:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('92ce5fa7-e06c-4824-b173-be998eace7e2', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('92d7c898-db4d-4e0b-be98-daa4d18675dc', '90aec0dc-59cb-46e2-be30-2eddf4330168', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('92e35660-82a8-4ba0-b546-1087e4e21713', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-03-07 22:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('92ec4efa-e745-47f5-bc18-39ff6bc18509', 'e34504f1-91ce-42a4-8b04-d954315024a6', '7a7c6ab0-0c98-495d-9237-11de8528535a', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('93dc4eb8-d7cc-4534-80a2-4a07581c92b2', '1868b8fc-2b8c-4e86-b764-758495557dd9', '9af94026-b63c-4689-ad02-8b7bde6fd810', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-09-24 16:30:00', 1, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('940529ad-a706-4734-8b80-ca852025b089', '091b2a62-704a-4a70-a3dd-01befbcfe456', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-02-21 19:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('94c38011-1bc8-4fc3-a196-0b2beef5a9de', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', 'dd5d38a9-8da4-11f1-862a-368e37a00996', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('97229c16-cf88-4778-8583-414d1c59ec91', 'f1644655-e073-4239-b9dd-8d8d7447945d', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('980db10c-08f1-488c-8c3c-c87c38847edd', '4c877f82-7b81-4702-91df-d68194333714', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-11-09 14:00:00', 0, 0, '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('987047c0-6fd6-434a-8d65-7fa757b8e370', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-04-11 19:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('99751bcb-1087-41c5-8093-f890f35b5dff', 'eb9de900-0b3e-41e3-8cfb-078357bee420', 'dd5d38a9-8da4-11f1-862a-368e37a00996', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('9a5d252e-f895-4f76-b912-8a6085d642ae', '12e13f25-9435-4305-8baa-4cfd58491cb9', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2025-10-19 16:00:00', 2, 0, '2bd3e2da-6d16-440e-9973-b2f25068aa61', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9a9616e2-c670-422f-9d24-7dde9a177b55', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('9ab797ad-b3cc-44f1-a6e4-be7c8eb021df', 'a63610d6-c62c-4ac5-ae51-47c261120270', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('9ae645b1-ca3a-40f0-95e7-5b566a393817', '98a129dc-eec0-45b1-be0d-af704a6cc21d', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-11-26 14:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9af27c7d-5d75-4e5e-8b1e-946ba545e81d', '9f198c9a-6da1-4660-9b8a-6123290922fe', '9f25c163-ece5-4970-b94d-08940772471f', '502b7ba7-c302-4f34-8027-a22f0bf9c400', '2025-10-10 17:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9c2a130b-c966-420b-b70b-8afbdabd151f', '56c431fd-bbbf-4ac2-b0aa-846a9a83f96a', '47c1a0c3-e827-4089-95be-29cd8a553fae', 'e6f9c92f-96c4-4b26-b7d3-17acdc2af701', '2025-09-15 15:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9c377dce-6f4f-4bdf-b52a-ef390b06c911', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-09-26 16:00:00', 2, 1, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9c3bc023-33e0-410e-b9be-ddc38c807b1d', '5580cfd7-a665-492d-b59d-c47f5961b4fa', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('9c70970f-dad7-400a-9275-edba03157b06', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-05-02 21:00:00', NULL, NULL, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9d3ff4c2-c065-4bde-8c24-756e7d60b9be', '6a824526-4436-47df-84a9-1a9d2862090a', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-09-17 16:30:00', 2, 1, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9dbe5f92-677e-4e9e-a4ef-83b22dbe1c12', '27633172-2183-4d4f-8b5a-f75a43943f98', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-08-22 17:30:00', 2, 1, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9e3b823e-5cc2-4573-b659-55efa9e0bd8d', 'eb9de900-0b3e-41e3-8cfb-078357bee420', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('9e80aef6-73dd-4b60-9ae5-7d71d2d49918', 'e34504f1-91ce-42a4-8b04-d954315024a6', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('9e8d31be-6db8-4e77-bce8-b190511b155a', '27633172-2183-4d4f-8b5a-f75a43943f98', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-08-22 17:30:00', 1, 0, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9ea5eeec-074b-47e7-a270-074cae04856f', 'b39f0dc7-2a7b-400a-8618-97f34a50009c', '4887fbc2-6b67-4408-b91a-72b7f855d5ee', '06baf8dd-851e-4f44-8c0c-b72aedabb9b1', '2025-09-01 15:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('9f4636db-4beb-4d55-962c-e1bd0e463acf', 'a63610d6-c62c-4ac5-ae51-47c261120270', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-02-27 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('9fda414f-0140-4640-809b-3a5aa5b4fa99', '6993f748-709d-46ad-be83-e0acaa3f783b', '7a7c6ab0-0c98-495d-9237-11de8528535a', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a049d486-5559-4e2b-a2de-28cc6be307aa', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', '621863f9-2393-4941-b6a1-a44addcb592c', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-10-05 16:00:00', 0, 3, '28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a0827fef-23d1-4277-8501-7fca69a0b3cf', 'ce9c4944-7287-46da-8272-622e080926cf', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a0be1d7d-35f0-4d71-a325-d52a81c97b28', 'bfa3d876-7d45-453a-839f-c05cbf193d79', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-02-14 21:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a120ab33-a048-47db-9aea-049e7c37aae4', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a152b9d5-fbe2-41fb-a988-eba6f8182d09', 'a05810fa-710e-4655-b52c-b8d2f87aa454', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a1d9ff03-1f06-4d43-af9c-7d9a7899730a', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', '9af94026-b63c-4689-ad02-8b7bde6fd810', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a2622b37-dd6e-49e3-a3ac-b03e698632be', '465ebab2-0638-436e-8df5-48755893c6d4', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-08-15 17:30:00', 0, 0, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a3cab115-9797-4657-b90d-6e117b769471', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a3e25954-5728-47e9-87ad-1daeedc0a787', 'bd37911e-d31b-4cd9-a468-ee841468b671', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a3f5121b-33cc-4750-a1b7-9e04dd2a2a67', 'ce9c4944-7287-46da-8272-622e080926cf', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a46160d9-6778-4c99-9b21-bff7b0b48e15', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-04-04 17:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a4ac8aab-299b-4479-b0a1-d6b0e9dadaa8', '8ff543c1-8832-4f51-968d-88131f54b876', '7a7c6ab0-0c98-495d-9237-11de8528535a', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a4d94424-f5cf-4064-b8f3-7e717c1515b0', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-11-02 14:30:00', 0, 0, '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a52305cd-0849-47cb-a120-f90e9757997b', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a59b7534-b188-4073-8d3d-4bb2e915b1b6', 'd1f73515-9fff-4259-932f-2d8b0707c09e', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-02-28 18:00:00', NULL, NULL, '8dbf331c-b981-4929-828b-9bf475943b1d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a5a0530f-805e-4d36-bda0-6b13c12bf95e', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a5cc8349-080f-4667-b8a2-77950db7226a', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('a5e1f425-f5b4-4337-8c25-5672fe9f6ac1', '1f17186a-ea65-4503-b76f-c3a968ce5a63', 'ac880274-5bba-4f9d-bc91-b702f44f3c93', 'e6f9c92f-96c4-4b26-b7d3-17acdc2af701', '2025-09-01 19:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a5fa4b64-9450-423b-8a6f-c9c8176f4f0a', 'c862ff7a-4491-4ea9-8b49-822e25ee0766', '502b7ba7-c302-4f34-8027-a22f0bf9c400', 'ea090fa2-b5f0-4858-8dc7-5d601a027895', '2025-10-03 19:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a710d2c4-a361-4fda-8107-79f6d4efad82', '98a129dc-eec0-45b1-be0d-af704a6cc21d', '115cb576-f2cf-463c-884b-a0d3c5917b70', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-11-22 14:00:00', 3, 0, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a7d3db27-2555-4514-9a53-b0f60ae745da', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-02-07 19:00:00', NULL, NULL, 'b39c9bf9-ba79-4df1-a184-370e490f66a0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a925bab8-3cc5-407b-84dd-2da52e2379c2', '465ebab2-0638-436e-8df5-48755893c6d4', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-08-16 17:30:00', 0, 1, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('a93c098c-2c82-4390-af12-569a246afd94', '6a824526-4436-47df-84a9-1a9d2862090a', '115cb576-f2cf-463c-884b-a0d3c5917b70', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-09-17 16:30:00', 0, 1, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ace41309-d3b7-41a4-85ba-26e6e0b6057d', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ad740cae-9cd1-47be-bfb7-c8a2a67728bb', '04832252-8f8a-41e4-8a34-c9a92e5763c4', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('addabef5-45e0-4045-b609-b1d1191f1130', '12e13f25-9435-4305-8baa-4cfd58491cb9', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2025-10-19 16:00:00', 0, 1, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ae7a30df-a7e7-4470-88f8-62b3a7c0b16e', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2025-11-02 14:30:00', 1, 2, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ae852bc3-2a92-425b-bea6-459a55a5a066', '441cbe9e-688f-41d0-8020-49cb9053d8ed', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2026-03-14 22:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('aeaf0a05-bffb-4377-b1af-60af19b4bd71', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', '621863f9-2393-4941-b6a1-a44addcb592c', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-09-11 17:00:00', 2, 1, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('aeb397f0-8f11-4024-9fe9-76cf50f49f6a', 'eb9de900-0b3e-41e3-8cfb-078357bee420', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2027-05-08 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('aedb3e1c-9bc0-4d4c-ae6d-9945a3b2deb5', 'd1f73515-9fff-4259-932f-2d8b0707c09e', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-02-28 16:00:00', NULL, NULL, 'b39c9bf9-ba79-4df1-a184-370e490f66a0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('af53cab0-bb2f-4195-a797-b85c3eab5b70', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-05-02 19:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('afbb0324-9f68-40c1-a1a6-60a9e46069a4', '091b2a62-704a-4a70-a3dd-01befbcfe456', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-02-21 17:00:00', NULL, NULL, 'b39c9bf9-ba79-4df1-a184-370e490f66a0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('afe77fd1-f849-45b5-b502-4a20de87181e', '90aec0dc-59cb-46e2-be30-2eddf4330168', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('b0a137e3-db06-4162-9d35-7e56313a9e98', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('b1e63c0a-9022-4e7d-83f9-724d43803b8c', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-04-11 17:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b21221ac-7b62-4108-bc28-383590f6f724', '826630ec-47cf-41c3-931f-1e3a91f298db', '47c1a0c3-e827-4089-95be-29cd8a553fae', 'ac880274-5bba-4f9d-bc91-b702f44f3c93', '2025-08-18 15:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b284188e-b553-4ea3-be7b-a4c37d84ec39', '1f17186a-ea65-4503-b76f-c3a968ce5a63', '47c1a0c3-e827-4089-95be-29cd8a553fae', 'f266ee4e-1103-43f0-8386-eb28c0989276', '2025-09-01 15:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b2b6e366-13b4-419b-a44c-25712c7b5188', '98a129dc-eec0-45b1-be0d-af704a6cc21d', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-11-23 14:00:00', 0, 1, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b4e32e64-9b8e-46b0-8460-7272f7bdd349', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-01-31 14:00:00', NULL, NULL, '2bd3e2da-6d16-440e-9973-b2f25068aa61', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b510188e-50e7-4154-b4c5-3702e42cc848', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('b51f8859-80bb-410b-a715-6046801ad17c', 'ce9c4944-7287-46da-8272-622e080926cf', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('b6303a3d-db79-4978-b508-709167850ebf', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', '7a7c6ab0-0c98-495d-9237-11de8528535a', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-09-28 16:00:00', 1, 0, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b65e6928-386f-4f9d-bc53-b3f0ed957dcf', '16dd7826-a16e-45d9-acfa-b0f9dd4d7d66', 'f266ee4e-1103-43f0-8386-eb28c0989276', 'ac880274-5bba-4f9d-bc91-b702f44f3c93', '2025-08-25 17:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b66a257d-7bcb-4736-aeba-1d4900429546', 'f1644655-e073-4239-b9dd-8d8d7447945d', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('b6a3666c-36ea-45d6-9e1a-a7ad1ce6d3b2', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-02-07 16:00:00', NULL, NULL, '2bd3e2da-6d16-440e-9973-b2f25068aa61', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b6e5e4dd-b1fa-447d-a21b-3c487beb942c', '6993f748-709d-46ad-be83-e0acaa3f783b', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('b8972b36-d1ad-43f4-871d-d7f9f845af07', '98a129dc-eec0-45b1-be0d-af704a6cc21d', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-11-23 14:00:00', 4, 0, '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b910788e-65fd-4d8f-9ee1-90a921e66847', '01d720af-d115-4a77-9dc6-25650edf54b4', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-03-21 20:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('b91b07f7-05d1-4561-bf03-0cdefccb23dc', '245e3def-0365-4557-823d-d7c102ea08cd', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('b9dac188-9040-4248-a18d-ecb78c6597b3', 'fd2bc658-c54f-4d71-8c99-5027522055e6', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ba361ed6-16d7-412f-b344-8066adc8b8cc', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-11-05 14:30:00', 0, 1, '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '2025-11-17 13:41:31', 'UPCOMING', 0),
('bb57cacc-282c-4a6e-a177-9f2c7e9fa322', '27e5265f-b6c2-4818-a9e1-f32e528d386a', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('bb9b1420-ab13-4328-953e-70303cfe6350', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-10-01 16:30:00', 1, 1, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('bbfd4d52-16e5-42bb-8f8a-6059033e906d', 'b3715c77-739f-4023-8f11-c19f52d1ee82', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-08-27 17:30:00', 2, 0, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('bc58b030-d186-47c0-ae22-cc78a9d30245', 'b7c48021-d42c-4fab-a0c3-0f79e89c17cf', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-05-02 22:00:00', NULL, NULL, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('bd76ce81-a65e-4936-9d41-3cd3e07977f0', '04832252-8f8a-41e4-8a34-c9a92e5763c4', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-05-22 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('be9fe906-b0a8-400c-8d59-771344d55855', '3666ccca-906a-467f-ae78-3f70c206cdf8', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('bf169ded-905b-4cb7-8d44-ef101396f5b9', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-04-04 22:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('bff1f834-915a-4ad0-87cc-bdf17fd0d404', 'c02ae96e-f9b5-4d84-9018-7ef99732d29c', 'bf490bff-8278-49bd-868f-030a7243ad42', '47c1a0c3-e827-4089-95be-29cd8a553fae', '2025-09-08 15:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c0808192-55c9-4d79-bb1f-9d087d9a4883', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-05-09 17:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c13be8dd-8092-452f-9810-21c27973bdba', '245e3def-0365-4557-823d-d7c102ea08cd', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c16e5727-93a9-4f1f-91fd-da406f535b22', '56eae259-ab24-47f8-be6e-464497492264', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '502b7ba7-c302-4f34-8027-a22f0bf9c400', '2025-09-19 17:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c270b4d1-e096-4086-806f-aa4ae43acf95', 'bd37911e-d31b-4cd9-a468-ee841468b671', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0);
INSERT INTO `matches` (`id`, `journee_id`, `equipe_home`, `equipe_away`, `date`, `score_home`, `score_away`, `arbitre_id`, `created_at`, `status`, `illegal_player_used`) VALUES
('c28dd18f-149d-4148-8fd1-f2c1bfe71b29', '441cbe9e-688f-41d0-8020-49cb9053d8ed', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-03-14 23:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c3c97183-cf6b-4926-a7b5-769b37fcc642', 'a05810fa-710e-4655-b52c-b8d2f87aa454', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c3e81045-e1c8-489b-9e1f-ef1ee4497074', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-03-28 18:00:00', NULL, NULL, '9d434827-cb60-4d7f-9946-2eed37dddc84', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c3f8e9ce-b7c4-4c13-ac3f-1744256eacc6', '657031ab-4ed7-4009-8f63-22882d5560eb', '115cb576-f2cf-463c-884b-a0d3c5917b70', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-04-25 17:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c463c62d-87de-4428-9bca-303a394e9267', 'b3715c77-739f-4023-8f11-c19f52d1ee82', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-08-27 17:30:00', 0, 0, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c50fab5e-e170-4049-8814-f65ac8beb1ae', 'b39f0dc7-2a7b-400a-8618-97f34a50009c', '86e638ae-4702-4844-a16a-75c7a5ee8644', '8a0922d3-063d-409f-9697-175e09069bff', '2025-09-01 17:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c5f6992a-269d-4279-9ec7-19eafd8edcd2', '27633172-2183-4d4f-8b5a-f75a43943f98', '621863f9-2393-4941-b6a1-a44addcb592c', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2025-08-21 17:30:00', 0, 4, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c6ac7a0f-0643-45d3-865c-608c28373cde', 'ce9c4944-7287-46da-8272-622e080926cf', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-08-29 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c7aefc0c-2baa-4ccd-af64-a3fa5fb2dc2b', 'a05810fa-710e-4655-b52c-b8d2f87aa454', '9af94026-b63c-4689-ad02-8b7bde6fd810', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c7d4f138-0fc0-4143-b54c-992c1c2a2545', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-09-14 17:00:00', 1, 1, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c7d66849-91d9-4c44-a6d1-6c22a188b2a4', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c7de33c5-ed81-498e-9816-e87629dd9d22', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c86bb9c7-df46-40bc-a049-b83ba5eb9091', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c89fa744-ae47-49d4-bd89-b1b6eade517f', '5580cfd7-a665-492d-b59d-c47f5961b4fa', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('c9485930-f0f9-4b9a-83da-a2e63fb4fe92', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2025-09-28 16:00:00', 1, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c98688d0-7b73-47c5-8a67-c67deaccfd4a', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2025-08-10 17:30:00', 2, 0, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('c9f9bf97-c1b7-44a2-8d41-4f0b7160e822', '077425c1-9605-4e05-b518-df7f442ac8af', '621863f9-2393-4941-b6a1-a44addcb592c', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-10-25 14:30:00', 1, 3, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ca793096-bcd7-476c-ba27-64ec642f7bdc', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-04-18 20:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('cbdd8871-c861-4f5f-a725-00867cdedf83', '9f198c9a-6da1-4660-9b8a-6123290922fe', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'ea090fa2-b5f0-4858-8dc7-5d601a027895', '2025-10-10 19:00:00', NULL, NULL, '2e4e6d91-56a8-4af0-a152-0eaf415ecef4', '2025-11-17 13:41:31', 'UPCOMING', 0),
('cc52a82f-38d0-43b2-bea6-e66dbac4a068', '20d2ea1f-a97a-48ad-afe7-69ae69ee9dd4', '502b7ba7-c302-4f34-8027-a22f0bf9c400', 'f03f3a80-2164-46f3-b44a-5d63815a77af', '2025-09-26 19:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('cc59dccd-d30d-4107-bf17-167b37814f21', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('cc715d2d-0ad8-49d2-ac02-5741cbd557b7', 'e34504f1-91ce-42a4-8b04-d954315024a6', 'dd5d38a9-8da4-11f1-862a-368e37a00996', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2027-02-06 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('cc9dbec3-d2b6-4630-97c9-37eedc2492e8', 'bedef8cd-e26b-43fd-9e2b-647cd6836af7', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-06-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('cd16f122-22af-432e-93da-f76789fbb828', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2025-10-03 16:00:00', 1, 1, '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('cd373e0b-77c7-43e3-b7c2-0094679cdffd', '1868b8fc-2b8c-4e86-b764-758495557dd9', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-09-20 16:30:00', 0, 0, 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '2025-11-17 13:41:31', 'UPCOMING', 0),
('cd526e01-9f04-4df0-8f84-c4a2e2fff5e2', '97ab705c-74bb-474b-87da-3b06c5b655f7', '7fe5613c-c3c4-4d09-a721-45434df61e1a', '4887fbc2-6b67-4408-b91a-72b7f855d5ee', '2025-08-25 17:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ce614a49-3280-4add-883a-0d4c009ff121', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ce90e5ae-5042-43f6-9c01-fcad9aa61e96', '6a824526-4436-47df-84a9-1a9d2862090a', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2025-09-16 16:30:00', 2, 0, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ceae4087-ca17-4272-b7f9-25eca3ab56ed', '4c877f82-7b81-4702-91df-d68194333714', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2025-11-10 14:00:00', 0, 1, '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ceba0bc2-63ec-40c5-aec9-bf4dcda5c8bc', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2025-11-01 14:30:00', 1, 1, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('cebe80ce-84a5-43b7-89bc-05f5f265d4c5', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('cf127454-51f3-45d6-81be-603e9bd635ef', 'c24b8973-8bb3-4747-be78-8fd56c09eafc', '9af94026-b63c-4689-ad02-8b7bde6fd810', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-10-10 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('cf71bea3-332b-4baa-a659-8d93ddc3763e', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', '115cb576-f2cf-463c-884b-a0d3c5917b70', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d0976a46-f1f6-4049-a477-d43600077b82', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d1750e18-8ea9-4f7a-a1c8-ed52d8aa8e96', '12e13f25-9435-4305-8baa-4cfd58491cb9', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-10-18 16:00:00', 1, 1, '28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d181648e-f8b0-41ca-8094-36099227e0a6', '12e13f25-9435-4305-8baa-4cfd58491cb9', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-10-22 16:00:00', 0, 2, 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d1ddcd5a-dd72-4fde-86c9-21933b425e95', 'f1644655-e073-4239-b9dd-8d8d7447945d', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d274de42-13e5-4c86-93be-be049ce73958', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d2b13a03-96ee-4a67-a4a8-72749eb1c35e', '3666ccca-906a-467f-ae78-3f70c206cdf8', '115cb576-f2cf-463c-884b-a0d3c5917b70', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-01-23 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d3c583cc-27d2-489c-949b-4801d72ea76a', '97ab705c-74bb-474b-87da-3b06c5b655f7', '1f2195f5-d123-4d96-9d95-1f99ec96b077', '86e638ae-4702-4844-a16a-75c7a5ee8644', '2025-08-25 19:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d3c5b000-f79f-40b3-ba74-d55a775b4da7', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d467ece2-987c-4bf7-a221-345f3d74285e', '27633172-2183-4d4f-8b5a-f75a43943f98', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2025-08-22 17:30:00', 2, 0, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d4b0715e-0a82-4d34-bd7f-e75e75d0af01', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d514a29a-a05d-41a0-b9d0-08a2bc8de09a', '091b2a62-704a-4a70-a3dd-01befbcfe456', '621863f9-2393-4941-b6a1-a44addcb592c', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-02-21 22:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d57d193f-a52a-469d-b32f-bdf8934732a8', '16dd7826-a16e-45d9-acfa-b0f9dd4d7d66', 'bf490bff-8278-49bd-868f-030a7243ad42', 'e6f9c92f-96c4-4b26-b7d3-17acdc2af701', '2025-08-25 19:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d719d844-d6f5-4c95-bc28-b0e20ff57cba', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', '9af94026-b63c-4689-ad02-8b7bde6fd810', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-05-09 20:00:00', NULL, NULL, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d7efbc48-a3ef-46a9-9825-f3c0a5c734d5', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2025-08-09 17:30:00', 0, 0, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d83b6e48-8500-4618-866c-bc65728bc1d1', 'b3715c77-739f-4023-8f11-c19f52d1ee82', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2025-08-27 17:30:00', 2, 0, 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d89c3384-05b1-45bd-828d-014247981c34', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', '9af94026-b63c-4689-ad02-8b7bde6fd810', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-02-07 22:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d8b3efba-9ff3-4e64-9756-75d3d079b5a8', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d8b40e8e-f76d-4975-8bd6-5ef5ee3c9bdc', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', '9af94026-b63c-4689-ad02-8b7bde6fd810', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('d917cf9c-bb20-429c-870a-e365970bc708', '077425c1-9605-4e05-b518-df7f442ac8af', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-10-25 14:30:00', 1, 0, '28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', '2025-11-17 13:41:31', 'UPCOMING', 0),
('d9aa686d-0858-4846-ac40-6c64d7c8de26', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', '9af94026-b63c-4689-ad02-8b7bde6fd810', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('da170745-772f-4094-adc4-d8a0e3d9e821', 'bd37911e-d31b-4cd9-a468-ee841468b671', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('da69f698-f846-4a05-b773-82c132fe1713', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', '7a7c6ab0-0c98-495d-9237-11de8528535a', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2026-03-28 20:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('dac47eab-0938-4828-bc0d-d1dd2b8f3180', '90aec0dc-59cb-46e2-be30-2eddf4330168', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('db331379-41b9-484d-be82-7ad29a8a9075', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('db56353c-ff37-4d05-9407-45a5f3d0148c', 'f1644655-e073-4239-b9dd-8d8d7447945d', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-08-22 17:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('dc8c78c6-0a91-48e0-a904-2185d77bddbe', '441cbe9e-688f-41d0-8020-49cb9053d8ed', '115cb576-f2cf-463c-884b-a0d3c5917b70', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-03-14 17:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('dd591393-8cc3-4f4f-a8c4-69f5221a7af5', '01d720af-d115-4a77-9dc6-25650edf54b4', '621863f9-2393-4941-b6a1-a44addcb592c', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-03-21 16:00:00', NULL, NULL, 'ad74feeb-b4ed-423b-b350-dda01c277633', '2025-11-17 13:41:31', 'UPCOMING', 0),
('dd857a44-47e1-4375-b5e7-47dc45585636', '27e5265f-b6c2-4818-a9e1-f32e528d386a', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('dda5eff3-694e-44d7-89c0-fe214dccb3c1', 'bfa3d876-7d45-453a-839f-c05cbf193d79', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-02-14 16:00:00', NULL, NULL, '527bf814-1273-4c64-9fdf-b04768c87516', '2025-11-17 13:41:31', 'UPCOMING', 0),
('dec45369-fbe0-4b0f-8108-cf4ed9b3c8d3', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e067da68-758a-4203-94d9-377199ac1a5d', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', '9af94026-b63c-4689-ad02-8b7bde6fd810', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2025-09-13 17:00:00', 1, 1, 'a8d247fb-dc14-4254-97df-fbfddb79d506', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e09a9de1-085f-4a85-b93a-12db1f2f6d11', 'bd37911e-d31b-4cd9-a468-ee841468b671', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e09c795f-d08c-4d19-b9a3-f19cd69eba4b', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', '7a7c6ab0-0c98-495d-9237-11de8528535a', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e14a8b1d-f25b-4d5b-95dc-cbb92d6fdba0', '657031ab-4ed7-4009-8f63-22882d5560eb', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-04-25 16:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e1f40044-a8bc-4833-b452-4d7bfec950b9', '27e5265f-b6c2-4818-a9e1-f32e528d386a', '7a7c6ab0-0c98-495d-9237-11de8528535a', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e2080cd8-5a81-4db9-891f-713031102a29', '4c877f82-7b81-4702-91df-d68194333714', '9af94026-b63c-4689-ad02-8b7bde6fd810', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-11-08 14:00:00', 2, 0, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e2c48cbf-d1ca-4c06-aa57-d877f47ca2c0', '441cbe9e-688f-41d0-8020-49cb9053d8ed', '7a7c6ab0-0c98-495d-9237-11de8528535a', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-03-14 19:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e35c041f-2a58-46f7-8d1d-9157f6c25acf', '6993f748-709d-46ad-be83-e0acaa3f783b', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-06-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e3b43208-f5e2-40dd-8b32-a206aa6060f1', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-03-28 23:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e3cd3076-ce49-49fc-9639-01f5997dd013', 'c19ea472-8fe4-420c-a753-2bf209fd1c0d', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2027-05-15 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e47e8d42-8c4b-409d-8bed-7a5cc2d4d1b2', '27633172-2183-4d4f-8b5a-f75a43943f98', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-08-22 17:30:00', 1, 2, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e512f0e0-68d2-4937-98f6-ed7b94f6d645', '244c6b6b-ec7c-43f8-bfda-41cd871352d9', '7a7c6ab0-0c98-495d-9237-11de8528535a', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-05-09 21:00:00', NULL, NULL, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e5506093-e3b0-45c9-aa05-47bfce152a71', '71cfe4d0-3264-4560-8f2e-179f6116f1e7', '9af94026-b63c-4689-ad02-8b7bde6fd810', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2027-06-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e5902d35-98c2-4896-b987-0af702a4b630', '01d720af-d115-4a77-9dc6-25650edf54b4', '9af94026-b63c-4689-ad02-8b7bde6fd810', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-03-21 21:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e5a7510e-caff-4f36-b107-df9590460055', '4c97e3c0-5e89-41c7-af0e-15d97eca724e', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-03-28 21:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e6487c57-6a05-428b-b57f-c15f22121b6a', 'bfa3d876-7d45-453a-839f-c05cbf193d79', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-02-14 18:00:00', NULL, NULL, 'b39c9bf9-ba79-4df1-a184-370e490f66a0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e661afd8-4526-4654-9aef-175ff7b6a0c0', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-04-18 17:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e6870de6-8024-4d60-b06f-33b25d5053dd', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-11-05 14:30:00', 1, 0, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e71d6103-7db7-4bff-9424-83a66be025c5', 'f9c04ec2-0722-48f3-a352-a1b35b3d4fe1', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-09-12 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e7ac9740-bf6a-44b9-902e-ddd6b2730d90', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', '9af94026-b63c-4689-ad02-8b7bde6fd810', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e7b4f4c6-d962-45f8-9350-3b6239f11d00', '9f198c9a-6da1-4660-9b8a-6123290922fe', 'e1f0dc3f-ff29-46ea-b111-25295a9f263f', 'f03f3a80-2164-46f3-b44a-5d63815a77af', '2025-10-10 15:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e827f988-ce82-4b72-be54-9930851a2b05', '4c877f82-7b81-4702-91df-d68194333714', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-11-09 14:00:00', 1, 0, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e88dd0da-32e3-4be2-99db-e1b6940ae574', '9afcdf84-bc27-4312-aece-2b05a5afbbc3', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-04-11 21:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e8a09c8f-629c-40be-92ed-3c0c2018dbd8', '90aec0dc-59cb-46e2-be30-2eddf4330168', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e8a30c4f-a66d-40e7-8472-5f7873fbe869', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', '9af94026-b63c-4689-ad02-8b7bde6fd810', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-04-04 21:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e92c4986-2501-40b9-9e5a-4f7601968c2e', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-04-18 23:00:00', NULL, NULL, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e936e2d1-bf10-4073-b5ed-1dc0a723d8a1', '90aec0dc-59cb-46e2-be30-2eddf4330168', 'd99c3053-4c32-451c-84b4-74c3236a6d65', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-10-24 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('e937271d-2068-49d3-8bb2-fc612ebcf5ef', 'fbdcd54f-71ba-4654-aee1-0d0e7f63e548', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-01-31 14:00:00', NULL, NULL, 'b39c9bf9-ba79-4df1-a184-370e490f66a0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('e99d0762-edee-4744-b873-c6e039128a34', 'fd2bc658-c54f-4d71-8c99-5027522055e6', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-10-03 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ea009951-7ed3-42f5-bb8f-1036b95fa34b', '4133dea6-9a9f-44f8-b85a-de2cad05a067', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ea661301-9336-467e-9f11-fb3b6a1baecc', '27e5265f-b6c2-4818-a9e1-f32e528d386a', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-09-19 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ea94c44e-9682-475a-a222-6d957afd1332', 'a633cd26-3c3e-4f7b-9e7c-03bc9fbb1658', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-11-28 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('eab99f30-b5c4-453c-b623-860da2d2d63a', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ead07899-eecb-413e-99d1-9b327d4026db', 'bfa3d876-7d45-453a-839f-c05cbf193d79', '7a7c6ab0-0c98-495d-9237-11de8528535a', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-02-14 19:00:00', NULL, NULL, '5adfd381-9d2a-4d4d-bc4e-614d6ac12839', '2025-11-17 13:41:31', 'UPCOMING', 0),
('eb57b708-7a88-4abe-a4ba-ad4b32eabcd9', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'd99c3053-4c32-451c-84b4-74c3236a6d65', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('eb752446-f175-44d5-b301-70ffc5f35742', '6a824526-4436-47df-84a9-1a9d2862090a', '7a7c6ab0-0c98-495d-9237-11de8528535a', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-09-17 16:30:00', 3, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('eb8a131f-ed41-4de8-93f9-dd9573651fb0', '23d3e6b5-0f3d-446b-a492-8b7685036c8f', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2025-09-13 17:00:00', 0, 1, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('eba44b04-9be6-443c-9aab-9658a29bd2e0', 'd1f73515-9fff-4259-932f-2d8b0707c09e', '7a7c6ab0-0c98-495d-9237-11de8528535a', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-02-28 20:00:00', NULL, NULL, '3b961988-7089-4446-859d-138be2fe6f37', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ebbd52b5-cd27-4319-b480-0b6afd667188', '8ff543c1-8832-4f51-968d-88131f54b876', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ebd26182-111b-47ff-9a11-bcd3d839bfb3', '465ebab2-0638-436e-8df5-48755893c6d4', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-08-16 17:30:00', 1, 0, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ebee123f-765e-455a-a209-2fb4a9303f2d', 'e917bd56-fe29-44d6-a2d7-c5171f3835b5', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2025-10-01 16:30:00', 0, 3, '4fb6b839-5c6e-4613-a202-a491046c937d', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ec028e68-9d91-4924-b83a-9b6f76571eed', 'e12c9c4b-0673-4c99-9bc3-f4be5fedcbed', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-02-07 20:00:00', NULL, NULL, '5adfd381-9d2a-4d4d-bc4e-614d6ac12839', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ed6cb219-50a5-49e1-b54a-42a9c3442722', '8ff543c1-8832-4f51-968d-88131f54b876', 'dd5d38a9-8da4-11f1-862a-368e37a00996', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-10-17 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ed781d8a-7df2-4333-9046-e79d9a5e96dc', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '115cb576-f2cf-463c-884b-a0d3c5917b70', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-11-02 14:30:00', 0, 3, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('eda2b91d-c968-46de-a453-3c6887993da3', '4c877f82-7b81-4702-91df-d68194333714', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-11-08 14:00:00', 2, 0, '28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', '2025-11-17 13:41:31', 'UPCOMING', 0),
('edc2f917-e45f-4165-9630-db9cd2ff9af4', '1868b8fc-2b8c-4e86-b764-758495557dd9', '621863f9-2393-4941-b6a1-a44addcb592c', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-09-20 16:30:00', 1, 4, 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '2025-11-17 13:41:31', 'UPCOMING', 0),
('ee614eca-cc96-4e1d-b661-1481878c2cd2', '6e193b48-5127-416c-be0f-2fe6b2f12eb5', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2027-05-29 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('eec162ea-143d-4977-9ad9-10e028bb6bfe', '1157d8b6-1ea6-40a7-a6a0-be782a97b6a7', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2026-09-26 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('ef23b0c0-3e74-4569-942c-88228ead6c17', '6a824526-4436-47df-84a9-1a9d2862090a', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '11f6d6aa-4c94-48c4-b228-7beb0f97fb70', '2025-09-18 16:30:00', 1, 0, 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '2025-11-17 13:41:31', 'UPCOMING', 0),
('f091d55c-f9c5-46d6-9e14-d7620534b4a1', '64be10f9-eba3-4c9f-8ab6-3f2da5731ee1', '06baf8dd-851e-4f44-8c0c-b72aedabb9b1', '86e638ae-4702-4844-a16a-75c7a5ee8644', '2025-09-08 15:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('f0ca8777-35d5-4e92-ad02-7bf658f33a46', 'db2cd558-8f6c-43a5-84d1-2a397a193b4f', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2027-06-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('f0fa2b9f-f47c-4a58-82b5-9f1b6aa29429', '4133dea6-9a9f-44f8-b85a-de2cad05a067', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('f189f6bd-4d10-4fac-9a66-fdaa4aed1500', '6a53bc9d-1a6d-4055-be5d-75e7cec5d252', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2027-02-20 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('f26c21d7-ebdf-49ae-b665-6d8df6a9e9e1', 'ff2855a7-f8d2-45d5-9134-d1016c6108cd', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-03-07 20:00:00', NULL, NULL, '8b8754b0-9add-47cb-9d6e-b51499c471cc', '2025-11-17 13:41:31', 'UPCOMING', 0),
('f30392a8-f437-4e61-ab42-f9924ac83f93', '49f7129b-4bd3-4d7f-8b2f-d091a27db7fb', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2027-01-16 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('f4583b8f-4f68-4da0-8f6e-70226bbe04f7', '64be10f9-eba3-4c9f-8ab6-3f2da5731ee1', '4887fbc2-6b67-4408-b91a-72b7f855d5ee', '1f2195f5-d123-4d96-9d95-1f99ec96b077', '2025-09-08 17:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('f4dc7897-8c08-4719-b58d-ba8836cfb756', 'e3edb45e-9c5a-4bd3-aa01-7e305410e4c2', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-08-10 17:30:00', 1, 2, 'cfe9ff4f-6e12-4da8-82ba-b31d75c544d7', '2025-11-17 13:41:31', 'UPCOMING', 0),
('f5d168a6-abc8-4fe3-b0a9-d5d37b7c5762', 'b66b24f3-5dd3-4c32-b71d-9e56fec97242', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', '2027-02-13 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('f7457159-d2b9-4775-add9-dc12c9af215c', '826630ec-47cf-41c3-931f-1e3a91f298db', 'bf490bff-8278-49bd-868f-030a7243ad42', 'f266ee4e-1103-43f0-8386-eb28c0989276', '2025-08-18 19:00:00', NULL, NULL, '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('f7bb9f47-31d0-4568-9e02-ccb2e02e2dd4', 'e27737a1-3fe1-47df-8ec1-8c6e8f6eb595', 'ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-04-04 18:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('f7f06b2c-05ae-4107-a5ff-f8ebc769cfed', '245e3def-0365-4557-823d-d7c102ea08cd', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('f84dfcb4-afb4-4f43-a1a3-be1e20acf93c', '245e3def-0365-4557-823d-d7c102ea08cd', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('f943b873-e1b3-44ad-a1d2-c2af66db8497', '889b7aac-1a2d-4e6d-b9ff-af5bf4572f7a', '06baf8dd-851e-4f44-8c0c-b72aedabb9b1', '7fe5613c-c3c4-4d09-a721-45434df61e1a', '2025-09-22 15:00:00', NULL, NULL, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fac9c781-0e26-4de3-9fc0-ab9c128f85bd', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2025-11-06 14:30:00', 4, 0, '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '2025-11-17 13:41:31', 'UPCOMING', 0),
('faf16489-243c-4b4d-b6be-8a53d3623192', '9c68a0d1-53d0-45e4-858f-5c86a7c9254e', '9af94026-b63c-4689-ad02-8b7bde6fd810', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-04-18 18:00:00', NULL, NULL, '3d7077da-436a-43c7-952d-9873bd5be225', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fb6b4095-66c2-4169-95e4-84d9eb870dbe', '657031ab-4ed7-4009-8f63-22882d5560eb', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '621863f9-2393-4941-b6a1-a44addcb592c', '2026-04-25 19:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fcb09b2f-628d-421b-84d9-bee2411eca05', 'eaef16ca-fc5c-4f07-990e-d9f7eb6b7f5a', '115cb576-f2cf-463c-884b-a0d3c5917b70', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-09-05 16:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('fcf33c67-ac82-4dc4-951a-3c7b24cd1b25', 'a05810fa-710e-4655-b52c-b8d2f87aa454', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2027-01-30 15:00:00', NULL, NULL, NULL, '2026-08-01 22:22:00', 'UPCOMING', 0),
('fd1e67ab-e3c3-42ee-9979-a3152e2d32f5', '855043e7-f2ee-40ac-a4e4-5a04127b7f5a', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '115cb576-f2cf-463c-884b-a0d3c5917b70', '2025-10-04 16:00:00', 3, 0, '2bc18c95-59ac-43e7-9797-058a7f68825e', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fda548ec-7761-4551-bd17-2c3f5f914a81', '56c431fd-bbbf-4ac2-b0aa-846a9a83f96a', 'bf490bff-8278-49bd-868f-030a7243ad42', 'ac880274-5bba-4f9d-bc91-b702f44f3c93', '2025-09-15 17:00:00', NULL, NULL, '6f7c4693-f48d-4521-a014-41ee3b68cbcd', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fe449f93-0281-40a8-ad01-0f6f2756bce1', '441cbe9e-688f-41d0-8020-49cb9053d8ed', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '6c67b885-6ab0-4b6c-87fa-04db3949ce09', '2026-03-14 21:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fe8a98d6-1831-4031-b72b-8aec29d3b349', '826630ec-47cf-41c3-931f-1e3a91f298db', 'e6f9c92f-96c4-4b26-b7d3-17acdc2af701', '14a6c0a7-dc5e-4546-b463-f1ae55737400', '2025-08-18 17:00:00', NULL, NULL, 'b5608682-9950-486e-bafd-3078cec401ba', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fed881d6-24b6-4566-8533-2e69a0206b0f', '635d7d15-1fab-4fe8-99bf-f8864c7f2cee', '621863f9-2393-4941-b6a1-a44addcb592c', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-11-04 14:30:00', 2, 1, '527bf814-1273-4c64-9fdf-b04768c87516', '2025-11-17 13:41:31', 'UPCOMING', 0),
('fffc683e-73fd-430d-84eb-d94b536c5106', '032d5376-ce87-485a-b5f0-69e2ae5963b8', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2025-11-01 14:30:00', 1, 1, 'cfa2ca1b-3ed7-44f8-9e84-23d314a5ef38', '2025-11-17 13:41:31', 'UPCOMING', 0),
('match-2627-j1-1', 'md-2627-j1', 'dd5d38a9-8da4-11f1-862a-368e37a00996', 'team-jso', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j1-2', 'md-2627-j1', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j1-3', 'md-2627-j1', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j1-4', 'md-2627-j1', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j1-5', 'md-2627-j1', 'team-esm', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j1-6', 'md-2627-j1', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j1-7', 'md-2627-j1', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j1-8', 'md-2627-j1', 'team-esz', 'team-ob', '2026-08-15 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-1', 'md-2627-j10', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-2', 'md-2627-j10', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-3', 'md-2627-j10', 'team-esz', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-4', 'md-2627-j10', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-5', 'md-2627-j10', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'team-jso', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-6', 'md-2627-j10', 'team-ob', 'team-esm', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-7', 'md-2627-j10', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j10-8', 'md-2627-j10', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-10-17 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-1', 'md-2627-j11', 'team-ob', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-2', 'md-2627-j11', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'team-esz', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-3', 'md-2627-j11', 'team-esm', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-4', 'md-2627-j11', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-5', 'md-2627-j11', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-6', 'md-2627-j11', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-7', 'md-2627-j11', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j11-8', 'md-2627-j11', 'team-jso', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-10-24 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-1', 'md-2627-j12', 'team-esz', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-2', 'md-2627-j12', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-3', 'md-2627-j12', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-4', 'md-2627-j12', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'team-esm', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-5', 'md-2627-j12', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'team-ob', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-6', 'md-2627-j12', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-7', 'md-2627-j12', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j12-8', 'md-2627-j12', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'team-jso', '2026-10-31 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-1', 'md-2627-j13', 'team-esm', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-2', 'md-2627-j13', 'team-jso', 'team-esz', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-3', 'md-2627-j13', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-4', 'md-2627-j13', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-5', 'md-2627-j13', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-6', 'md-2627-j13', 'team-ob', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-7', 'md-2627-j13', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j13-8', 'md-2627-j13', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-11-07 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-1', 'md-2627-j14', '7a7c6ab0-0c98-495d-9237-11de8528535a', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-2', 'md-2627-j14', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-3', 'md-2627-j14', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'team-ob', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-4', 'md-2627-j14', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'team-jso', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-5', 'md-2627-j14', 'team-esm', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-6', 'md-2627-j14', 'team-esz', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-7', 'md-2627-j14', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j14-8', 'md-2627-j14', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-11-14 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-1', 'md-2627-j15', 'team-ob', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-2', 'md-2627-j15', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'team-esm', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-3', 'md-2627-j15', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'team-esz', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-4', 'md-2627-j15', '9af94026-b63c-4689-ad02-8b7bde6fd810', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-5', 'md-2627-j15', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-6', 'md-2627-j15', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-7', 'md-2627-j15', 'team-jso', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j15-8', 'md-2627-j15', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-11-21 15:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-1', 'md-2627-j2', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'team-esm', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-2', 'md-2627-j2', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'team-esz', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-3', 'md-2627-j2', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-4', 'md-2627-j2', 'team-jso', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-5', 'md-2627-j2', 'team-ob', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-6', 'md-2627-j2', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-7', 'md-2627-j2', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j2-8', 'md-2627-j2', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-08-22 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-1', 'md-2627-j3', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'team-ob', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-2', 'md-2627-j3', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-3', 'md-2627-j3', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-4', 'md-2627-j3', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-5', 'md-2627-j3', 'team-esm', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-6', 'md-2627-j3', 'team-esz', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-7', 'md-2627-j3', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'team-jso', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j3-8', 'md-2627-j3', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-08-29 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-1', 'md-2627-j4', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-2', 'md-2627-j4', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-3', 'md-2627-j4', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-4', 'md-2627-j4', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'team-esz', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-5', 'md-2627-j4', '9af94026-b63c-4689-ad02-8b7bde6fd810', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-6', 'md-2627-j4', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-7', 'md-2627-j4', 'team-ob', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j4-8', 'md-2627-j4', 'team-jso', 'team-esm', '2026-09-05 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j5-1', 'md-2627-j5', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0);
INSERT INTO `matches` (`id`, `journee_id`, `equipe_home`, `equipe_away`, `date`, `score_home`, `score_away`, `arbitre_id`, `created_at`, `status`, `illegal_player_used`) VALUES
('match-2627-j5-2', 'md-2627-j5', 'team-esz', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j5-3', 'md-2627-j5', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j5-4', 'md-2627-j5', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j5-5', 'md-2627-j5', 'team-esm', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j5-6', 'md-2627-j5', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'team-ob', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j5-7', 'md-2627-j5', '7a7c6ab0-0c98-495d-9237-11de8528535a', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j5-8', 'md-2627-j5', 'team-jso', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-09-12 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-1', 'md-2627-j6', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-2', 'md-2627-j6', 'team-ob', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-3', 'md-2627-j6', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-4', 'md-2627-j6', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-5', 'md-2627-j6', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-6', 'md-2627-j6', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'team-jso', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-7', 'md-2627-j6', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'team-esm', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j6-8', 'md-2627-j6', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'team-esz', '2026-09-19 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-1', 'md-2627-j7', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-2', 'md-2627-j7', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-3', 'md-2627-j7', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-4', 'md-2627-j7', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '6073ac13-c566-4fa4-b0fd-c7bedf724960', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-5', 'md-2627-j7', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-6', 'md-2627-j7', 'team-jso', 'team-ob', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-7', 'md-2627-j7', 'team-esm', 'team-esz', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j7-8', 'md-2627-j7', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-09-26 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-1', 'md-2627-j8', 'team-ob', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-2', 'md-2627-j8', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-3', 'md-2627-j8', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'team-jso', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-4', 'md-2627-j8', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'team-esm', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-5', 'md-2627-j8', '9af94026-b63c-4689-ad02-8b7bde6fd810', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-6', 'md-2627-j8', 'team-esz', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-7', 'md-2627-j8', 'dd5c81cd-8da4-11f1-862a-368e37a00996', 'dd5d38a9-8da4-11f1-862a-368e37a00996', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j8-8', 'md-2627-j8', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-10-03 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-1', 'md-2627-j9', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'dd5c81cd-8da4-11f1-862a-368e37a00996', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-2', 'md-2627-j9', 'team-esm', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-3', 'md-2627-j9', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-4', 'md-2627-j9', 'dd5d38a9-8da4-11f1-862a-368e37a00996', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-5', 'md-2627-j9', '6073ac13-c566-4fa4-b0fd-c7bedf724960', 'team-ob', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-6', 'md-2627-j9', 'team-jso', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-7', 'md-2627-j9', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'team-esz', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-2627-j9-8', 'md-2627-j9', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2026-10-10 14:00:00', NULL, NULL, NULL, '2026-08-02 10:52:07', 'UPCOMING', 0),
('match-ob-j1', 'md-2526-j1', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', 'team-ob', '2025-08-10 15:30:00', 0, 2, NULL, '2026-03-26 19:49:50', 'FINISHED', 0),
('match-ob-j10', 'md-2526-j10', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', 'team-ob', '2025-10-22 14:00:00', 2, 1, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j11', 'md-2526-j11', 'team-ob', 'team-esz', '2025-10-26 13:30:00', 0, 3, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j12', 'md-2526-j12', '7a7c6ab0-0c98-495d-9237-11de8528535a', 'team-ob', '2025-11-02 13:30:00', 0, 3, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j13', 'md-2526-j13', 'team-ob', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', '2025-11-05 13:30:00', 0, 1, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j14', 'md-2526-j14', 'team-jso', 'team-ob', '2025-11-10 13:30:00', 1, 0, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j15', 'md-2526-j15', 'team-ob', '50c25d54-404a-4ff6-bb9c-45e88f748db5', '2025-11-23 13:00:00', 0, 1, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j16', 'md-2526-j16', 'team-ob', '18c0e17d-b43b-4bc6-bdf4-e789b397383c', '2026-01-16 13:00:00', 2, 2, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j17', 'md-2526-j17', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', 'team-ob', '2026-01-21 13:00:00', 0, 1, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j18', 'md-2526-j18', 'team-ob', '9af94026-b63c-4689-ad02-8b7bde6fd810', '2026-01-28 13:00:00', 1, 0, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j19', 'md-2526-j19', '621863f9-2393-4941-b6a1-a44addcb592c', 'team-ob', '2026-01-31 13:00:00', 0, 1, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j2', 'md-2526-j2', 'team-ob', '1b60755d-2bc5-42b5-bf42-4ce817792f2a', '2025-08-15 15:30:00', 0, 0, NULL, '2026-03-26 19:49:50', 'FINISHED', 0),
('match-ob-j20', 'md-2526-j20', 'team-ob', 'team-ass', '2026-02-07 13:00:00', 1, 0, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j21', 'md-2526-j21', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', 'team-ob', '2026-02-13 13:00:00', 2, 0, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j22', 'md-2526-j22', 'team-ob', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', '2026-03-01 12:00:00', 0, 3, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j23', 'md-2526-j23', 'team-esm', 'team-ob', '2026-03-07 12:00:00', 0, 0, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j24', 'md-2526-j24', 'a9430a9a-43b2-41cf-8958-13763a033f2f', 'team-ob', '2026-04-04 13:00:00', NULL, NULL, NULL, '2026-03-26 19:49:51', 'UPCOMING', 0),
('match-ob-j25', 'md-2526-j25', 'team-ob', '9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', '2026-04-12 13:00:00', NULL, NULL, NULL, '2026-03-26 19:49:51', 'UPCOMING', 0),
('match-ob-j26', 'md-2526-j26', 'team-esz', 'team-ob', '2026-04-19 13:00:00', NULL, NULL, NULL, '2026-03-26 19:49:51', 'UPCOMING', 0),
('match-ob-j27', 'md-2526-j27', 'team-ob', '7a7c6ab0-0c98-495d-9237-11de8528535a', '2026-04-26 13:00:00', NULL, NULL, NULL, '2026-03-26 19:49:51', 'UPCOMING', 0),
('match-ob-j28', 'md-2526-j28', '58e6bfd7-6876-4221-ba82-0be7e4c898fb', 'team-ob', '2026-05-03 13:00:00', NULL, NULL, NULL, '2026-03-26 19:49:51', 'UPCOMING', 0),
('match-ob-j29', 'md-2526-j29', 'team-ob', 'team-jso', '2026-05-10 13:00:00', NULL, NULL, NULL, '2026-03-26 19:49:51', 'UPCOMING', 0),
('match-ob-j3', 'md-2526-j3', '9af94026-b63c-4689-ad02-8b7bde6fd810', 'team-ob', '2025-08-22 15:30:00', 0, 2, NULL, '2026-03-26 19:49:50', 'FINISHED', 0),
('match-ob-j30', 'md-2526-j30', '50c25d54-404a-4ff6-bb9c-45e88f748db5', 'team-ob', '2026-05-17 13:00:00', NULL, NULL, NULL, '2026-03-26 19:49:51', 'UPCOMING', 0),
('match-ob-j4', 'md-2526-j4', 'team-ob', '621863f9-2393-4941-b6a1-a44addcb592c', '2025-08-27 13:00:00', 0, 0, NULL, '2026-03-26 19:49:50', 'FINISHED', 0),
('match-ob-j5', 'md-2526-j5', 'team-ass', 'team-ob', '2025-09-11 15:00:00', 0, 1, NULL, '2026-03-26 19:49:50', 'FINISHED', 0),
('match-ob-j6', 'md-2526-j6', 'team-ob', 'f31ddaea-523b-4f0a-a7db-f66ab823d7f0', '2025-09-16 14:30:00', 1, 2, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j7', 'md-2526-j7', '1df9b45b-e06a-41de-b2bf-d1f143fe2252', 'team-ob', '2025-09-24 14:30:00', 0, 2, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j8', 'md-2526-j8', 'team-ob', 'team-esm', '2025-09-28 14:30:00', 1, 0, NULL, '2026-03-26 19:49:51', 'FINISHED', 0),
('match-ob-j9', 'md-2526-j9', 'team-ob', 'a9430a9a-43b2-41cf-8958-13763a033f2f', '2025-10-04 14:00:00', 0, 6, NULL, '2026-03-26 19:49:51', 'FINISHED', 0);

-- --------------------------------------------------------

--
-- Table structure for table `Note`
--

CREATE TABLE `Note` (
  `id` varchar(191) NOT NULL,
  `contentFr` text NOT NULL,
  `contentAr` text DEFAULT NULL,
  `category` enum('TACTICAL','DISCIPLINARY','MEDICAL','OTHER') NOT NULL,
  `matchId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci DEFAULT NULL,
  `playerId` varchar(191) DEFAULT NULL,
  `authorId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `teamId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Note`
--

INSERT INTO `Note` (`id`, `contentFr`, `contentAr`, `category`, `matchId`, `playerId`, `authorId`, `createdAt`, `teamId`) VALUES
('note-1', 'Bonne performance collective. Le pressing haut a fonctionné en 1ère mi-temps. Retravailler la sortie de balle sous pression.', 'أداء جماعي جيد. نجح الضغط العالي في الشوط الأول. يجب إعادة العمل على الخروج بالكرة تحت الضغط.', 'TACTICAL', 'match-ob-j10', NULL, 'user-coach', '2026-03-26 19:49:51.102', 'team-ob'),
('note-2', 'Firas Fadhli suspendu pour J11. Prévoir Achref Afli ou Alpha Sidibé en milieu central.', 'فراس فضلي موقوف للجولة 11. التخطيط لأشرف عفلي أو ألفا سيديبي في الوسط.', 'DISCIPLINARY', NULL, 'ob-21', 'user-direction', '2026-03-26 19:49:51.105', 'team-ob'),
('note-3', 'Elyes Dhaoui (J18) — suivi médical suite à gêne à la cheville droite. Repos 1 semaine. À réévaluer avant J11.', 'إلياس ذاوي (ر18) — متابعة طبية بسبب ألم في الكاحل الأيمن. راحة أسبوع. إعادة التقييم قبل الجولة 11.', 'MEDICAL', NULL, 'ob-18', 'user-secretaire', '2026-03-26 19:49:51.107', 'team-ob'),
('note-4', 'Rappel : amende virage J7 (500 DT) à régler avant le 30 novembre. Contacter le trésorier.', 'تذكير: غرامة المشجعين ج7 (500 د.ت) يجب تسديدها قبل 30 نوفمبر. التواصل مع أمين الصندوق.', 'OTHER', NULL, NULL, 'user-admin', '2026-03-26 19:49:51.109', 'team-ob');

-- --------------------------------------------------------

--
-- Table structure for table `Player`
--

CREATE TABLE `Player` (
  `id` varchar(191) NOT NULL,
  `firstNameFr` varchar(191) NOT NULL,
  `firstNameAr` varchar(191) DEFAULT NULL,
  `lastNameFr` varchar(191) NOT NULL,
  `lastNameAr` varchar(191) DEFAULT NULL,
  `number` int(11) NOT NULL,
  `teamId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL,
  `status` enum('TITULAR','SUBSTITUTE','BLANK','ENTERING','OUT_OF_LIST','SUSPENDED') NOT NULL DEFAULT 'TITULAR',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Player`
--

INSERT INTO `Player` (`id`, `firstNameFr`, `firstNameAr`, `lastNameFr`, `lastNameAr`, `number`, `teamId`, `status`, `isActive`, `createdAt`, `updatedAt`) VALUES
('ob-1', 'Achraf', 'أشرف', 'Krir', 'كرير', 1, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.930', '2026-08-02 10:52:06.994'),
('ob-12', 'Rayane', 'ريان', 'Hammami', 'حمامي', 12, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.947', '2026-08-02 10:52:07.015'),
('ob-13', 'Hamza', 'حمزة', 'Houiji', 'حويجي', 13, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.968', '2026-08-02 10:52:07.038'),
('ob-14', 'Chérif', 'شريف', 'Camara', 'كمارا', 14, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.937', '2026-08-02 10:52:07.005'),
('ob-16', 'Chahine', 'شاهين', 'Smaoui', 'سماوي', 16, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.932', '2026-08-02 10:52:06.996'),
('ob-17', 'Bechir', 'بشير', 'Hasni', 'حسني', 17, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.978', '2026-08-02 10:52:07.052'),
('ob-18', 'Elyes', 'إلياس', 'Dhaoui', 'ذاوي', 18, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.956', '2026-08-02 10:52:07.025'),
('ob-19', 'Mohamed Hedi', 'محمد هادي', 'Hadouchi', 'حدوشي', 19, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.976', '2026-08-02 10:52:07.050'),
('ob-2', 'Nassim', 'ناصيم', 'Hasni', 'حسني', 2, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.949', '2026-08-02 10:52:07.017'),
('ob-21', 'Firas', 'فراس', 'Fadhli', 'فضلي', 21, 'team-ob', 'SUSPENDED', 1, '2026-03-26 19:49:50.963', '2026-08-02 10:52:07.130'),
('ob-23', 'Majd', 'ماجد', 'Hedhli', 'هدلي', 23, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.957', '2026-08-02 10:52:07.027'),
('ob-24', 'Sadate Abdoul Salam', 'صدات عبد السلام', 'Miziyawa', 'ميزياوا', 24, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.962', '2026-08-02 10:52:07.032'),
('ob-26', 'Fares', 'فارس', 'Labidi', 'لبيدي', 26, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.979', '2026-08-02 10:52:07.053'),
('ob-3', 'Elyes', 'إلياس', 'Mejri', 'مجري', 3, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.944', '2026-08-02 10:52:07.012'),
('ob-33', 'Ahmed', 'أحمد', 'Fatnassi', 'فطناسي', 33, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.934', '2026-08-02 10:52:06.999'),
('ob-4', 'Islem', 'إسلام', 'Chelghoumi', 'شلغومي', 4, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.938', '2026-08-02 10:52:07.007'),
('ob-6', 'Youssef', 'يوسف', 'Melki', 'ملكي', 6, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.959', '2026-08-02 10:52:07.028'),
('ob-d1', 'Mohamed Amine', 'محمد أمين', 'Dhouibi', 'ذويبي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.940', '2026-08-02 10:52:07.008'),
('ob-d2', 'Mehrez', 'مهرز', 'Ben Rajeh', 'بن راجح', 0, 'team-ob', 'SUSPENDED', 1, '2026-03-26 19:49:50.942', '2026-08-02 10:52:07.010'),
('ob-d3', 'Mohamed Amine', 'محمد أمين', 'Marzouki', 'مرزوقي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.945', '2026-08-02 10:52:07.013'),
('ob-d4', 'Ayoub', 'أيوب', 'Ouji', 'عوجي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.950', '2026-08-02 10:52:07.019'),
('ob-d5', 'Khaled', 'خالد', 'Ben Oueda', 'بن عويدة', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.952', '2026-08-02 10:52:07.021'),
('ob-d6', 'Amine', 'أمين', 'Melki', 'ملكي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.953', '2026-08-02 10:52:07.022'),
('ob-d7', 'Hamza', 'حمزة', 'Soumer', 'سومر', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.955', '2026-08-02 10:52:07.023'),
('ob-f1', 'Ofufu', 'أوفوفو', 'Ibeh', 'إيبه', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.973', '2026-08-02 10:52:07.047'),
('ob-f2', 'Haythem', 'هيثم', 'Mbarek', 'مبارك', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.975', '2026-08-02 10:52:07.049'),
('ob-f3', 'Mohamed Ali', 'محمد علي', 'Omri', 'عمري', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.981', '2026-08-02 10:52:07.055'),
('ob-f4', 'Baha', 'بهاء', 'Cherni', 'شرني', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.982', '2026-08-02 10:52:07.057'),
('ob-f5', 'Naman', 'نعمان', 'Keita', 'كيتا', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.983', '2026-08-02 10:52:07.058'),
('ob-f6', 'Seif', 'سيف', 'Jabri', 'جابري', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.984', '2026-08-02 10:52:07.060'),
('ob-f7', 'Adem', 'آدم', 'Bounjeh', 'بونجح', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.986', '2026-08-02 10:52:07.061'),
('ob-f8', 'El Houcine', 'الحسين', 'Gafsi', 'قفصي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.987', '2026-08-02 10:52:07.063'),
('ob-m1', 'Ayoub', 'أيوب', 'Nasri', 'نصري', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.960', '2026-08-02 10:52:07.030'),
('ob-m2', 'Alpha', 'ألفا', 'Sidibé', 'سيديبي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.965', '2026-08-02 10:52:07.035'),
('ob-m3', 'Achref', 'أشرف', 'Afli', 'عفلي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.966', '2026-08-02 10:52:07.037'),
('ob-m4', 'Mohamed Ali', 'محمد علي', 'Ragoubi', 'رقوبي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.969', '2026-08-02 10:52:07.041'),
('ob-m5', 'Idriss', 'إدريس', 'Haboubi', 'حبوبي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.971', '2026-08-02 10:52:07.044'),
('ob-m6', 'Firas', 'فراس', 'Mahdhaoui', 'مهذاوي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.972', '2026-08-02 10:52:07.046'),
('ob-s1', 'Ayoub', 'أيوب', 'Saidi', 'سعيدي', 0, 'team-ob', 'TITULAR', 1, '2026-03-26 19:49:50.935', '2026-08-02 10:52:07.002');

-- --------------------------------------------------------

--
-- Table structure for table `saisons`
--

CREATE TABLE `saisons` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `nom` varchar(255) NOT NULL,
  `type_competition` enum('championnat','coupe','tournois') DEFAULT 'championnat',
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL,
  `league_id` char(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `label_ar` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `saisons`
--

INSERT INTO `saisons` (`id`, `nom`, `type_competition`, `date_debut`, `date_fin`, `league_id`, `created_at`, `is_active`, `label_ar`) VALUES
('42aa25f1-0796-4981-ad84-b79b383502c9', '2025-2026', 'championnat', '2025-08-18', '2026-04-18', '4d929795-b0a2-4db9-8a44-05f8e0d25578', '2025-11-17 13:41:31', 0, NULL),
('46bcc5ec-c821-11f0-86aa-56018b9f5d54', '2025-2026', 'coupe', '2025-08-01', '2026-05-31', '46ba1a85-c821-11f0-86aa-56018b9f5d54', '2025-11-23 11:12:20', 0, NULL),
('68f85e02-adca-47e4-9b9b-4f1731156063', '2025-2026', 'championnat', '2025-09-12', '2026-05-12', '900ebb49-6af2-401f-b2ce-43f783220830', '2025-11-17 13:41:31', 0, NULL),
('7fbaaf72-a912-4644-bce4-973f34fe964b', '2026-2027', 'championnat', '2026-08-22', '2027-06-30', '2136aa04-3718-4a2d-8ed0-54ad6f38033c', '2026-08-01 12:19:09', 0, NULL),
('baee982f-4bd7-450e-ad1f-7f12eeeb3fe3', '2025-2026', 'tournois', '2025-08-25', '2026-04-25', '33fa5498-99b1-4802-8070-ec4dc42ee039', '2025-11-17 13:41:31', 0, NULL),
('eb7ed626-93dc-4ac1-9ec5-24d41aaf70cb', '2025', 'tournois', '2025-12-01', '2025-12-18', 'b5cb50f8-2a54-4781-a20d-7194cb930098', '2025-11-27 13:39:41', 0, NULL),
('eceda276-b6a0-45af-aa67-a15b10f5d5db', '2025-2026', 'championnat', '2025-08-15', '2026-05-20', '2136aa04-3718-4a2d-8ed0-54ad6f38033c', '2025-11-17 13:41:31', 0, NULL),
('season-2526', '2025/2026', 'championnat', NULL, NULL, 'comp-ligue1', '2026-08-02 13:37:57', 0, '2025/2026'),
('season-2526-coupe', '2025/2026', 'coupe', NULL, NULL, 'comp-coupe', '2026-08-02 13:37:57', 0, '2025/2026'),
('season-2627', '2026/2027', 'championnat', NULL, NULL, 'comp-ligue1', '2026-08-02 13:37:57', 1, '2026/2027');

-- --------------------------------------------------------

--
-- Table structure for table `Settings`
--

CREATE TABLE `Settings` (
  `id` varchar(191) NOT NULL,
  `yellowsBeforeSuspend` int(11) NOT NULL DEFAULT 3,
  `redCard1Matches` int(11) NOT NULL DEFAULT 1,
  `redCard2Matches` int(11) NOT NULL DEFAULT 2,
  `redCard3Matches` int(11) NOT NULL DEFAULT 3,
  `yellowFineAmount` decimal(10,3) NOT NULL DEFAULT 30.000,
  `redFineAmount` decimal(10,3) NOT NULL DEFAULT 50.000,
  `fineDueDays` int(11) NOT NULL DEFAULT 15,
  `alertEmails` text NOT NULL,
  `cronFrequency` varchar(191) NOT NULL DEFAULT 'weekly',
  `updatedAt` datetime(3) NOT NULL,
  `federationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Settings`
--

INSERT INTO `Settings` (`id`, `yellowsBeforeSuspend`, `redCard1Matches`, `redCard2Matches`, `redCard3Matches`, `yellowFineAmount`, `redFineAmount`, `fineDueDays`, `alertEmails`, `cronFrequency`, `updatedAt`, `federationId`) VALUES
('settings-default', 3, 1, 2, 3, 30.000, 50.000, 15, 'admin@ob.tn,direction@ob.tn', 'weekly', '2026-03-26 20:17:26.946', '0474fb65-cf01-4229-8d69-b18525f8c1d3');

-- --------------------------------------------------------

--
-- Table structure for table `Suspension`
--

CREATE TABLE `Suspension` (
  `id` varchar(191) NOT NULL,
  `playerId` varchar(191) NOT NULL,
  `cardId` varchar(191) NOT NULL,
  `reason` enum('THREE_YELLOWS','CONSECUTIVE_YELLOWS','RED_CARD_1','RED_CARD_2','RED_CARD_3') NOT NULL,
  `matchesCount` int(11) NOT NULL,
  `matchesPurged` int(11) NOT NULL DEFAULT 0,
  `status` enum('ACTIVE','PURGED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `startMatchId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `teamId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci DEFAULT NULL,
  `disciplinaryDecision` enum('CONFIRMED','MODIFIED','CANCELLED_BY_COMMISSION') NOT NULL DEFAULT 'CONFIRMED',
  `overrideMatchesCount` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Suspension`
--

INSERT INTO `Suspension` (`id`, `playerId`, `cardId`, `reason`, `matchesCount`, `matchesPurged`, `status`, `startMatchId`, `createdAt`, `teamId`, `disciplinaryDecision`, `overrideMatchesCount`) VALUES
('cmn7x2k69000dc9ygpvy1z3vg', 'ob-d2', 'cmn7x2k4o000bc9ygewjq84i8', 'CONSECUTIVE_YELLOWS', 1, 0, 'ACTIVE', NULL, '2026-03-26 20:20:13.855', 'team-ob', 'CONFIRMED', NULL),
('susp-fadhli-j10', 'ob-21', 'card-j10-2', 'THREE_YELLOWS', 1, 0, 'ACTIVE', 'match-ob-j11', '2026-03-26 19:49:51.059', NULL, 'CONFIRMED', NULL),
('susp-hedhli-j5', 'ob-23', 'card-j5-1', 'RED_CARD_1', 1, 1, 'PURGED', NULL, '2026-03-26 19:49:51.057', NULL, 'CONFIRMED', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `teams`
--

CREATE TABLE `teams` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `federation_id` char(36) DEFAULT NULL,
  `abbr` varchar(16) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `nom_en` varchar(255) DEFAULT NULL,
  `nom_ar` varchar(255) DEFAULT NULL,
  `team_type` enum('club','national') NOT NULL DEFAULT 'club',
  `country_code` varchar(3) DEFAULT NULL,
  `sport` enum('football','handball','basketball','volleyball') NOT NULL DEFAULT 'football',
  `age_category` enum('seniors','u21','u20','u19','u18','u17','u16','u15','u14','u13') NOT NULL DEFAULT 'seniors',
  `city` varchar(255) DEFAULT NULL,
  `city_en` varchar(255) DEFAULT NULL,
  `city_ar` varchar(255) DEFAULT NULL,
  `stadium` varchar(255) DEFAULT NULL,
  `stadium_ar` varchar(255) DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `teams`
--

INSERT INTO `teams` (`id`, `federation_id`, `abbr`, `nom`, `nom_en`, `nom_ar`, `team_type`, `country_code`, `sport`, `age_category`, `city`, `city_en`, `city_ar`, `stadium`, `stadium_ar`, `logo_url`, `created_at`) VALUES
('06baf8dd-851e-4f44-8c0c-b72aedabb9b1', NULL, 'ASSE', 'AS Saint-Étienne', 'AS Saint-Etienne', NULL, 'club', 'FRA', 'football', 'seniors', 'Saint-Étienne', 'Saint-Etienne', NULL, 'Stade Geoffroy-Guichard', NULL, 'https://upload.wikimedia.org/wikipedia/en/6/6d/AS_Saint-%C3%89tienne_logo.svg', '2025-11-17 13:41:31'),
('09810b84-f9c7-4bbf-889f-3589d94ef9aa', NULL, 'BAH', 'Bahrain', 'Bahrain', 'البحرين', 'club', 'BH', 'football', 'seniors', 'Manama', 'Manama', 'المنامة', 'Bahrain National Stadium', 'ملعب البحرين الوطني', 'https://example.com/logos/bahrain.png', '2025-11-27 14:17:23'),
('106d7a06-074e-4482-a0c1-6b4b00516abc', NULL, 'EGY', 'Egypt', 'Egypt', 'مصر', 'club', 'EG', 'football', 'seniors', 'Cairo', 'Cairo', 'القاهرة', 'Cairo International Stadium', 'ملعب القاهرة الدولي', 'https://example.com/logos/egypt.png', '2025-11-27 14:17:23'),
('1123f5c9-05d3-407d-89c8-551a313af3a7', NULL, 'MAR', 'Morocco', 'Morocco', 'المغرب', 'club', 'MA', 'football', 'seniors', 'Rabat', 'Rabat', 'الرباط', 'Prince Moulay Abdellah Stadium', 'ملعب الأمير مولاي عبد الله', 'https://example.com/logos/morocco.png', '2025-11-27 14:17:23'),
('115cb576-f2cf-463c-884b-a0d3c5917b70', NULL, 'ESZ', 'Espérance Sportive de Zarzis', 'Esperance Sportive de Zarzis', 'الترجي الرياضي الجرجيسي', 'club', 'TUN', 'football', 'seniors', 'Zarzis', 'Zarzis', 'جرجيس', 'Abdessalam Kazouz Stadium', 'ملعب عبد السلام كازوز', 'https://static.flashscore.com/res/image/data/CrYMZZ7k-Eua5PHRE.png', '2025-11-17 13:41:31'),
('11f6d6aa-4c94-48c4-b228-7beb0f97fb70', NULL, 'ASS', 'Association Sportive de Soliman', 'Association Sportive de Soliman', 'الجمعية الرياضية بسليمان', 'club', 'TUN', 'football', 'seniors', 'Soliman', 'Soliman', 'سليمان', 'Soliman Municipal Stadium', 'الملعب البلدي بسليمان', 'https://static.flashscore.com/res/image/data/EN7rETRq-fZGJDt4L.png', '2025-11-17 13:41:31'),
('14a6c0a7-dc5e-4546-b463-f1ae55737400', NULL, 'LOSC', 'Lille OSC', 'Lille OSC', NULL, 'club', 'FRA', 'football', 'seniors', 'Lille', 'Lille', NULL, 'Decathlon Arena', NULL, 'https://upload.wikimedia.org/wikipedia/en/1/18/Lille_OSC_Logo.svg', '2025-11-17 13:41:31'),
('18c0e17d-b43b-4bc6-bdf4-e789b397383c', NULL, 'USBG', 'Union Sportive de Ben Guerdane', 'US Ben Guerdane', 'الاتحاد الرياضي ببن قردان', 'club', 'TUN', 'football', 'seniors', 'Ben Guerdane', 'Ben Guerdane', 'بنقردان', '7 Mars Stadium', 'ملعب 7 مارس', 'https://static.flashscore.com/res/image/data/xriYShU0-bNN2piW2.png', '2025-11-17 13:41:31'),
('1b60755d-2bc5-42b5-bf42-4ce817792f2a', NULL, 'ASG', 'Avenir Sportif de Gabès', 'Avenir Sportif de Gabes', 'المستقبل الرياضي بقابس', 'club', 'TUN', 'football', 'seniors', 'Gabès', 'Gabes', 'قابس', 'Gabès Municipal Stadium', 'الملعب البلدي بقابس', 'https://static.flashscore.com/res/image/data/lfQj8Ole-EgOnwaeL.png', '2025-11-17 13:41:31'),
('1df9b45b-e06a-41de-b2bf-d1f143fe2252', NULL, 'EST', 'Espérance Sportive de Tunis', 'Esperance Sportive de Tunis', 'الترجي الرياضي التونسي', 'club', 'TUN', 'football', 'seniors', 'Tunis', 'Tunis', 'تونس', 'Hammadi Agrebi Stadium', 'ملعب حمادي العقربي', 'https://static.flashscore.com/res/image/data/MwJ5a4AN-4U9lphOS.png', '2025-11-17 13:41:31'),
('1e2897ff-cf7f-4e47-a67c-741bbc394076', NULL, 'KSA', 'Saudi Arabia', 'Saudi Arabia', 'المملكة العربية السعودية', 'club', 'SA', 'football', 'seniors', 'Riyadh', 'Riyadh', 'الرياض', 'King Fahd Stadium', 'ملعب الملك فهد', 'https://example.com/logos/saudi_arabia.png', '2025-11-27 14:17:23'),
('1f2195f5-d123-4d96-9d95-1f99ec96b077', NULL, 'SMC', 'Stade Malherbe Caen', 'SM Caen', NULL, 'club', 'FRA', 'football', 'seniors', 'Caen', 'Caen', NULL, 'Stade Michel-d\'Ornano', NULL, 'https://upload.wikimedia.org/wikipedia/en/d/d3/Stade_Malherbe_Caen_logo.svg', '2025-11-17 13:41:31'),
('441f37b5-c392-4284-97f1-2ac9b26f24a6', NULL, 'JOR', 'Jordan', 'Jordan', 'الأردن', 'club', 'JO', 'football', 'seniors', 'Amman', 'Amman', 'عمّان', 'Amman International Stadium', 'ملعب عمّان الدولي', 'https://example.com/logos/jordan.png', '2025-11-27 14:17:23'),
('47c1a0c3-e827-4089-95be-29cd8a553fae', NULL, 'PSG', 'Paris Saint-Germain', 'Paris Saint-Germain', NULL, 'club', 'FRA', 'football', 'seniors', 'Paris', 'Paris', NULL, 'Parc des Princes', NULL, 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg', '2025-11-17 13:41:31'),
('4887fbc2-6b67-4408-b91a-72b7f855d5ee', NULL, 'SCB', 'SC Bastia', 'SC Bastia', NULL, 'club', 'FRA', 'football', 'seniors', 'Bastia', 'Bastia', NULL, 'Stade Armand-Cesari', NULL, 'https://upload.wikimedia.org/wikipedia/en/4/4e/SC_Bastia.svg', '2025-11-17 13:41:31'),
('502b7ba7-c302-4f34-8027-a22f0bf9c400', NULL, 'SSB', 'Stade Sportif de Ben Arous', 'Stade Sportif Ben Arous', 'الملعب الرياضي ببن عروس', 'club', 'TUN', 'football', 'seniors', 'Ben Arous', 'Ben Arous', 'بن عروس', 'Stade Ben Arous', 'ملعب بن عروس', NULL, '2025-11-17 13:41:31'),
('50c25d54-404a-4ff6-bb9c-45e88f748db5', NULL, 'CA', 'Club Africain', 'Club Africain', 'النادي الإفريقي', 'club', 'TUN', 'football', 'seniors', 'Tunis', 'Tunis', 'تونس', 'Hammadi Agrebi Stadium', 'ملعب حمادي العقربي', 'https://static.flashscore.com/res/image/data/vRAKqa7k-bob4M53H.png', '2025-11-17 13:41:31'),
('5704ac3f-2246-43c9-b4d6-bd171cca711d', NULL, 'ALG', 'Algeria', 'Algeria', 'الجزائر', 'club', 'DZ', 'football', 'seniors', 'Algiers', 'Algiers', 'الجزائر', 'Stade 5 juillet 1962', 'ملعب 5 يوليو 1962', 'https://example.com/logos/algeria.png', '2025-11-27 14:17:23'),
('58e6bfd7-6876-4221-ba82-0be7e4c898fb', NULL, 'CSS', 'Club Sportif Sfaxien', 'Club Sportif Sfaxien', 'النادي الرياضي الصفاقسي', 'club', 'TUN', 'football', 'seniors', 'Sfax', 'Sfax', 'صفاقس', 'Taïeb Mhiri Stadium', 'ملعب الطيب المهيري', 'https://static.flashscore.com/res/image/data/IJO1iuWH-8QjOsK1t.png', '2025-11-17 13:41:31'),
('6073ac13-c566-4fa4-b0fd-c7bedf724960', NULL, 'CSHL', 'Club Sportif de Hammam-Lif', 'CS Hammam-Lif', 'النادي الرياضي بحمام الأنف', 'club', 'TUN', 'football', 'seniors', 'Hammam-Lif', 'Hammam-Lif', 'حمام الأنف', 'Stade Bou Kornine', 'ملعب بوقرنين', 'https://static.flashscore.com/res/image/data/WjlpXfiT-25iFJh20.png', '2025-11-17 13:41:31'),
('621863f9-2393-4941-b6a1-a44addcb592c', NULL, 'JSK', 'Jeunesse Sportive Kairouanaise', 'Jeunesse Sportive Kairouanaise', 'الشبيبة الرياضية القيروانية', 'club', 'TUN', 'football', 'seniors', 'Kairouan', 'Kairouan', 'القيروان', 'Hamda Laaouani Stadium', 'ملعب حمودة العويني', 'https://static.flashscore.com/res/image/data/8Ah2sSPq-beBXmIt1.png', '2025-11-17 13:41:31'),
('68bf3318-3455-476f-b8ae-7ccb80cf14c6', NULL, 'SYR', 'Syria', 'Syria', 'سوريا', 'club', 'SY', 'football', 'seniors', 'Damascus', 'Damascus', 'دمشق', 'Omayyad Stadium', 'ملعب الأموي', 'https://ssl.gstatic.com/onebox/media/sports/logos/cMgv_RuiGwBvVL3hv7kSGQ_96x96.png', '2025-11-27 14:17:23'),
('6c67b885-6ab0-4b6c-87fa-04db3949ce09', NULL, 'JSO', 'Jeunesse Sportive d’El Omrane', 'Jeunesse Sportive d’El Omrane', 'الشبيبة الرياضية بالعمران', 'club', 'TUN', 'football', 'seniors', 'Tunis (El Omrane)', 'Tunis (El Omrane)', 'تونس (العمران)', 'Chedly Zouiten Stadium', 'ملعب الشاذلي زويتن', 'https://static.flashscore.com/res/image/data/hIOWhuXH-n1oCCiBU.png', '2025-11-17 13:41:31'),
('7984f67f-66ae-42bb-b1fe-8360f07f99ee', NULL, 'OMA', 'Oman', 'Oman', 'عمان', 'club', 'OM', 'football', 'seniors', 'Muscat', 'Muscat', 'مسقط', 'Sultan Qaboos Sports Complex', 'مجمع السلطان قابوس الرياضي', 'https://example.com/logos/oman.png', '2025-11-27 14:17:23'),
('7a7c6ab0-0c98-495d-9237-11de8528535a', NULL, 'CAB', 'Club Athlétique Bizertin', 'Club Athletique Bizertin', 'النادي الرياضي البنزرتي', 'club', 'TUN', 'football', 'seniors', 'Bizerte', 'Bizerte', 'بنزرت', '15 Octobre Stadium', 'ملعب 15 أكتوبر', 'https://static.flashscore.com/res/image/data/xbeeIiT0-bwMs7FAf.png', '2025-11-17 13:41:31'),
('7d1a1ff0-c4cf-45aa-b753-d186e1fa6fc0', NULL, 'IRQ', 'Iraq', 'Iraq', 'العراق', 'club', 'IQ', 'football', 'seniors', 'Baghdad', 'Baghdad', 'بغداد', 'Basra Stadium', 'ملعب البصرة', 'https://example.com/logos/iraq.png', '2025-11-27 14:17:23'),
('7fe5613c-c3c4-4d09-a721-45434df61e1a', NULL, 'FCGB', 'Girondins de Bordeaux', 'FC Girondins de Bordeaux', NULL, 'club', 'FRA', 'football', 'seniors', 'Bordeaux', 'Bordeaux', NULL, 'Matmut Atlantique', NULL, 'https://upload.wikimedia.org/wikipedia/en/1/15/FC_Girondins_de_Bordeaux_logo.svg', '2025-11-17 13:41:31'),
('86e638ae-4702-4844-a16a-75c7a5ee8644', NULL, 'EAG', 'En Avant Guingamp', 'EA Guingamp', NULL, 'club', 'FRA', 'football', 'seniors', 'Guingamp', 'Guingamp', NULL, 'Stade du Roudourou', NULL, 'https://upload.wikimedia.org/wikipedia/en/7/72/En_Avant_Guingamp_logo.svg', '2025-11-17 13:41:31'),
('8a0922d3-063d-409f-9697-175e09069bff', NULL, 'FCM', 'FC Metz', 'FC Metz', NULL, 'club', 'FRA', 'football', 'seniors', 'Metz', 'Metz', NULL, 'Stade Saint-Symphorien', NULL, 'https://upload.wikimedia.org/wikipedia/en/6/63/FC_Metz_logo.svg', '2025-11-17 13:41:31'),
('9af94026-b63c-4689-ad02-8b7bde6fd810', NULL, 'USMO', 'Union Sportive Monastirienne', 'US Monastir', 'الاتحاد الرياضي المنستيري', 'club', 'TUN', 'football', 'seniors', 'Monastir', 'Monastir', 'المنستير', 'Mustapha Ben Jannet Stadium', 'ملعب مصطفى بن جنات', 'https://static.flashscore.com/res/image/data/2qGoLPU0-OlRcOd3K.png', '2025-11-17 13:41:31'),
('9b3e2a67-b5d1-49e3-9aaa-5594dc1facb2', NULL, 'ESS', 'Étoile Sportive du Sahel', 'Etoile Sportive du Sahel', 'النجم الرياضي الساحلي', 'club', 'TUN', 'football', 'seniors', 'Sousse', 'Sousse', 'سوسة', 'Sousse Olympic Stadium', 'الملعب الأولمبي بسوسة', 'https://static.flashscore.com/res/image/data/bqiV7K7k-8flds5zI.png', '2025-11-17 13:41:31'),
('9be646ee-6c2f-4c23-9ca8-bc993b956a48', NULL, 'QAT', 'Qatar', 'Qatar', 'قطر', 'club', 'QA', 'football', 'seniors', 'Doha', 'Doha', 'الدوحة', 'Lusail Stadium', 'ملعب لوسيل', 'https://example.com/logos/qatar.png', '2025-11-27 14:17:23'),
('9f25c163-ece5-4970-b94d-08940772471f', NULL, 'OMD', 'Olympique de Médenine', 'Olympique de Medenine', 'الأولمبيك الرياضي بمدنين', 'club', 'TUN', 'football', 'seniors', 'Médenine', 'Medenine', 'مدنين', 'Stade de Médenine', 'ملعب مدنين', NULL, '2025-11-17 13:41:31'),
('a9430a9a-43b2-41cf-8958-13763a033f2f', NULL, 'ASM', 'Avenir Sportif de La Marsa', 'Avenir Sportif de La Marsa', 'المستقبل الرياضي بالمرسى', 'club', 'TUN', 'football', 'seniors', 'La Marsa (Tunis)', 'La Marsa', 'المرسى', 'Abdelaziz Chtioui Stadium', 'ملعب عبد العزيز الشتيوي', 'https://static.flashscore.com/res/image/data/fZvCLvAN-zgzLiH7t.png', '2025-11-17 13:41:31'),
('ac880274-5bba-4f9d-bc91-b702f44f3c93', NULL, 'RCL', 'RC Lens', 'RC Lens', NULL, 'club', NULL, 'football', 'seniors', 'Lens', 'Lens', NULL, 'Stade Bollaert-Delelis', NULL, 'https://upload.wikimedia.org/wikipedia/en/c/c7/RC_Lens_logo.svg', '2025-11-17 13:41:31'),
('bf490bff-8278-49bd-868f-030a7243ad42', NULL, 'OL', 'Olympique Lyonnais', 'Olympique Lyonnais', NULL, 'club', 'FRA', 'football', 'seniors', 'Lyon', 'Lyon', NULL, 'Groupama Stadium', NULL, 'https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg', '2025-11-17 13:41:31'),
('c45f9ece-db4f-4f47-8511-29a8d59d69c5', NULL, 'TUN', 'Tunisia', 'Tunisia', 'تونس', 'club', 'TN', 'football', 'seniors', 'Tunis', 'Tunis', 'تونس', 'Rades Stadium', 'ملعب الرادس', 'https://ssl.gstatic.com/onebox/media/sports/logos/Xs33c9XVUJBX0IkeFn_bIw_96x96.png', '2025-11-27 14:17:23'),
('ccd51ed0-80f7-4ef0-872c-90fc0ed9bdff', NULL, 'ESM', 'Étoile Sportive de Métlaoui', 'Etoile Sportive de Metlaoui', 'النجم الرياضي بالمتلوي', 'club', 'TUN', 'football', 'seniors', 'Métlaoui', 'Metlaoui', 'المتلوي', 'Métlaoui Municipal Stadium', 'الملعب البلدي بالمتلوي', 'https://static.flashscore.com/res/image/data/hjsxnmgT-xQxsaZ8c.png', '2025-11-17 13:41:31'),
('d2790980-a60f-4567-b572-5d847071ff2f', NULL, 'SUD', 'Sudan', 'Sudan', 'السودان', 'club', 'SD', 'football', 'seniors', 'Khartoum', 'Khartoum', 'الخرطوم', 'Khartoum Stadium', 'ملعب الخرطوم', 'https://example.com/logos/sudan.png', '2025-11-27 14:17:23'),
('d7fd9a17-b833-4494-815a-cdf40046fe3f', NULL, 'KUW', 'Kuwait', 'Kuwait', 'الكويت', 'club', 'KW', 'football', 'seniors', 'Kuwait City', 'Kuwait City', 'مدينة الكويت', 'Jaber Al-Ahmed Al-Sabah Stadium', 'ملعب جابر العبد الله الصباح', 'https://example.com/logos/kuwait.png', '2025-11-27 14:17:23'),
('d99c3053-4c32-451c-84b4-74c3236a6d65', NULL, 'OB', 'Olympique Béja', 'Olympique Beja', 'الأولمبي الباجي', 'club', 'TUN', 'football', 'seniors', 'Béja', 'Beja', 'باجة', 'Boujemâa Kmiti Stadium', 'ملعب بوجمعة الكميتي', 'https://static.flashscore.com/res/image/data/fHCZTY7k-lhdmzxg9.png', '2025-11-17 13:41:31'),
('dd359690-d4fa-437d-a9ca-d36a42483335', NULL, 'UAE', 'United Arab Emirates', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'club', 'AE', 'football', 'seniors', 'Abu Dhabi', 'Abu Dhabi', 'أبو ظبي', 'Zayed Stadium', 'ملعب زايد', 'https://example.com/logos/uae.png', '2025-11-27 14:17:23'),
('dd5c81cd-8da4-11f1-862a-368e37a00996', NULL, 'USHS', 'Union Sportive Hammam-Sousse', 'US Hammam-Sousse', 'الاتحاد الرياضي بحمام سوسة', 'club', 'TUN', 'football', 'seniors', 'Hammam Sousse', 'Hammam Sousse', 'حمام سوسة', NULL, NULL, 'https://static.flashscore.com/res/image/data/AuA8BM76-OIM3sMvL.png', '2026-08-01 12:31:05'),
('dd5d38a9-8da4-11f1-862a-368e37a00996', NULL, 'PSS', 'Progrès Sportif Sakiet Eddaier', 'PS Sakiet Eddaier', 'التقدم الرياضي بساقية الداير', 'club', 'TUN', 'football', 'seniors', 'Sakiet Eddaier', 'Sakiet Eddaier', 'ساقية الداير', NULL, NULL, 'https://static.flashscore.com/res/image/data/YiCgLqlC-00k8hxzT.png', '2026-08-01 12:31:05'),
('e1f0dc3f-ff29-46ea-b111-25295a9f263f', NULL, 'UST', 'Union Sportive de Tataouine', 'US Tataouine', 'الإتحاد الرياضي بتطاوين', 'club', 'TUN', 'football', 'seniors', 'Tataouine', 'Tataouine', 'تطاوين', 'Stade Najib Khattab', 'ملعب نجيب الخطاب', NULL, '2025-11-17 13:41:31'),
('e6f9c92f-96c4-4b26-b7d3-17acdc2af701', NULL, 'OM', 'Olympique de Marseille', 'Olympique de Marseille', NULL, 'club', 'FRA', 'football', 'seniors', 'Marseille', 'Marseille', NULL, 'Orange Vélodrome', NULL, 'https://upload.wikimedia.org/wikipedia/en/5/5c/Olympique_Marseille_logo.svg', '2025-11-17 13:41:31'),
('e72cfeee-54c4-4ffb-8d85-ed794b225dbb', NULL, 'COM', 'Comoros', 'Comoros', 'جزر القمر', 'club', 'KM', 'football', 'seniors', 'Moroni', 'Moroni', 'موروني', 'Stade de Moroni', 'ملعب موروني', 'https://example.com/logos/comoros.png', '2025-11-27 14:17:23'),
('ea090fa2-b5f0-4858-8dc7-5d601a027895', NULL, 'JDS', 'Jendouba Sport', 'Jendouba Sport', 'جندوبة سبور', 'club', 'TUN', 'football', 'seniors', 'Jendouba', 'Jendouba', 'جندوبة', 'Stade Municipal de Jendouba', 'الملعب البلدي بجندوبة', NULL, '2025-11-17 13:41:31'),
('f03f3a80-2164-46f3-b44a-5d63815a77af', NULL, 'EGS', 'Espoir Sportif de Gafsa', 'ES Gafsa', 'الأمل الرياضي بقفصة', 'club', 'TUN', 'football', 'seniors', 'Gafsa', 'Gafsa', 'قفصة', 'Stade de Gafsa', 'ملعب قفصة', NULL, '2025-11-17 13:41:31'),
('f266ee4e-1103-43f0-8386-eb28c0989276', NULL, 'MON', 'AS Monaco', 'AS Monaco', NULL, 'club', NULL, 'football', 'seniors', 'Monaco', 'Monaco', NULL, 'Stade Louis-II', NULL, 'https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC_2015.svg', '2025-11-17 13:41:31'),
('f31ddaea-523b-4f0a-a7db-f66ab823d7f0', NULL, 'ST', 'Stade Tunisien', 'Stade Tunisien', 'الملعب التونسي', 'club', 'TUN', 'football', 'seniors', 'Tunis (Le Bardo)', 'Tunis (Le Bardo)', 'تونس (الباردو)', 'Hédi Enneifer Stadium', 'ملعب الهادي النيفر', 'https://static.flashscore.com/res/image/data/O4tnXRT0-GOX2DTa1.png', '2025-11-17 13:41:31'),
('fe3183cd-9a7c-44d3-b524-625261081771', NULL, 'PAL', 'Palestine', 'Palestine', 'فلسطين', 'club', 'PS', 'football', 'seniors', 'Ramallah', 'Ramallah', 'رام الله', 'Palestine Stadium', 'ملعب فلسطين', 'https://example.com/logos/palestine.png', '2025-11-27 14:17:23'),
('team-ass', '0474fb65-cf01-4229-8d69-b18525f8c1d3', 'AS Soliman', 'Avenir sportif de Soliman', NULL, 'المستقبل الرياضي بسليمان', 'club', NULL, 'football', 'seniors', NULL, NULL, NULL, NULL, NULL, 'https://content.mosaiquefm.net/uploads/sportTeam/small/1698217647.png', '2026-08-02 13:50:14'),
('team-esm', '0474fb65-cf01-4229-8d69-b18525f8c1d3', NULL, 'Espoir sportif de Metlaoui', NULL, 'أمل الرياضي المتلوي', 'club', NULL, 'football', 'seniors', NULL, NULL, NULL, NULL, NULL, 'https://content.mosaiquefm.net/uploads/sportTeam/small/1698219006.png', '2026-08-02 13:50:14'),
('team-esz', '0474fb65-cf01-4229-8d69-b18525f8c1d3', NULL, 'Espoir sportif de Zarzis', NULL, 'الترجي الرياضي الجرجسي', 'club', NULL, 'football', 'seniors', NULL, NULL, NULL, NULL, NULL, 'https://content.mosaiquefm.net/uploads/sportTeam/small/1730116366.png', '2026-08-02 13:50:14'),
('team-jso', '0474fb65-cf01-4229-8d69-b18525f8c1d3', NULL, 'Jeunesse sportive d\'El Omrane', NULL, 'الشبيبة الرياضية بالعمران', 'club', NULL, 'football', 'seniors', NULL, NULL, NULL, NULL, NULL, 'https://content.mosaiquefm.net/uploads/sportTeam/small/1730116503.png', '2026-08-02 13:50:14'),
('team-ob', '0474fb65-cf01-4229-8d69-b18525f8c1d3', NULL, 'Olympique de Béja', NULL, 'الأولمبي الباجي', 'club', NULL, 'football', 'seniors', NULL, NULL, NULL, NULL, NULL, 'https://content.mosaiquefm.net/uploads/sportTeam/small/1683110289.png', '2026-08-02 13:50:14');

-- --------------------------------------------------------

--
-- Table structure for table `User`
--

CREATE TABLE `User` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `role` enum('ADMIN','OBSERVATEUR','SUPERADMIN') NOT NULL DEFAULT 'OBSERVATEUR',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `teamId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `User`
--

INSERT INTO `User` (`id`, `name`, `email`, `password`, `role`, `isActive`, `createdAt`, `updatedAt`, `teamId`) VALUES
('cmsbxli0h0000zryg3ie8ykcv', 'Admin Club Africain (test)', 'admin@club-africain.test', '$2b$12$fqiXWZNsPxlpytlI5iVSJevdYer5/NDsCuktKwxSSaYPaMiksryay', 'ADMIN', 1, '2026-08-02 15:04:33.899', '2026-08-02 15:04:33.899', '50c25d54-404a-4ff6-bb9c-45e88f748db5'),
('user-admin', 'Admin OB', 'admin@ob.tn', '$2b$12$3p2vJ28t1dDqAsuaIyvAyOkR1TYe3861dF1H2U6QAEjwmOPjd8XPu', 'ADMIN', 1, '2026-03-26 19:49:50.774', '2026-08-02 10:52:06.789', 'team-ob'),
('user-coach', 'Entraîneur', 'coach@ob.tn', '$2b$12$3p2vJ28t1dDqAsuaIyvAyOkR1TYe3861dF1H2U6QAEjwmOPjd8XPu', 'OBSERVATEUR', 1, '2026-03-26 19:49:50.798', '2026-08-02 10:52:06.841', 'team-ob'),
('user-default', 'Utilisateur par défaut', 'user@ob.tn', '$2b$12$3p2vJ28t1dDqAsuaIyvAyOkR1TYe3861dF1H2U6QAEjwmOPjd8XPu', 'OBSERVATEUR', 1, '2026-03-26 19:49:50.793', '2026-08-02 10:52:06.837', 'team-ob'),
('user-direction', 'Direction Sportive', 'direction@ob.tn', '$2b$12$3p2vJ28t1dDqAsuaIyvAyOkR1TYe3861dF1H2U6QAEjwmOPjd8XPu', 'ADMIN', 1, '2026-03-26 19:49:50.785', '2026-08-02 10:52:06.832', 'team-ob'),
('user-secretaire', 'Secrétaire Général', 'secretaire@ob.tn', '$2b$12$3p2vJ28t1dDqAsuaIyvAyOkR1TYe3861dF1H2U6QAEjwmOPjd8XPu', 'OBSERVATEUR', 1, '2026-03-26 19:49:50.802', '2026-08-02 10:52:06.844', 'team-ob');

-- --------------------------------------------------------

--
-- Table structure for table `votes`
--

CREATE TABLE `votes` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `match_id` char(36) NOT NULL,
  `arbitre_id` char(36) NOT NULL,
  `criteres` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`criteres`)),
  `note_globale` decimal(5,2) NOT NULL,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `moderation_status` enum('pending','validated','excluded') DEFAULT 'pending',
  `moderated_at` datetime DEFAULT NULL,
  `moderated_by` varchar(36) DEFAULT NULL,
  `moderation_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `votes`
--

INSERT INTO `votes` (`id`, `match_id`, `arbitre_id`, `criteres`, `note_globale`, `device_fingerprint`, `ip_address`, `moderation_status`, `moderated_at`, `moderated_by`, `moderation_notes`, `created_at`) VALUES
('024adb05-3e18-46f9-a648-43755591b95e', '2fe018d6-7095-4e88-89db-4f52a231f793', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":4,\"decisions\":3,\"deplacement\":4,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 4.33, 'eecea206b30e52cb8a0e887a33ca82bc', NULL, 'pending', NULL, NULL, NULL, '2025-11-22 16:29:41'),
('11ab1e14-a472-4d85-9b70-08b0e4c242a3', '53d3edaa-2c09-440a-8658-60e6dfafd2ed', 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '{\"communication\":1,\"decisions\":3,\"deplacement\":2,\"sifflet\":3,\"var_qualite\":3,\"assistant_collaboration\":3}', 2.50, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:22:12'),
('11f21844-d6e4-4db6-9f14-b72bfed3c25f', '1cc85cdf-2195-4da6-8bef-a28cbb5eb252', '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:21:52'),
('12194d0d-9d8d-48b4-9526-02df65bdf368', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":3,\"decisions\":3,\"deplacement\":4,\"sifflet\":3,\"var_qualite\":2,\"assistant_collaboration\":4}', 3.17, '1df3e26d75941f7ba178ee5f60ebd29b', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 08:05:36'),
('1ef262bd-be0e-4444-8a1f-e6844eae8d7c', 'b2b6e366-13b4-419b-a44c-25712c7b5188', 'b5608682-9950-486e-bafd-3078cec401ba', '{\"communication\":1,\"decisions\":3,\"deplacement\":1,\"sifflet\":4,\"var_qualite\":2,\"assistant_collaboration\":4}', 2.50, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:22:32'),
('24be9338-9fc7-4596-9783-8251f0b1bfd4', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":2,\"decisions\":4,\"deplacement\":4,\"sifflet\":4,\"var_qualite\":4,\"assistant_collaboration\":4}', 3.67, 'cca0100a9e265cf4f4fdea1d5686b1f6', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 08:11:13'),
('27b3a413-e6ce-4168-8091-b018404a9ed7', '1acf759a-34e0-4d01-b722-839a8d1c54c9', 'a8d247fb-dc14-4254-97df-fbfddb79d506', '{\"communication\":4,\"decisions\":4,\"deplacement\":3,\"sifflet\":3,\"var_qualite\":3,\"assistant_collaboration\":4}', 3.50, 'eecea206b30e52cb8a0e887a33ca82bc', NULL, 'pending', NULL, NULL, NULL, '2025-11-17 14:14:47'),
('2a5cd87a-62dd-4938-bd4f-66fc02ac91e8', '2fe018d6-7095-4e88-89db-4f52a231f793', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":2,\"decisions\":3,\"deplacement\":3,\"sifflet\":4,\"var_qualite\":2,\"assistant_collaboration\":4}', 3.00, 'a8d439922eab370b4dd10b892278dba9', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:24:34'),
('2aeb4d80-bedf-4d1b-be99-5e206cd3c5a4', 'b8972b36-d1ad-43f4-871d-d7f9f845af07', '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '{\"communication\":2,\"decisions\":4,\"deplacement\":2,\"sifflet\":3,\"var_qualite\":4,\"assistant_collaboration\":3}', 3.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:22:51'),
('2f7c8179-0428-484b-9c5c-42c593538be5', '5a43e33a-a575-4a2b-8bd4-863361bdad33', 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:23:01'),
('33196770-9279-4e29-b9d6-5547e483cf37', '00de38ee-73c9-4930-9ce4-7d4387e4a06f', '4fb6b839-5c6e-4613-a202-a491046c937d', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:21:37'),
('354a7e31-d37d-4d20-a886-5fce8c8621f8', 'a710d2c4-a361-4fda-8107-79f6d4efad82', '9d434827-cb60-4d7f-9946-2eed37dddc84', '{\"communication\":2,\"decisions\":3,\"deplacement\":1,\"sifflet\":3,\"var_qualite\":3,\"assistant_collaboration\":1}', 2.17, 'a8d439922eab370b4dd10b892278dba9', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:24:54'),
('37c7b41b-1a6f-458d-b07a-f137edbcd8d9', '6683d9c4-1d9e-49a5-8df9-4bdb0402b3a0', '3d7077da-436a-43c7-952d-9873bd5be225', '{\"communication\":1,\"decisions\":1,\"deplacement\":1,\"sifflet\":1,\"var_qualite\":1,\"assistant_collaboration\":1}', 1.00, 'c4b090027cb197ef93bd29bec813f5b6', NULL, 'pending', NULL, NULL, NULL, '2025-11-26 10:56:45'),
('3a41ab4e-5ff6-4cc1-b050-ccbbd2f60702', 'a710d2c4-a361-4fda-8107-79f6d4efad82', '9d434827-cb60-4d7f-9946-2eed37dddc84', '{\"communication\":4,\"decisions\":3,\"deplacement\":4,\"sifflet\":3,\"var_qualite\":4,\"assistant_collaboration\":1}', 3.17, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:21:40'),
('3f68ba15-b5cb-48be-87fd-f88def4ce578', '33576bf2-3a85-4e15-9249-47dd6e8af0aa', '2bc18c95-59ac-43e7-9797-058a7f68825e', '{\"communication\":3,\"decisions\":4,\"deplacement\":4,\"sifflet\":2,\"var_qualite\":1,\"assistant_collaboration\":4}', 3.00, '1df3e26d75941f7ba178ee5f60ebd29b', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 09:37:00'),
('41b5a6e1-eed3-44ee-bcaa-f3a66b0a43d3', 'ae7a30df-a7e7-4470-88f8-62b3a7c0b16e', 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'eecea206b30e52cb8a0e887a33ca82bc', NULL, 'pending', NULL, NULL, NULL, '2025-11-17 14:15:10'),
('52195236-e9ec-475f-acf3-1280b47044db', 'cd16f122-22af-432e-93da-f76789fbb828', '9101a9b6-dad6-4b19-bc74-4930429e1aa0', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:22:42'),
('530b9c31-22e5-4cc6-b1ac-b487fb25773b', '53d3edaa-2c09-440a-8658-60e6dfafd2ed', 'a642b107-ab33-4cbd-b1ac-9b831ee7ca73', '{\"communication\":5,\"decisions\":1,\"deplacement\":1,\"sifflet\":1,\"var_qualite\":1,\"assistant_collaboration\":1}', 1.67, 'a8d439922eab370b4dd10b892278dba9', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:25:19'),
('65578761-332a-4ab4-85d6-d3b47e8b27c3', 'd181648e-f8b0-41ca-8094-36099227e0a6', 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:21:22'),
('6ac42ac7-2adb-447d-b296-9a479f614601', 'b2b6e366-13b4-419b-a44c-25712c7b5188', 'b5608682-9950-486e-bafd-3078cec401ba', '{\"communication\":3,\"decisions\":1,\"deplacement\":3,\"sifflet\":1,\"var_qualite\":3,\"assistant_collaboration\":1}', 2.00, 'a8d439922eab370b4dd10b892278dba9', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:26:06'),
('73122420-04fc-4d7d-ba69-1fc10dcb172b', '80bce5ed-915e-42a7-b57d-2abf5195b063', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'eecea206b30e52cb8a0e887a33ca82bc', NULL, 'pending', NULL, NULL, NULL, '2025-11-21 16:37:15'),
('7b01d4c2-891f-466c-976e-84fccae113f4', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":3,\"decisions\":3,\"deplacement\":1,\"sifflet\":1,\"var_qualite\":2,\"assistant_collaboration\":2}', 2.00, 'a8d439922eab370b4dd10b892278dba9', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:24:09'),
('7e59e01c-eb1d-477e-887f-a2f8cecd00f9', '18c4e7a3-e10b-4c43-a83e-ec169277d4a9', '2bc18c95-59ac-43e7-9797-058a7f68825e', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:20:12'),
('82ea0ee9-7dd1-4b94-a817-7c9bb3bd3231', 'b8972b36-d1ad-43f4-871d-d7f9f845af07', '12ace6bc-4bc4-4339-8c7e-22d8402c1fee', '{\"communication\":2,\"decisions\":2,\"deplacement\":1,\"sifflet\":3,\"var_qualite\":4,\"assistant_collaboration\":3}', 2.50, 'a8d439922eab370b4dd10b892278dba9', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:26:23'),
('844ce7d5-43f0-432d-879c-c5ea8940cd5c', '2fe018d6-7095-4e88-89db-4f52a231f793', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":3,\"decisions\":4,\"deplacement\":4,\"sifflet\":3,\"var_qualite\":3,\"assistant_collaboration\":3}', 3.33, '13c68e6b69c621455b09ef99d8702190', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 16:35:11'),
('8dbfb703-0333-4d65-98a1-4f8c70ee2dd3', 'd1750e18-8ea9-4f7a-a1c8-ed52d8aa8e96', '28c6cb0a-1226-45d4-9b3f-bd576c5f9a71', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:20:32'),
('904c3b83-deb2-40cb-9e07-6f3792ec567e', '80bce5ed-915e-42a7-b57d-2abf5195b063', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":1,\"decisions\":3,\"deplacement\":4,\"sifflet\":1,\"var_qualite\":3,\"assistant_collaboration\":4}', 2.67, '1a9a9953756b6782ead2d29354c4b584', NULL, 'pending', NULL, NULL, NULL, '2025-11-21 22:09:02'),
('91237516-9d99-4f59-a243-d5ad984af459', 'a710d2c4-a361-4fda-8107-79f6d4efad82', '9d434827-cb60-4d7f-9946-2eed37dddc84', '{\"communication\":3,\"decisions\":3,\"deplacement\":3,\"sifflet\":3,\"var_qualite\":4,\"assistant_collaboration\":3}', 3.17, '1df3e26d75941f7ba178ee5f60ebd29b', NULL, 'pending', NULL, NULL, NULL, '2025-11-22 19:57:51'),
('95b2aacf-1025-46bc-8748-f3b7a5ba2b8e', '2ad280e6-f52a-432a-a8ac-89a9c9185abe', '4fb6b839-5c6e-4613-a202-a491046c937d', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:22:27'),
('9bf92919-7bce-4dfa-843a-747f31992665', '4bedc666-0208-4874-b5c8-9f61b4cde4a1', 'b39c9bf9-ba79-4df1-a184-370e490f66a0', '{\"communication\":1,\"decisions\":2,\"deplacement\":3,\"sifflet\":3,\"var_qualite\":1,\"assistant_collaboration\":5}', 2.50, '1d1ddfbadafa275092846f0613a0b941', NULL, 'pending', NULL, NULL, NULL, '2025-11-22 01:24:32'),
('ae99b9eb-bee1-46be-9ac5-f5d7717d8025', '6683d9c4-1d9e-49a5-8df9-4bdb0402b3a0', '3d7077da-436a-43c7-952d-9873bd5be225', '{\"communication\":2,\"decisions\":3,\"deplacement\":1,\"sifflet\":4,\"var_qualite\":1,\"assistant_collaboration\":1}', 2.00, 'a8d439922eab370b4dd10b892278dba9', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:25:44'),
('aeec13b1-ef04-459a-9bf5-e7aa610faa69', '6683d9c4-1d9e-49a5-8df9-4bdb0402b3a0', '3d7077da-436a-43c7-952d-9873bd5be225', '{\"communication\":1,\"decisions\":3,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 4.00, '22cf459260a8e3b502f4a02f5b3c2bb7', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 16:31:43'),
('b758b1ec-afdb-4ab9-a141-c35c823d4d18', 'b2b6e366-13b4-419b-a44c-25712c7b5188', 'b5608682-9950-486e-bafd-3078cec401ba', '{\"communication\":4,\"decisions\":3,\"deplacement\":5,\"sifflet\":3,\"var_qualite\":2,\"assistant_collaboration\":4}', 3.50, '6126d058b7591a7bab241b5247d4a7af', NULL, 'pending', NULL, NULL, NULL, '2025-11-25 11:40:41'),
('b89d7bfc-4642-4c78-8389-c6f21ac8d887', '6683d9c4-1d9e-49a5-8df9-4bdb0402b3a0', '3d7077da-436a-43c7-952d-9873bd5be225', '{\"communication\":4,\"decisions\":3,\"deplacement\":3,\"sifflet\":2,\"var_qualite\":4,\"assistant_collaboration\":4}', 3.33, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 16:03:13'),
('b8c20607-d9f8-4844-a3b3-eadc2417ec31', '84a8f850-bc27-4cfa-8429-1b0c408c653e', 'bdd4fb56-f7e9-422f-b802-44007ac2b061', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:21:09'),
('ba30cfc9-db2a-431d-af93-7e7478837de2', '1c041fbc-544c-4468-b38f-9472445a0dd0', '527bf814-1273-4c64-9fdf-b04768c87516', '{\"communication\":3,\"decisions\":4,\"deplacement\":3,\"sifflet\":3,\"var_qualite\":3,\"assistant_collaboration\":3}', 3.17, 'eecea206b30e52cb8a0e887a33ca82bc', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 11:39:43'),
('bd46722b-dabf-4374-a795-2ce1b6f04996', 'a710d2c4-a361-4fda-8107-79f6d4efad82', '9d434827-cb60-4d7f-9946-2eed37dddc84', '{\"communication\":4,\"decisions\":2,\"deplacement\":4,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":3}', 3.83, 'eecea206b30e52cb8a0e887a33ca82bc', NULL, 'pending', NULL, NULL, NULL, '2025-11-22 16:26:15'),
('c5695055-6130-47c6-8493-66b8a81687b6', 'a4d94424-f5cf-4064-b8f3-7e717c1515b0', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":3,\"decisions\":5,\"deplacement\":2,\"sifflet\":4,\"var_qualite\":4,\"assistant_collaboration\":2}', 3.33, '22cf459260a8e3b502f4a02f5b3c2bb7', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:28:48'),
('c766392f-eff2-4ef1-b178-cb2cfc3ba0eb', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":2,\"decisions\":4,\"deplacement\":3,\"sifflet\":5,\"var_qualite\":3,\"assistant_collaboration\":4}', 3.50, 'eecea206b30e52cb8a0e887a33ca82bc', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 08:43:10'),
('c8f4e825-0445-4ab6-9876-06fc2222815d', '2fe018d6-7095-4e88-89db-4f52a231f793', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":1,\"decisions\":2,\"deplacement\":3,\"sifflet\":1,\"var_qualite\":3,\"assistant_collaboration\":3}', 2.17, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:21:15'),
('d701a925-a710-4cbd-be9a-3273943a97f5', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":2,\"decisions\":1,\"deplacement\":3,\"sifflet\":1,\"var_qualite\":4,\"assistant_collaboration\":4}', 2.50, '3083ae56c7b5a3875473aaf3bb0bbc23', NULL, 'pending', NULL, NULL, NULL, '2025-11-25 19:55:21'),
('d94509db-0f64-4597-b050-8aaa945d3ce3', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":2,\"decisions\":4,\"deplacement\":3,\"sifflet\":2,\"var_qualite\":4,\"assistant_collaboration\":4}', 3.17, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 17:20:47'),
('da62963d-8d1e-4d06-a75e-5ea0315fea94', '2fe018d6-7095-4e88-89db-4f52a231f793', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":2,\"decisions\":4,\"deplacement\":2,\"sifflet\":2,\"var_qualite\":3,\"assistant_collaboration\":3}', 2.67, 'c4b090027cb197ef93bd29bec813f5b6', NULL, 'pending', NULL, NULL, NULL, '2025-11-26 10:56:13'),
('e9b83faf-caa9-448b-8483-37ab704c0777', 'a710d2c4-a361-4fda-8107-79f6d4efad82', '9d434827-cb60-4d7f-9946-2eed37dddc84', '{\"communication\":4,\"decisions\":2,\"deplacement\":4,\"sifflet\":4,\"var_qualite\":3,\"assistant_collaboration\":3}', 3.33, 'c4b090027cb197ef93bd29bec813f5b6', NULL, 'pending', NULL, NULL, NULL, '2025-11-26 11:00:40'),
('ed88b434-125a-42d4-a138-fa0365f08653', 'a710d2c4-a361-4fda-8107-79f6d4efad82', '9d434827-cb60-4d7f-9946-2eed37dddc84', '{\"communication\":2,\"decisions\":3,\"deplacement\":2,\"sifflet\":3,\"var_qualite\":3,\"assistant_collaboration\":3}', 2.67, '3083ae56c7b5a3875473aaf3bb0bbc23', NULL, 'pending', NULL, NULL, NULL, '2025-11-26 23:05:34'),
('ee0bb28b-773b-40a1-8f21-ac91ce0120fa', '2fe018d6-7095-4e88-89db-4f52a231f793', '09a09383-a22e-449e-b6bd-64bcbc6fb0cd', '{\"communication\":1,\"decisions\":3,\"deplacement\":2,\"sifflet\":4,\"var_qualite\":1,\"assistant_collaboration\":1}', 2.00, '1df3e26d75941f7ba178ee5f60ebd29b', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 08:05:52'),
('f3303f66-a231-479c-934c-6f0cefd973b4', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":2,\"decisions\":4,\"deplacement\":2,\"sifflet\":3,\"var_qualite\":3,\"assistant_collaboration\":3}', 2.83, 'c4b090027cb197ef93bd29bec813f5b6', NULL, 'pending', NULL, NULL, NULL, '2025-11-26 10:55:41'),
('faf65425-ef12-4638-92e3-e404a6bc55e2', '9a5d252e-f895-4f76-b912-8a6085d642ae', '2bd3e2da-6d16-440e-9973-b2f25068aa61', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, 'f598e949415daa15265983057ba6a451', NULL, 'pending', NULL, NULL, NULL, '2025-11-24 21:20:48'),
('fb104314-ac64-457f-8d2a-648700aec937', '042c829f-1fae-4034-87d2-eaae0260a6e3', '1387dc7b-acb0-46db-97c6-d566f21f4ad9', '{\"communication\":5,\"decisions\":5,\"deplacement\":5,\"sifflet\":5,\"var_qualite\":5,\"assistant_collaboration\":5}', 5.00, '22cf459260a8e3b502f4a02f5b3c2bb7', NULL, 'pending', NULL, NULL, NULL, '2025-11-23 16:30:41'),
('fbbcabd0-f511-457d-a1d3-3b424eb79c09', 'cd373e0b-77c7-43e3-b7c2-0094679cdffd', 'e3b26885-e0a1-41d9-9957-c1cd721ebb0a', '{\"communication\":1,\"decisions\":3,\"deplacement\":1,\"sifflet\":2,\"var_qualite\":3,\"assistant_collaboration\":5}', 2.50, '3083ae56c7b5a3875473aaf3bb0bbc23', NULL, 'pending', NULL, NULL, NULL, '2025-11-27 06:36:56');

-- --------------------------------------------------------

--
-- Table structure for table `vote_alerts`
--

CREATE TABLE `vote_alerts` (
  `id` char(36) NOT NULL,
  `match_id` char(36) NOT NULL,
  `alert_type` enum('critical','important') NOT NULL DEFAULT 'important',
  `confidence` decimal(5,4) NOT NULL DEFAULT 0.0000,
  `credibility` decimal(5,2) NOT NULL DEFAULT 0.00,
  `reasons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`reasons`)),
  `status` enum('new','reviewed','resolved','dismissed') NOT NULL DEFAULT 'new',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` char(36) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('6e06b8f6-3fc1-47d9-8fd4-2335549a0912', 'f6768d007c2f62c63626c3d065372a03956f6fc8db449cedc6ec3caf6ff4904d', '2026-08-02 14:13:00.509', '20260802000000_merged_with_referee-center', '', NULL, '2026-08-02 14:13:00.509', 0),
('d0d4f11d-0822-44a6-9884-f003feed2564', 'a10948e102d3a8b515ac0de30028fcbca4bb7ba80bbe5b3b51f5fc7e89630f72', '2026-08-02 14:38:45.892', '20260802010000_multitenant_teams', '', NULL, '2026-08-02 14:38:45.892', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `arbitres`
--
ALTER TABLE `arbitres`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `AuditLog`
--
ALTER TABLE `AuditLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AuditLog_userId_idx` (`userId`),
  ADD KEY `AuditLog_entity_entityId_idx` (`entity`,`entityId`),
  ADD KEY `AuditLog_createdAt_idx` (`createdAt`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_created` (`created_at`),
  ADD KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_logs_admin` (`admin_username`);

--
-- Indexes for table `Card`
--
ALTER TABLE `Card`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Card_playerId_idx` (`playerId`),
  ADD KEY `Card_matchId_idx` (`matchId`),
  ADD KEY `Card_type_idx` (`type`),
  ADD KEY `Card_cardReasonId_idx` (`cardReasonId`);

--
-- Indexes for table `CardReason`
--
ALTER TABLE `CardReason`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_contact_messages_created_at` (`created_at`),
  ADD KEY `idx_contact_messages_fingerprint_date` (`device_fingerprint`,`created_at`);

--
-- Indexes for table `Convocation`
--
ALTER TABLE `Convocation`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Convocation_matchId_playerId_key` (`matchId`,`playerId`),
  ADD KEY `Convocation_matchId_idx` (`matchId`),
  ADD KEY `Convocation_playerId_idx` (`playerId`);

--
-- Indexes for table `critere_definitions`
--
ALTER TABLE `critere_definitions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `federations`
--
ALTER TABLE `federations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_federations_code` (`code`);

--
-- Indexes for table `Fine`
--
ALTER TABLE `Fine`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Fine_cardId_key` (`cardId`),
  ADD KEY `Fine_playerId_idx` (`playerId`),
  ADD KEY `Fine_status_idx` (`status`),
  ADD KEY `Fine_type_idx` (`type`),
  ADD KEY `Fine_teamId_fkey` (`teamId`);

--
-- Indexes for table `journees`
--
ALTER TABLE `journees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_saison_numero` (`saison_id`,`numero`),
  ADD UNIQUE KEY `uniq_saison_nom` (`saison_id`,`nom_fr`),
  ADD KEY `idx_journees_saison` (`saison_id`,`numero`);

--
-- Indexes for table `ligues`
--
ALTER TABLE `ligues`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ligues_federation` (`federation_id`);

--
-- Indexes for table `matches`
--
ALTER TABLE `matches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_matches_home` (`equipe_home`),
  ADD KEY `fk_matches_away` (`equipe_away`),
  ADD KEY `idx_matches_arbitre_id` (`arbitre_id`),
  ADD KEY `idx_matches_journee_id` (`journee_id`),
  ADD KEY `idx_matches_date` (`date`);

--
-- Indexes for table `Note`
--
ALTER TABLE `Note`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Note_matchId_fkey` (`matchId`),
  ADD KEY `Note_playerId_fkey` (`playerId`),
  ADD KEY `Note_authorId_fkey` (`authorId`),
  ADD KEY `Note_teamId_fkey` (`teamId`);

--
-- Indexes for table `Player`
--
ALTER TABLE `Player`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Player_teamId_idx` (`teamId`),
  ADD KEY `Player_isActive_idx` (`isActive`),
  ADD KEY `Player_lastNameFr_idx` (`lastNameFr`),
  ADD KEY `Player_status_idx` (`status`);

--
-- Indexes for table `saisons`
--
ALTER TABLE `saisons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_saisons_league` (`league_id`);

--
-- Indexes for table `Settings`
--
ALTER TABLE `Settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Settings_federationId_fkey` (`federationId`);

--
-- Indexes for table `Suspension`
--
ALTER TABLE `Suspension`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Suspension_cardId_key` (`cardId`),
  ADD KEY `Suspension_playerId_idx` (`playerId`),
  ADD KEY `Suspension_status_idx` (`status`),
  ADD KEY `Suspension_teamId_idx` (`teamId`);

--
-- Indexes for table `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `abbr` (`abbr`),
  ADD KEY `idx_teams_country` (`country_code`),
  ADD KEY `idx_teams_sport` (`sport`),
  ADD KEY `idx_teams_type` (`team_type`),
  ADD KEY `idx_teams_age_category` (`age_category`),
  ADD KEY `fk_teams_federation` (`federation_id`);

--
-- Indexes for table `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD KEY `User_teamId_fkey` (`teamId`);

--
-- Indexes for table `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_votes_match_device` (`match_id`,`device_fingerprint`),
  ADD KEY `idx_votes_match_id` (`match_id`),
  ADD KEY `idx_votes_arbitre_id` (`arbitre_id`),
  ADD KEY `idx_votes_created_at` (`created_at`),
  ADD KEY `idx_votes_ip_date` (`ip_address`,`created_at`),
  ADD KEY `idx_votes_ip` (`ip_address`),
  ADD KEY `idx_votes_moderation_status` (`moderation_status`);

--
-- Indexes for table `vote_alerts`
--
ALTER TABLE `vote_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vote_alerts_match` (`match_id`),
  ADD KEY `idx_vote_alerts_status` (`status`),
  ADD KEY `idx_vote_alerts_created` (`created_at`),
  ADD KEY `idx_vote_alerts_type` (`alert_type`),
  ADD KEY `idx_vote_alerts_match_status` (`match_id`,`status`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `AuditLog`
--
ALTER TABLE `AuditLog`
  ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Card`
--
ALTER TABLE `Card`
  ADD CONSTRAINT `Card_cardReasonId_fkey` FOREIGN KEY (`cardReasonId`) REFERENCES `CardReason` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Card_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Card_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Convocation`
--
ALTER TABLE `Convocation`
  ADD CONSTRAINT `Convocation_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Convocation_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Fine`
--
ALTER TABLE `Fine`
  ADD CONSTRAINT `Fine_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Fine_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Fine_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`);

--
-- Constraints for table `journees`
--
ALTER TABLE `journees`
  ADD CONSTRAINT `fk_journees_saison` FOREIGN KEY (`saison_id`) REFERENCES `saisons` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ligues`
--
ALTER TABLE `ligues`
  ADD CONSTRAINT `fk_ligues_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `matches`
--
ALTER TABLE `matches`
  ADD CONSTRAINT `fk_matches_arbitre` FOREIGN KEY (`arbitre_id`) REFERENCES `arbitres` (`id`),
  ADD CONSTRAINT `fk_matches_away` FOREIGN KEY (`equipe_away`) REFERENCES `teams` (`id`),
  ADD CONSTRAINT `fk_matches_home` FOREIGN KEY (`equipe_home`) REFERENCES `teams` (`id`),
  ADD CONSTRAINT `fk_matches_journee` FOREIGN KEY (`journee_id`) REFERENCES `journees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `Note`
--
ALTER TABLE `Note`
  ADD CONSTRAINT `Note_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Note_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Note_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Note_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`);

--
-- Constraints for table `Player`
--
ALTER TABLE `Player`
  ADD CONSTRAINT `Player_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `saisons`
--
ALTER TABLE `saisons`
  ADD CONSTRAINT `fk_saisons_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `Settings`
--
ALTER TABLE `Settings`
  ADD CONSTRAINT `Settings_federationId_fkey` FOREIGN KEY (`federationId`) REFERENCES `federations` (`id`);

--
-- Constraints for table `Suspension`
--
ALTER TABLE `Suspension`
  ADD CONSTRAINT `Suspension_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Suspension_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Suspension_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `teams`
--
ALTER TABLE `teams`
  ADD CONSTRAINT `fk_teams_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`);

--
-- Constraints for table `User`
--
ALTER TABLE `User`
  ADD CONSTRAINT `User_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`);

--
-- Constraints for table `votes`
--
ALTER TABLE `votes`
  ADD CONSTRAINT `fk_votes_arbitre` FOREIGN KEY (`arbitre_id`) REFERENCES `arbitres` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_votes_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vote_alerts`
--
ALTER TABLE `vote_alerts`
  ADD CONSTRAINT `fk_vote_alerts_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

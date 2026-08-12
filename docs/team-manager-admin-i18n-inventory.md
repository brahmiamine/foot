# Inventaire i18n de l’administration

Cet inventaire couvre `src/app/admin` et `src/components/admin`. L’ordre commence par les parcours les plus utilisés. Le contrôle détaillé se lance avec `npm run i18n:check -- --project teamManager --literals` depuis la racine du dépôt.

## Priorité de migration

### Effectif (`players`)

**6 fichier(s)**

- `src/app/admin/players/PlayerForm.tsx`
- `src/app/admin/players/PlayersList.tsx`
- `src/app/admin/players/[id]/edit/page.tsx`
- `src/app/admin/players/actions.ts`
- `src/app/admin/players/create/page.tsx`
- `src/app/admin/players/page.tsx`

### Matchs officiels (`matches`)

**4 fichier(s)**

- `src/app/admin/matches/MatchesList.tsx`
- `src/app/admin/matches/[id]/lineup/page.tsx`
- `src/app/admin/matches/actions.ts`
- `src/app/admin/matches/page.tsx`

### Matchs amicaux (`friendly-matches`)

**4 fichier(s)**

- `src/app/admin/friendly-matches/FriendlyMatchesManagement.tsx`
- `src/app/admin/friendly-matches/[id]/lineup/page.tsx`
- `src/app/admin/friendly-matches/actions.ts`
- `src/app/admin/friendly-matches/page.tsx`

### Convocations / composition (`convocations`)

**3 fichier(s)**

- `src/app/admin/convocations/ConvocationsManagement.tsx`
- `src/app/admin/convocations/actions.ts`
- `src/app/admin/convocations/page.tsx`

### Planches tactiques (`tactics`)

**6 fichier(s)**

- `src/app/admin/tactics/DeleteTacticsBoardButton.tsx`
- `src/app/admin/tactics/TacticsBoardEditor.tsx`
- `src/app/admin/tactics/[id]/page.tsx`
- `src/app/admin/tactics/actions.ts`
- `src/app/admin/tactics/new/page.tsx`
- `src/app/admin/tactics/page.tsx`

### Entraînements (`trainings`)

**3 fichier(s)**

- `src/app/admin/trainings/TrainingsManagement.tsx`
- `src/app/admin/trainings/actions.ts`
- `src/app/admin/trainings/page.tsx`

### Staff (`staff`)

**6 fichier(s)**

- `src/app/admin/staff/StaffForm.tsx`
- `src/app/admin/staff/StaffList.tsx`
- `src/app/admin/staff/[id]/edit/page.tsx`
- `src/app/admin/staff/actions.ts`
- `src/app/admin/staff/create/page.tsx`
- `src/app/admin/staff/page.tsx`

### Billetterie (`billetterie`)

**8 fichier(s)**

- `src/app/admin/billetterie/categories/CategoriesManagement.tsx`
- `src/app/admin/billetterie/categories/actions.ts`
- `src/app/admin/billetterie/categories/page.tsx`
- `src/app/admin/billetterie/matches/MatchesTicketingList.tsx`
- `src/app/admin/billetterie/matches/[matchId]/MatchOffersManagement.tsx`
- `src/app/admin/billetterie/matches/[matchId]/actions.ts`
- `src/app/admin/billetterie/matches/[matchId]/page.tsx`
- `src/app/admin/billetterie/matches/page.tsx`

### Boutique (`shop`)

**7 fichier(s)**

- `src/app/admin/shop/categories/CategoriesManagement.tsx`
- `src/app/admin/shop/categories/actions.ts`
- `src/app/admin/shop/categories/page.tsx`
- `src/app/admin/shop/orders/page.tsx`
- `src/app/admin/shop/products/ProductsManagement.tsx`
- `src/app/admin/shop/products/actions.ts`
- `src/app/admin/shop/products/page.tsx`

### Actualités (`news`)

**8 fichier(s)**

- `src/app/admin/news/NewsForm.tsx`
- `src/app/admin/news/NewsList.tsx`
- `src/app/admin/news/RichTextEditor.tsx`
- `src/app/admin/news/[id]/edit/page.tsx`
- `src/app/admin/news/actions.ts`
- `src/app/admin/news/create/page.tsx`
- `src/app/admin/news/page.tsx`
- `src/app/admin/news/rich-text-editor.css`

### Réglages (`settings`)

**6 fichier(s)**

- `src/app/admin/settings/SettingsForm.tsx`
- `src/app/admin/settings/actions.ts`
- `src/app/admin/settings/card-reasons/CardReasonsList.tsx`
- `src/app/admin/settings/card-reasons/actions.ts`
- `src/app/admin/settings/card-reasons/page.tsx`
- `src/app/admin/settings/page.tsx`

### academy (`academy`)

**8 fichier(s)**

- `src/app/admin/academy/CategoriesManagement.tsx`
- `src/app/admin/academy/actions.ts`
- `src/app/admin/academy/applications/ApplicationsManagement.tsx`
- `src/app/admin/academy/applications/actions.ts`
- `src/app/admin/academy/applications/page.tsx`
- `src/app/admin/academy/info/AcademyInfoForm.tsx`
- `src/app/admin/academy/info/page.tsx`
- `src/app/admin/academy/page.tsx`

### announcements (`announcements`)

**3 fichier(s)**

- `src/app/admin/announcements/AnnouncementsManagement.tsx`
- `src/app/admin/announcements/actions.ts`
- `src/app/admin/announcements/page.tsx`

### audit (`audit`)

**1 fichier(s)**

- `src/app/admin/audit/page.tsx`

### cards (`cards`)

**5 fichier(s)**

- `src/app/admin/cards/CardForm.tsx`
- `src/app/admin/cards/CardsList.tsx`
- `src/app/admin/cards/actions.ts`
- `src/app/admin/cards/create/page.tsx`
- `src/app/admin/cards/page.tsx`

### club (`club`)

**9 fichier(s)**

- `src/app/admin/club/ClubInfoForm.tsx`
- `src/app/admin/club/actions.ts`
- `src/app/admin/club/figures/FiguresManagement.tsx`
- `src/app/admin/club/figures/page.tsx`
- `src/app/admin/club/history/HistoryForm.tsx`
- `src/app/admin/club/history/page.tsx`
- `src/app/admin/club/honors/HonorsManagement.tsx`
- `src/app/admin/club/honors/page.tsx`
- `src/app/admin/club/page.tsx`

### club-settings (`club-settings`)

**7 fichier(s)**

- `src/app/admin/club-settings/SocialsForm.tsx`
- `src/app/admin/club-settings/actions.ts`
- `src/app/admin/club-settings/contact/ContactInfoForm.tsx`
- `src/app/admin/club-settings/contact/page.tsx`
- `src/app/admin/club-settings/messages/MessagesManagement.tsx`
- `src/app/admin/club-settings/messages/page.tsx`
- `src/app/admin/club-settings/page.tsx`

### exports (`exports`)

**1 fichier(s)**

- `src/app/admin/exports/page.tsx`

### fines (`fines`)

**5 fichier(s)**

- `src/app/admin/fines/FineForm.tsx`
- `src/app/admin/fines/FinesList.tsx`
- `src/app/admin/fines/actions.ts`
- `src/app/admin/fines/create/page.tsx`
- `src/app/admin/fines/page.tsx`

### injuries (`injuries`)

**3 fichier(s)**

- `src/app/admin/injuries/InjuriesManagement.tsx`
- `src/app/admin/injuries/actions.ts`
- `src/app/admin/injuries/page.tsx`

### layout.tsx (`layout.tsx`)

**1 fichier(s)**

- `src/app/admin/layout.tsx`

### marketplace (`marketplace`)

**3 fichier(s)**

- `src/app/admin/marketplace/products/ModerationTable.tsx`
- `src/app/admin/marketplace/products/actions.ts`
- `src/app/admin/marketplace/products/page.tsx`

### media (`media`)

**6 fichier(s)**

- `src/app/admin/media/galleries/MediaGalleriesManagement.tsx`
- `src/app/admin/media/galleries/actions.ts`
- `src/app/admin/media/galleries/page.tsx`
- `src/app/admin/media/items/MediaItemsManagement.tsx`
- `src/app/admin/media/items/actions.ts`
- `src/app/admin/media/items/page.tsx`

### notes (`notes`)

**5 fichier(s)**

- `src/app/admin/notes/NoteForm.tsx`
- `src/app/admin/notes/NotesList.tsx`
- `src/app/admin/notes/actions.ts`
- `src/app/admin/notes/create/page.tsx`
- `src/app/admin/notes/page.tsx`

### notifications (`notifications`)

**3 fichier(s)**

- `src/app/admin/notifications/NotificationsManagement.tsx`
- `src/app/admin/notifications/actions.ts`
- `src/app/admin/notifications/page.tsx`

### page.tsx (`page.tsx`)

**1 fichier(s)**

- `src/app/admin/page.tsx`

### player-stats (`player-stats`)

**3 fichier(s)**

- `src/app/admin/player-stats/PlayerStatsManagement.tsx`
- `src/app/admin/player-stats/actions.ts`
- `src/app/admin/player-stats/page.tsx`

### pushActions.ts (`pushActions.ts`)

**1 fichier(s)**

- `src/app/admin/pushActions.ts`

### recruitment (`recruitment`)

**5 fichier(s)**

- `src/app/admin/recruitment/NeedsManagement.tsx`
- `src/app/admin/recruitment/actions.ts`
- `src/app/admin/recruitment/applications/RecruitmentApplicationsManagement.tsx`
- `src/app/admin/recruitment/applications/page.tsx`
- `src/app/admin/recruitment/page.tsx`

### roles (`roles`)

**3 fichier(s)**

- `src/app/admin/roles/RolesManagement.tsx`
- `src/app/admin/roles/actions.ts`
- `src/app/admin/roles/page.tsx`

### Composants administratifs partagés (`shared-components`)

**12 fichier(s)**

- `src/components/admin/AdminHeader.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminSidebarContext.tsx`
- `src/components/admin/ConfirmModal.tsx`
- `src/components/admin/ListPagination.tsx`
- `src/components/admin/ListSearchInput.tsx`
- `src/components/admin/MediaPreview.tsx`
- `src/components/admin/MediaUploader.tsx`
- `src/components/admin/PitchLineupEditor.tsx`
- `src/components/admin/PushSubscribeButton.tsx`
- `src/components/admin/index.ts`

### skote-admin.css (`skote-admin.css`)

**1 fichier(s)**

- `src/app/admin/skote-admin.css`

### sponsors (`sponsors`)

**3 fichier(s)**

- `src/app/admin/sponsors/SponsorsManagement.tsx`
- `src/app/admin/sponsors/actions.ts`
- `src/app/admin/sponsors/page.tsx`

### stadiums (`stadiums`)

**3 fichier(s)**

- `src/app/admin/stadiums/StadiumsManagement.tsx`
- `src/app/admin/stadiums/actions.ts`
- `src/app/admin/stadiums/page.tsx`

### stats (`stats`)

**1 fichier(s)**

- `src/app/admin/stats/page.tsx`

### suspensions (`suspensions`)

**3 fichier(s)**

- `src/app/admin/suspensions/SuspensionsList.tsx`
- `src/app/admin/suspensions/actions.ts`
- `src/app/admin/suspensions/page.tsx`

### team-members (`team-members`)

**3 fichier(s)**

- `src/app/admin/team-members/TeamMembersManagement.tsx`
- `src/app/admin/team-members/actions.ts`
- `src/app/admin/team-members/page.tsx`

### trips (`trips`)

**3 fichier(s)**

- `src/app/admin/trips/TripsManagement.tsx`
- `src/app/admin/trips/actions.ts`
- `src/app/admin/trips/page.tsx`

### users (`users`)

**3 fichier(s)**

- `src/app/admin/users/UsersManagement.tsx`
- `src/app/admin/users/actions.ts`
- `src/app/admin/users/page.tsx`

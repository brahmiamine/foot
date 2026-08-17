import { useState } from 'react'
import '../../../design-tokens/src/index.css'

import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Container,
  Divider,
  Drawer,
  EmptyState,
  FileUpload,
  FootGlobalStyle,
  FootThemeProvider,
  FormField,
  Grid,
  Heading,
  IconButton,
  Input,
  Link,
  List,
  ListItem,
  Menu,
  Modal,
  PageHeader,
  Pagination,
  Popover,
  ProgressBar,
  Radio,
  RadioGroup,
  SearchInput,
  Select,
  Skeleton,
  Slider,
  Spacer,
  Spinner,
  Stack,
  Stat,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  Tag,
  Text,
  Textarea,
  ToastProvider,
  Tooltip,
  useToast,
} from '../../src'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBlockEnd: '3rem' }}>
      <Heading as="h2" size="lg" style={{ marginBlockEnd: '1rem' }}>
        {title}
      </Heading>
      <Stack gap="lg">{children}</Stack>
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <Stack direction="row" gap="md" wrap align="center" style={{ rowGap: '0.75rem' }}>{children}</Stack>
}

function ToastDemo() {
  const { toast } = useToast()
  return (
    <Button
      variant="secondary"
      onClick={() =>
        toast({ title: 'Modifications enregistrées', description: 'Tout est synchronisé.', variant: 'success' })
      }
    >
      Déclencher un toast
    </Button>
  )
}

function Playground() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState('apercu')
  const [page, setPage] = useState(3)
  const [checked, setChecked] = useState(true)
  const [switchOn, setSwitchOn] = useState(false)
  const [radioValue, setRadioValue] = useState('m')
  const [dark, setDark] = useState(false)
  const [rtl, setRtl] = useState(false)

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className={dark ? 'dark' : undefined}>
      <FootGlobalStyle />
      <Container style={{ paddingBlock: '2rem' }}>
        <PageHeader
          title="@foot/ui — Playground"
          description="Aperçu local, non branché sur les applications FOOT. Utilisé uniquement pour vérifier visuellement le design system."
          actions={
            <ButtonGroup>
              <Button variant="secondary" onClick={() => setDark((v) => !v)}>
                {dark ? 'Mode clair' : 'Mode sombre'}
              </Button>
              <Button variant="secondary" onClick={() => setRtl((v) => !v)}>
                {rtl ? 'LTR' : 'RTL'}
              </Button>
            </ButtonGroup>
          }
        />

        <Section title="Actions">
          <Row>
            <Button variant="primary">Primaire</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>
              Désactivé
            </Button>
            <IconButton aria-label="Ajouter" icon={<span>+</span>} />
            <ButtonGroup attached>
              <Button variant="secondary">Jour</Button>
              <Button variant="secondary">Semaine</Button>
              <Button variant="secondary">Mois</Button>
            </ButtonGroup>
            <Link href="#">Lien standard</Link>
          </Row>
        </Section>

        <Section title="Formulaires">
          <Row>
            <FormField label="Nom du club" helperText="Tel qu'il apparaîtra publiquement">
              <Input placeholder="FOOT FC" />
            </FormField>
            <FormField label="Email" errorText="Adresse invalide">
              <Input placeholder="contact@club.fr" invalid />
            </FormField>
          </Row>
          <Row>
            <Textarea aria-label="Description" placeholder="Description du club…" style={{ minWidth: '18rem' }} />
            <Select aria-label="Pays" options={[{ value: 'fr', label: 'France' }, { value: 'ma', label: 'Maroc' }]} />
            <SearchInput aria-label="Recherche" placeholder="Rechercher un licencié" style={{ minWidth: '16rem' }} />
          </Row>
          <Row>
            <Checkbox label="J'accepte les conditions" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <Switch label="Notifications" checked={switchOn} onChange={(e) => setSwitchOn(e.target.checked)} />
            <RadioGroup
              label="Genre"
              orientation="horizontal"
              value={radioValue}
              onChange={setRadioValue}
              options={[
                { value: 'm', label: 'Homme' },
                { value: 'f', label: 'Femme' },
              ]}
            />
          </Row>
          <Row>
            <Slider aria-label="Volume" defaultValue={60} style={{ width: '12rem' }} />
            <FileUpload label="Déposez un justificatif" hint="PDF, PNG jusqu'à 5 Mo" style={{ minWidth: '18rem' }} />
          </Row>
        </Section>

        <Section title="Feedback">
          <Stack gap="sm">
            <Alert variant="info" title="Information">
              La saison 2026-2027 débute le 1er septembre.
            </Alert>
            <Alert variant="success" title="Succès">
              Le paiement a été confirmé.
            </Alert>
            <Alert variant="warning" title="Attention">
              Le certificat médical expire dans 15 jours.
            </Alert>
            <Alert variant="danger" title="Erreur">
              La licence n'a pas pu être validée.
            </Alert>
          </Stack>
          <Row>
            <Spinner label="Chargement" />
            <ProgressBar value={65} label="Import des licenciés" showValueLabel style={{ minWidth: '14rem' }} />
            <Skeleton width={120} height={16} />
            <Skeleton variant="circular" width={40} height={40} />
            <ToastDemo />
          </Row>
          <EmptyState
            title="Aucun licencié trouvé"
            description="Essayez une autre recherche ou ajoutez un nouveau licencié."
            action={<Button>Ajouter un licencié</Button>}
          />
        </Section>

        <Section title="Data display">
          <Row>
            <Badge variant="neutral">Neutre</Badge>
            <Badge variant="success">Actif</Badge>
            <Badge variant="warning">En attente</Badge>
            <Badge variant="danger">Suspendu</Badge>
            <Badge variant="info">Info</Badge>
            <Tag onRemove={() => {}}>U15</Tag>
            <Avatar name="Amine Brahmi" />
            <Tooltip content="Licencié depuis 2021">
              <Avatar name="Sara Idrissi" />
            </Tooltip>
          </Row>
          <Grid columns={3}>
            <Card>Carte simple</Card>
            <Card interactive>Carte interactive (survol)</Card>
            <Stat label="Licenciés actifs" value="1 240" delta="+4.2%" trend="up" />
          </Grid>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Nom</TableHeaderCell>
                <TableHeaderCell>Club</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Amine Brahmi</TableCell>
                <TableCell>FOOT FC</TableCell>
                <TableCell>
                  <Badge variant="success">Actif</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Divider label="Éléments" />
          <List bordered>
            <ListItem interactive>Licences en attente de validation</ListItem>
            <ListItem interactive>Certificats médicaux à renouveler</ListItem>
          </List>
        </Section>

        <Section title="Navigation">
          <Breadcrumb items={[{ label: 'Accueil', href: '#' }, { label: 'Clubs', href: '#' }, { label: 'FOOT FC' }]} />
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'apercu', label: 'Aperçu', panel: <Text>Contenu de l'onglet Aperçu.</Text> },
              { value: 'details', label: 'Détails', panel: <Text>Contenu de l'onglet Détails.</Text> },
            ]}
          />
          <Pagination page={page} pageCount={12} onPageChange={setPage} />
          <Menu
            trigger={<Button variant="secondary">Actions ▾</Button>}
            items={[
              { value: 'edit', label: 'Modifier' },
              { value: 'delete', label: 'Supprimer' },
            ]}
          />
          <Stepper
            activeStep={1}
            steps={[
              { label: 'Informations' },
              { label: 'Paiement' },
              { label: 'Confirmation' },
            ]}
          />
        </Section>

        <Section title="Overlays">
          <Row>
            <Button onClick={() => setModalOpen(true)}>Ouvrir une modale</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Ouvrir un tiroir
            </Button>
            <Popover trigger={<Button variant="ghost">Popover</Button>} content={<Text>Contenu du popover.</Text>} />
          </Row>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirmer l'action"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => setModalOpen(false)}>Confirmer</Button>
              </>
            }
          >
            <Text>Cette action est définitive. Voulez-vous continuer ?</Text>
          </Modal>
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filtres">
            <Text>Contenu du tiroir de filtres.</Text>
          </Drawer>
        </Section>

        <Section title="Layout & typographie">
          <Heading as="h1" size="xl" display>
            Titre display
          </Heading>
          <Heading as="h3" size="sm">
            Sous-titre
          </Heading>
          <Text tone="muted">Texte atténué utilisé pour les descriptions.</Text>
          <Row>
            <Text weight="bold">Gras</Text>
            <Spacer axis="horizontal" size="lg" />
            <Text tone="danger">Erreur</Text>
          </Row>
        </Section>
      </Container>
    </div>
  )
}

export function App() {
  return (
    <FootThemeProvider>
      <ToastProvider>
        <Playground />
      </ToastProvider>
    </FootThemeProvider>
  )
}

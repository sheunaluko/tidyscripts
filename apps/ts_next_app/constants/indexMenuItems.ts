import {
  AppShortcut as AppShortcutIcon,
  Science as ScienceIcon,
  Pageview as PageviewIcon,
  Article as ArticleIcon,
  GitHub as GitHubIcon,
  Info as InfoIcon,
  MedicalServices as MedicalServicesIcon,
  CameraAlt as CameraAltIcon,
  Mic as MicIcon,
  Psychology as PsychologyIcon,
  AccountTree as AccountTreeIcon,
  School as SchoolIcon,
  BugReport as BugReportIcon,
  Campaign as CampaignIcon,
  Storage as StorageIcon,
  Terminal as TerminalIcon,
  LibraryMusic as LibraryMusicIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  Description as DescriptionIcon,
  ViewComfy as ViewComfyIcon,
} from '@mui/icons-material';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  href?: string;
  children?: MenuItem[];
  external?: boolean;
}

export const INDEX_MENU_ITEMS: MenuItem[] = [
  {
    id: 'app-library',
    label: 'App Library',
    icon: AppShortcutIcon,
    href: '/apps',
    children: [
      {
        id: 'automate-care',
        label: 'Automate.Care',
        icon: MedicalServicesIcon,
        href: '/apps/automate_care',
      },
      {
        id: '3dcam',
        label: '3D-CAM Tool',
        icon: CameraAltIcon,
        href: '/apps/3dcam_v2',
      },
    ],
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    icon: ScienceIcon,
    href: '/laboratory',
    children: [
      {
        id: '3d-cam-test',
        label: '3D-CAM Test Suite',
        icon: BugReportIcon,
        href: '/laboratory/3d_cam_test_suite/index.html',
      },
      {
        id: 'cortex',
        label: 'Cortex',
        icon: PsychologyIcon,
        href: '/laboratory/cortex_0',
      },
      {
        id: 'rai',
        label: 'RAI - Realtime AI Notes',
        icon: MicIcon,
        href: '/laboratory/rai',
      },
      {
        id: 'knowledge-graph',
        label: 'Graph Visualization',
        icon: AccountTreeIcon,
        href: '/laboratory/knowledge_graph_viz',
      },
      {
        id: 'abim-blueprint',
        label: 'ABIM Outline Study Tool',
        icon: SchoolIcon,
        href: '/laboratory/abim_blueprint',
      },
      {
        id: 'test-graph',
        label: 'Test Graph',
        icon: AccountTreeIcon,
        href: '/laboratory/graph',
      },
      {
        id: 'vip',
        label: 'Voice Interface Panel [VIP]',
        icon: CampaignIcon,
        href: '/laboratory/vip',
      },
      {
        id: 'local-storage',
        label: 'Local Storage Interface',
        icon: StorageIcon,
        href: '/laboratory/local_storage_interface',
      },
      {
        id: 'console-ui',
        label: 'Console Interface',
        icon: TerminalIcon,
        href: '/laboratory/console_ui',
      },
      {
        id: 'spotifile',
        label: 'Spotifile',
        icon: LibraryMusicIcon,
        href: '/laboratory/spotifile',
      },
      {
        id: 'voice-agent-test',
        label: 'Voice Agent Test',
        icon: RecordVoiceOverIcon,
        href: '/laboratory/voice_agent_test',
      },
      {
        id: 'note-wrangler',
        label: 'Note Wrangler',
        icon: DescriptionIcon,
        href: '/laboratory/note_wrangler',
      },
      {
        id: 'component-viewer',
        label: 'Component Viewer',
        icon: ViewComfyIcon,
        href: '/laboratory/component_viewer',
      },
    ],
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: PageviewIcon,
    href: '/docs/index.html',
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: ArticleIcon,
    href: '/blog',
  },
  {
    id: 'github',
    label: 'Github',
    icon: GitHubIcon,
    href: 'https://github.com/sheunaluko/tidyscripts',
    external: true,
  },
  {
    id: 'about',
    label: 'About',
    icon: InfoIcon,
    href: '/about',
  },
];

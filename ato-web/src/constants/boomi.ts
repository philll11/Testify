import SettingsIcon from '@mui/icons-material/Settings';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import StorageIcon from '@mui/icons-material/Storage';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ApiIcon from '@mui/icons-material/Api';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FunctionsIcon from '@mui/icons-material/Functions';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CodeIcon from '@mui/icons-material/Code';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export const BOOMI_COMPONENT_TYPES = [
  'certificate',
  'certificate.pgp',
  'connector-action',
  'connector-settings',
  'crossref',
  'documentcache',
  'transform.map',
  'transform.function',
  'process',
  'processproperty',
  'profile.db',
  'profile.edi',
  'profile.flatfile',
  'profile.xml',
  'profile.json',
  'queue',
  'tradingpartner',
  'tpgroup',
  'tporganization',
  'tpcommoptions',
  'webservice',
  'webservice.external',
  'processroute',
  'customlibrary',
  'flowservice',
  'script.processing',
  'script.mapping',
  'xslt'
] as const;

export const BOOMI_COMPONENT_LABELS: Record<string, string> = {
  certificate: 'Certificate',
  'certificate.pgp': 'Certificate PGP',
  'connector-action': 'Connector Action',
  'connector-settings': 'Connector Settings',
  crossref: 'Cross Reference Table',
  documentcache: 'Document Cache',
  'transform.map': 'Map',
  'transform.function': 'Map Function',
  process: 'Process',
  processproperty: 'Process Property',
  'profile.db': 'Database Profile',
  'profile.edi': 'EDI Profile',
  'profile.flatfile': 'Flat File Profile',
  'profile.xml': 'XML Profile',
  'profile.json': 'JSON Profile',
  queue: 'Message Queue',
  tradingpartner: 'Trading Partner',
  tpgroup: 'Trading Partner Group',
  tporganization: 'Trading Partner Organization',
  tpcommoptions: 'Trading Partner Comm Options',
  webservice: 'Web Service',
  'webservice.external': 'External Web Service',
  processroute: 'Process Route',
  customlibrary: 'Custom Library',
  flowservice: 'Flow Service',
  'script.processing': 'Processing Script',
  'script.mapping': 'Mapping Script',
  xslt: 'XSLT Style Sheet'
};

// Map each component type to an appropriate MUI icon
export const BOOMI_COMPONENT_ICONS: Record<string, React.ElementType> = {
  certificate: VpnKeyIcon,
  'certificate.pgp': VpnKeyIcon,
  'connector-action': ApiIcon,
  'connector-settings': SettingsIcon,
  crossref: SwapHorizIcon,
  documentcache: StorageIcon,
  'transform.map': SyncAltIcon,
  'transform.function': FunctionsIcon,
  process: SettingsIcon, // Process usually uses Settings or AccountTree
  processproperty: ListAltIcon,
  'profile.db': StorageIcon,
  'profile.edi': DescriptionIcon,
  'profile.flatfile': DescriptionIcon,
  'profile.xml': CodeIcon,
  'profile.json': DataObjectIcon,
  queue: StorageIcon,
  tradingpartner: HandshakeIcon,
  tpgroup: HandshakeIcon,
  tporganization: AccountBoxIcon,
  tpcommoptions: SettingsIcon,
  webservice: ApiIcon,
  'webservice.external': ApiIcon,
  processroute: AccountTreeIcon,
  customlibrary: LibraryBooksIcon,
  flowservice: AccountTreeIcon,
  'script.processing': CodeIcon,
  'script.mapping': CodeIcon,
  xslt: CodeIcon
};

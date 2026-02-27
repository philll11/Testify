import { useState, SyntheticEvent } from 'react';
import { Box, Tabs, Tab, useMediaQuery, useTheme } from '@mui/material';
import { IconSettings, IconDatabaseImport } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import GeneralSettingsTab from './tabs/GeneralSettingsTab';
import DiscoverySettingsTab from './tabs/DiscoverySettingsTab';

// Tab Panel Helper
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            {...other}
            style={{ width: '100%' }}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`
    };
}

const SystemSettingsPage = () => {
    const theme = useTheme();
    const matchDownMD = useMediaQuery(theme.breakpoints.down('md'));
    const [value, setValue] = useState(0);

    const handleChange = (event: SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <MainCard title="System Settings" content={false}>
            <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: '100%', minHeight: 'calc(100vh - 200px)' }}>
                {/* Vertical Tabs */}
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={value}
                    onChange={handleChange}
                    aria-label="System Settings Tabs"
                    sx={{
                        borderRight: 1,
                        borderColor: 'divider',
                        minWidth: 200,
                        '& .MuiTab-root': { minHeight: 60, display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', px: 3 }
                    }}
                >
                    <Tab
                        icon={<IconSettings size={18} />}
                        iconPosition="start"
                        label="General"
                        {...a11yProps(0)}
                    />
                    <Tab
                        icon={<IconDatabaseImport size={18} />}
                        iconPosition="start"
                        label="Discovery Engine"
                        {...a11yProps(1)}
                    />
                </Tabs>

                {/* --- Tab 0: General System Settings --- */}
                <TabPanel value={value} index={0}>
                    <GeneralSettingsTab />
                </TabPanel>

                {/* --- Tab 1: Discovery Engine Settings --- */}
                <TabPanel value={value} index={1}>
                    <DiscoverySettingsTab />
                </TabPanel>
            </Box>
        </MainCard>
    );
};

export default SystemSettingsPage;

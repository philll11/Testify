import { useState, SyntheticEvent } from 'react';
import {
    Box,
    Tabs,
    Tab,
    useTheme,
    Typography
} from '@mui/material';
import { IconUser, IconLock, IconSettings } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import ProfileTab from './tabs/ProfileTab';
import SecurityTab from './tabs/SecurityTab';

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

// ==============================| MAIN PAGE |============================== //

const AccountProfile = () => {
    const theme = useTheme();
    const [value, setValue] = useState(0);

    const handleChange = (event: SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <MainCard title="Account Settings" content={false}>
            <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: '100%', minHeight: 'calc(100vh - 200px)' }}>
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={value}
                    onChange={handleChange}
                    aria-label="Account Settings Tabs"
                    sx={{
                        borderRight: 1,
                        borderColor: 'divider',
                        minWidth: 200,
                        '& .MuiTab-root': { minHeight: 60, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
                    }}
                >
                    <Tab
                        icon={<IconUser size={18} />}
                        iconPosition="start"
                        label="Profile"
                        {...a11yProps(0)}
                    />
                    <Tab
                        icon={<IconLock size={18} />}
                        iconPosition="start"
                        label="Security"
                        {...a11yProps(1)}
                    />
                    <Tab
                        icon={<IconSettings size={18} />}
                        iconPosition="start"
                        label="Preferences"
                        {...a11yProps(2)}
                        disabled
                    />
                </Tabs>

                <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <TabPanel value={value} index={0}>
                        <ProfileTab />
                    </TabPanel>
                    <TabPanel value={value} index={1}>
                        <SecurityTab />
                    </TabPanel>
                    <TabPanel value={value} index={2}>
                        <Box sx={{ p: 3 }}>
                            <Typography variant="h4">Preferences Coming Soon</Typography>
                        </Box>
                    </TabPanel>
                </Box>
            </Box>
        </MainCard>
    );
};

export default AccountProfile;

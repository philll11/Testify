import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, FormControl, MenuItem, Select, Typography } from '@mui/material';
import { usePlatformEnvironments, usePlatformProfiles } from 'hooks/platform/usePlatform';
import { useEnvironmentContext } from 'contexts/EnvironmentContext';

export default function EnvironmentSection() {
    const theme = useTheme();
    const { data: environments, isLoading: isEnvironmentsLoading } = usePlatformEnvironments();
    const { data: profiles, isLoading: isProfilesLoading } = usePlatformProfiles();
    const { activeEnvironmentId, setActiveEnvironmentId } = useEnvironmentContext();

    const handleChange = (event: any) => {
        setActiveEnvironmentId(event.target.value);
    };

    if (isEnvironmentsLoading || isProfilesLoading) {
        return null;
    }

    return (
        <Box sx={{ ml: 2, mr: 2, width: 300, display: { xs: 'none', sm: 'block' } }}>
            <FormControl fullWidth size="small">
                <Select
                    value={activeEnvironmentId || ''}
                    displayEmpty
                    onChange={handleChange}
                    sx={{
                        bgcolor: theme.palette.mode === 'dark' ? theme.palette.dark.main : theme.palette.primary.light,
                        borderRadius: '4px',
                        '& .MuiSelect-select': {
                            py: 1,
                            px: 2,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }
                    }}
                    renderValue={(selected) => {
                        if (!selected) {
                            return <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Select Environment...</Typography>;
                        }
                        const selectedEnv = environments?.find((env) => env.id === selected);
                        if (!selectedEnv) return <Typography variant="body2">Unknown Environment</Typography>;

                        return (
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedEnv.name}
                            </Typography>
                        );
                    }}
                >
                    <MenuItem value="">
                        <em>None</em>
                    </MenuItem>
                    {environments?.map((env) => {
                        const profile = profiles?.find((p) => p.id === env.profileId);
                        return (
                            <MenuItem key={env.id} value={env.id}>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="body2">{env.name}</Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {profile?.name}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
        </Box>
    );
}

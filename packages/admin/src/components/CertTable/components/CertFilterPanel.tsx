import {
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    FormControl,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import { certTypeMap } from "@certstar/shared";
import {
    DATE_RANGE_FILTERS,
    EMPTY_FILTERS,
    type Filters,
} from "../hooks/useCertFilter";
import intl from "../../../intl/intl";

const CERT_TYPE_ENTRIES = Object.entries(certTypeMap) as [string, string][];

interface CertFilterPanelProps {
    filterOpen: boolean;
    filters: Filters;
    setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
    setFilters: (filters: Filters) => void;
    activeFilterCount: number;
    activeChips: { label: string; onDelete: () => void }[];
}

export default function CertFilterPanel({
    filterOpen,
    filters,
    setFilter,
    setFilters,
    activeFilterCount,
    activeChips,
}: CertFilterPanelProps) {
    return (
        <>
            <Collapse in={filterOpen}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box
                        sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
                    >
                        <FormControl size="small" sx={{ width: 200 }}>
                            <InputLabel>{intl.certType}</InputLabel>
                            <Select
                                multiple
                                value={filters.certType}
                                onChange={(e) =>
                                    setFilter("certType", e.target.value as string[])
                                }
                                input={<OutlinedInput label={intl.certType} />}
                                renderValue={(selected) =>
                                    (selected as string[])
                                        .map(
                                            (code) =>
                                                certTypeMap[
                                                    code as keyof typeof certTypeMap
                                                ] ?? code,
                                        )
                                        .join(", ")
                                }
                            >
                                {CERT_TYPE_ENTRIES.map(([code, label]) => (
                                    <MenuItem key={code} value={code}>
                                        <Checkbox
                                            size="small"
                                            checked={filters.certType.includes(code)}
                                        />
                                        {label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {DATE_RANGE_FILTERS.map(({ label, from, to }) => (
                            <Box
                                key={label}
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "flex-end",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    px: 1.5,
                                    pt: 2,
                                    pb: 1.5,
                                    position: "relative",
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        position: "absolute",
                                        top: -9,
                                        left: 8,
                                        bgcolor: "background.paper",
                                        px: 0.5,
                                    }}
                                >
                                    {label}
                                </Typography>
                                <TextField
                                    size="small"
                                    label="从"
                                    type="date"
                                    value={filters[from]}
                                    onChange={(e) => setFilter(from, e.target.value)}
                                    sx={{ width: 150 }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                                <TextField
                                    size="small"
                                    label="至"
                                    type="date"
                                    value={filters[to]}
                                    onChange={(e) => setFilter(to, e.target.value)}
                                    sx={{ width: 150 }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Box>
                        ))}

                        {activeFilterCount > 0 && (
                            <Button size="small" onClick={() => setFilters(EMPTY_FILTERS)}>
                                清除全部
                            </Button>
                        )}
                    </Box>
                </Paper>
            </Collapse>

            {activeChips.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {activeChips.map((chip) => (
                        <Chip
                            key={chip.label}
                            label={chip.label}
                            size="small"
                            onDelete={chip.onDelete}
                        />
                    ))}
                </Box>
            )}
        </>
    );
}

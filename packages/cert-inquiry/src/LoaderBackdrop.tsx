import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'

export default function LoaderBackdrop() {
    return (
        <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff' }}>
            <CircularProgress color="inherit" />
        </Backdrop>
    )
}

import { useAuthStore } from '../../store/authStore';
import { useVistaAdministradorStore } from '../../store/vistaAdministradorStore';
import ReportesDuenoPage from './ReportesDuenoPage';
import AdminReportesPage from '../administrador/reportes/ReportesPage';

export default function ReportesPage() {
  const { user } = useAuthStore();

  const {
    activo: vistaAdministradorActiva,
    sucursalActivaId,
  } = useVistaAdministradorStore();

  const isDuenoEnVistaAdministrador =
    user?.rol === 'DUENO' &&
    vistaAdministradorActiva &&
    Boolean(sucursalActivaId);

  if (user?.rol === 'DUENO' && !isDuenoEnVistaAdministrador) {
    return <ReportesDuenoPage />;
  }

  return <AdminReportesPage />;
}
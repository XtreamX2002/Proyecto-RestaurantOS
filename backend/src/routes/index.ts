import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { login, me, logout } from '../controllers/auth.controller';
import { getSucursales, getSucursalById, createSucursal, updateSucursal, toggleSucursal, deleteSucursal } from '../controllers/sucursales.controller';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, updateMe, changeMyPassword } from '../controllers/usuarios.controller';
import { getDashboardDueno, getDashboardSucursal } from '../controllers/dashboard.controller';
import { getAsistencias, toggleAsistencia } from '../controllers/asistencias.controller';
import { crearMesa, getMesas, actualizarMesa } from '../controllers/mesa.controller';
import { crearCategoria, listarCategorias, crearProducto, listarProductos, actualizarProducto, eliminarProducto, obtenerProducto, toggleDisponibilidad } from '../controllers/menu.controller';
import { getReporteDueno, getReportes, exportarReporteExcel } from '../controllers/reportes.controller';
import { getPedidosAdmin } from '../controllers/pedidos-admin.controller';
import { getPedidosActivos, crearPedido, agregarItems, marcarEntregado, cobrarPedido, cancelarPedido } from '../controllers/pedidos-mesero.controller';
import { marcarPedidoListo, obtenerPedidosCocina } from '../controllers/pedidos-cocina.controller';

const router = Router();
// Auth
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, me);
router.post('/auth/logout', authMiddleware, logout);

// Dashboard
router.get('/dashboard', authMiddleware, roleMiddleware('DUENO'), getDashboardDueno);
router.get('/dashboard/sucursal/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), getDashboardSucursal);

// Sucursales
router.get('/sucursales', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), getSucursales);
router.get('/sucursales/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), getSucursalById);
router.post('/sucursales', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), createSucursal);
router.patch('/sucursales/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), updateSucursal);
router.patch('/sucursales/:id/toggle', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), toggleSucursal);
router.delete('/sucursales/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), deleteSucursal);


// Usuarios
router.patch('/usuarios/me', authMiddleware, updateMe);
router.patch('/usuarios/me/password', authMiddleware, changeMyPassword);

router.get('/usuarios', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), getUsuarios);
router.post('/usuarios', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), createUsuario);
router.patch('/usuarios/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), updateUsuario);
router.delete('/usuarios/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), deleteUsuario);

// Asistencias
router.get('/asistencias', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), getAsistencias);
router.post('/asistencias/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), toggleAsistencia);

// Reportes
router.get('/reportes/dueno', authMiddleware, roleMiddleware('DUENO'), getReporteDueno);
router.get('/reportes', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), getReportes);
router.get('/reportes/exportar', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), exportarReporteExcel);

// Mesas
router.get('/mesas', authMiddleware, roleMiddleware('DUENO', 'ADMIN', 'MESERO'), getMesas);
router.post('/mesas', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), crearMesa);
router.patch('/mesas/:id', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), actualizarMesa);

// Menu
router.post('/categorias', authMiddleware, roleMiddleware('ADMIN', 'DUENO'), crearCategoria);
router.get('/categorias', authMiddleware, roleMiddleware('ADMIN', 'DUENO', 'MESERO'), listarCategorias);
router.post('/productos', authMiddleware, roleMiddleware('ADMIN', 'DUENO'), crearProducto);
router.get('/productos', authMiddleware, roleMiddleware('ADMIN', 'DUENO', 'MESERO'), listarProductos);

router.get('/productos/:id', authMiddleware, roleMiddleware('ADMIN', 'MESERO'), obtenerProducto);
router.put('/productos/:id', authMiddleware, roleMiddleware('ADMIN'), actualizarProducto);
router.delete('/productos/:id', authMiddleware, roleMiddleware('ADMIN'), eliminarProducto);
router.patch('/productos/:id/toggle', authMiddleware, roleMiddleware('ADMIN'), toggleDisponibilidad);



// Pedidos mesero
router.get('/pedidos/activos', authMiddleware, roleMiddleware('MESERO', 'ADMIN'), getPedidosActivos);
router.post('/pedidos', authMiddleware, roleMiddleware('MESERO'), crearPedido);
router.patch('/pedidos/:id/items', authMiddleware, roleMiddleware('MESERO'), agregarItems);
router.patch('/pedidos/:id/entregar', authMiddleware, roleMiddleware('MESERO'), marcarEntregado);
router.patch('/pedidos/:id/cobrar', authMiddleware, roleMiddleware('MESERO', 'ADMIN'), cobrarPedido);
router.patch('/pedidos/:id/cancelar', authMiddleware, roleMiddleware('MESERO', 'ADMIN'), cancelarPedido);

// Pedidos admin
router.get('/pedidos', authMiddleware, roleMiddleware('DUENO', 'ADMIN'), getPedidosAdmin);

// Cocina
router.get('/pedidos-cocina', authMiddleware, roleMiddleware('COCINERO'), obtenerPedidosCocina);
router.patch('/pedidos-cocina/:id/listo', authMiddleware, roleMiddleware('COCINERO'), marcarPedidoListo);


export default router;

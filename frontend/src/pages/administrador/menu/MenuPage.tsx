import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  ImagePlus,
} from 'lucide-react';
import { api } from '../../../services/api';

interface Categoria {
  id: string;
  nombre: string;
  sucursalId?: string;
  _count?: { productos: number };
}

interface Producto {
  id: string;
  nombre: string;
  disponible: boolean;
  descripcion: string;
  precio: number;
  categoria: {
    id: string;
    nombre: string;
  };
  imagen: string;
  tipo: 'COCINA' | 'COMPLEMENTO';
}

export default function MenuPage() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');

  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalProducto, setModalProducto] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);

  const [nuevaCategoria, setNuevaCategoria] = useState('');

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [productoEditando, setProductoEditando] =
    useState<Producto | null>(null);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoriaId: '',
    imagen: '',
    tipo: 'COCINA' as 'COCINA' | 'COMPLEMENTO',
  });

  const [erroresProducto, setErroresProducto] = useState<string[]>([]);
  const [erroresEdicion, setErroresEdicion] = useState<string[]>([]);

  const cargarCategorias = async () => {
    try {
      const { data } = await api.get<Categoria[]>('/categorias');
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setCategorias([]);
    }
  };

  const cargarProductos = async () => {
    try {
      const { data } = await api.get<Producto[]>('/productos');
      setProductos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setProductos([]);
    }
  };

  useEffect(() => {
    cargarCategorias();
    cargarProductos();
  }, []);

  const crearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;

    await api.post('/categorias', {
      nombre: nuevaCategoria,
      sucursalId: 'sucursal-1',
    });

    setNuevaCategoria('');
    setModalCategoria(false);
    cargarCategorias();
  };

  const crearProducto = async () => {
    const errores: string[] = [];

    if (!nuevoProducto.nombre?.trim()) {
      errores.push('El nombre del producto es obligatorio');
    }

    const precio = Number(nuevoProducto.precio);
    if (!nuevoProducto.precio || isNaN(precio)) {
      errores.push('Ingresa un precio válido');
    } else if (precio <= 0) {
      errores.push('El precio debe ser mayor a 0');
    }

    if (!nuevoProducto.categoriaId) {
      errores.push('Debes seleccionar una categoría');
    }

    if (errores.length > 0) {
      setErroresProducto(errores);
      return;
    }

    try {
      await api.post('/productos', {
        nombre: nuevoProducto.nombre,
        descripcion: nuevoProducto.descripcion || '',
        precio: Number(nuevoProducto.precio),
        imagen: nuevoProducto.imagen,
        categoriaId: nuevoProducto.categoriaId,
        sucursalId: 'sucursal-1',
        tipo: nuevoProducto.tipo,
      });

      setNuevoProducto({
        nombre: '',
        descripcion: '',
        precio: '',
        categoriaId: '',
        imagen: '',
        tipo: 'COCINA',
      });

      setErroresProducto([]);
      setModalProducto(false);
      cargarProductos();
    } catch (error) {
      setErroresProducto(['Error al crear el producto']);
      console.error(error);
    }
  };

  const actualizarProducto = async () => {
    if (!productoEditando) return;

    const errores: string[] = [];

    if (!productoEditando.nombre?.trim()) {
      errores.push('El nombre del producto es obligatorio');
    }

    if (productoEditando.precio <= 0 || isNaN(productoEditando.precio)) {
      errores.push('El precio debe ser mayor a 0');
    }

    if (errores.length > 0) {
      setErroresEdicion(errores);
      return;
    }

    try {
      await api.put(`/productos/${productoEditando.id}`, {
        nombre: productoEditando.nombre,
        descripcion: productoEditando.descripcion || '',
        precio: productoEditando.precio,
        imagen: productoEditando.imagen,
        categoriaId: productoEditando.categoria.id,
        tipo: productoEditando.tipo,
      });

      setErroresEdicion([]);
      setModalEditar(false);
      setProductoEditando(null);
      cargarProductos();
    } catch (error) {
      setErroresEdicion(['Error al actualizar el producto']);
      console.error(error);
    }
  };

  const eliminarProducto = async (id: string) => {
    await api.delete(`/productos/${id}`);
    cargarProductos();
  };

  const cambiarEstadoProducto = async (id: string) => {
    try {
      await api.patch(`/productos/${id}/toggle`);

      setProductos((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
              ...p,
              disponible: !p.disponible,
            }
            : p
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const productosFiltrados = Array.isArray(productos)
    ? productos.filter((p) => {
      const okBusqueda =
        p.nombre
          .toLowerCase()
          .includes(busqueda.toLowerCase());

      const okCategoria =
        categoriaActiva === 'Todos' ||
        p.categoria.nombre === categoriaActiva;

      return okBusqueda && okCategoria;
    })
    : [];

  const comprimirImagen = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = url;
    });
  };

  const exportarMenuPDF = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(24);
    pdf.setTextColor(40, 40, 40);
    pdf.text('MENÚ DEL RESTAURANTE', 105, 20, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      `Generado el ${new Date().toLocaleDateString()}`,
      105,
      28,
      { align: 'center' }
    );

    let y = 40;

    categorias.forEach((categoria) => {
      const productosCategoria = productos.filter(
        (p) => p.categoria.nombre === categoria.nombre
      );

      if (productosCategoria.length === 0) return;

      pdf.setFillColor(249, 115, 22);
      pdf.roundedRect(14, y - 5, 182, 10, 2, 2, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.text(categoria.nombre.toUpperCase(), 18, y + 1);

      y += 10;

      autoTable(pdf, {
        startY: y,
        theme: 'plain',
        head: [['Producto', 'Descripción', 'Precio']],
        body: productosCategoria.map((p) => [
          p.nombre,
          p.descripcion || '-',
          `S/ ${Number(p.precio).toFixed(2)}`
        ]),
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [249, 115, 22],
        },
        columnStyles: {
          2: {
            halign: 'right',
            fontStyle: 'bold',
          },
        },
      });

      y = (pdf as any).lastAutoTable.finalY + 15;
    });
    pdf.save('menu-restaurante.pdf');
  };

  return (
    <div className="p-6 bg-background min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Menú</h1>
          <p className="text-text-muted mt-1">
            Gestiona los productos del restaurante
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportarMenuPDF}
            className="flex items-center gap-2 border border-green-600 text-green-600 px-4 py-2 rounded-xl font-medium hover:bg-green-50">
            <Download size={18} />
            Exportar menú
          </button>
          <button
            onClick={() => setModalCategoria(true)}
            className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-xl font-medium hover:bg-primary/5">
            <Plus size={18} />
            Nueva categoría
          </button>
          <button
            onClick={() => setModalProducto(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90">
            <Plus size={18} />
            Nuevo producto
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full lg:w-[400px] bg-white border border-border rounded-2xl pl-11 pr-4 py-3 outline-none"
        />
      </div>

      {/* CATEGORÍAS */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setCategoriaActiva('Todos')}
          className={`px-5 py-2 rounded-full text-sm font-medium ${categoriaActiva === 'Todos'
            ? 'bg-primary text-white'
            : 'bg-white border border-border'
            }`}
        >
          Todos
        </button>

        {Array.isArray(categorias) &&
          categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaActiva(c.nombre)}
              className={`px-5 py-2 rounded-full text-sm font-medium ${categoriaActiva === c.nombre
                ? 'bg-primary text-white'
                : 'bg-white border border-border'
                }`}
            >
              {c.nombre}
            </button>
          ))}
      </div>

      {/* PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id}
            className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <img src={producto.imagen} className="w-full h-52 object-cover" />

              <div
                className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${producto.tipo === 'COCINA'
                  ? 'bg-orange-500 text-white'
                  : 'bg-blue-500 text-white'
                  }`}
              >
                {producto.tipo === 'COCINA' ? 'Cocina' : 'Complemento'}
              </div>
            </div>

            <div className="p-5">
              <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3">
                {producto.categoria.nombre}
              </span>

              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {producto.nombre}
                  </h2>

                  <span
                    className={`text-xs font-medium ${producto.disponible
                      ? 'text-green-600'
                      : 'text-red-500'
                      }`}
                  >
                    {producto.disponible
                      ? 'Activo'
                      : 'Desactivado'}
                  </span>
                </div>

                <button
                  onClick={() =>
                    cambiarEstadoProducto(producto.id)
                  }
                  className={`
                    relative w-12 h-7 rounded-full transition
                    ${producto.disponible
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`
                      absolute top-1 left-1
                      w-5 h-5 bg-white rounded-full
                      transition-transform
                      ${producto.disponible
                        ? 'translate-x-5'
                        : ''
                      }`}
                  />
                </button>
              </div>

              <p className="text-sm text-text-muted mb-4 line-clamp-2">
                {producto.descripcion}
              </p>

              <span className="text-2xl font-bold text-primary">
                S/ {Number(producto.precio).toFixed(2)}
              </span>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setProductoEditando(producto);
                    setModalEditar(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 border border-primary text-primary py-2.5 rounded-xl"
                >
                  <Pencil size={16} />
                  Editar
                </button>

                <button
                  onClick={() => eliminarProducto(producto.id)}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-500 py-2.5 rounded-xl"
                >
                  <Trash2 size={16} />
                  Borrar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalCategoria && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">
                Nueva categoría
              </h2>

              <button
                onClick={() => setModalCategoria(false)}
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={nuevaCategoria}
              onChange={(e) =>
                setNuevaCategoria(e.target.value)
              }
              className="w-full border border-border rounded-xl px-4 py-3 mb-6 outline-none"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalCategoria(false)}
                className="px-4 py-2 rounded-xl border border-border"
              >
                Cancelar
              </button>

              <button
                onClick={crearCategoria}
                className="px-4 py-2 rounded-xl bg-primary text-white"
              >
                Crear categoría
              </button>
            </div>
          </div>
        </div>
      )}

      {modalProducto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">
                Nuevo producto
              </h2>

              <button
                onClick={() => {
                  setModalProducto(false);
                  setErroresProducto([]);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {erroresProducto.length > 0 && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {erroresProducto.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">
                  Imagen del producto
                </label>

                <label className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary block">
                  <ImagePlus
                    size={36}
                    className="mx-auto mb-3 text-text-muted"
                  />

                  <p className="text-sm text-text-muted mb-3">
                    Haz clic para subir una imagen
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const archivo = e.target.files?.[0];
                      if (archivo) {
                        const base64 = await comprimirImagen(archivo);
                        setNuevoProducto({ ...nuevoProducto, imagen: base64 });
                      }
                    }}
                  />

                  {nuevoProducto.imagen && (
                    <img
                      src={nuevoProducto.imagen}
                      alt="Preview"
                      className="mt-4 w-full h-56 object-cover rounded-xl"
                    />
                  )}
                </label>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Nombre
                </label>

                <input
                  type="text"
                  value={nuevoProducto.nombre}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Precio
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={nuevoProducto.precio}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setNuevoProducto({
                      ...nuevoProducto,
                      precio: valor,
                    });
                  }}
                  placeholder="0.00"
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Categoría
                </label>

                <select
                  value={nuevoProducto.categoriaId}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      categoriaId: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none"
                >
                  <option value="">
                    Seleccionar categoría
                  </option>

                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tipo
                </label>

                <div className="flex gap-5 mt-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={nuevoProducto.tipo === 'COCINA'}
                      onChange={() =>
                        setNuevoProducto({
                          ...nuevoProducto,
                          tipo: 'COCINA',
                        })
                      }
                    />
                    Cocina
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={nuevoProducto.tipo === 'COMPLEMENTO'}
                      onChange={() =>
                        setNuevoProducto({
                          ...nuevoProducto,
                          tipo: 'COMPLEMENTO',
                        })
                      }
                    />
                    Complemento
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">
                  Descripción breve
                </label>

                <textarea
                  rows={4}
                  value={nuevoProducto.descripcion || ''}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      descripcion: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalProducto(false)}
                className="px-4 py-2 rounded-xl border border-border"
              >
                Cancelar
              </button>

              <button
                onClick={crearProducto}
                className="px-4 py-2 rounded-xl bg-primary text-white"
              >
                Crear producto
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEditar && productoEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">
                Editar producto
              </h2>

              <button
                onClick={() => {
                  setModalEditar(false);
                  setProductoEditando(null);
                  setErroresEdicion([]);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {erroresEdicion.length > 0 && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {erroresEdicion.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">
                  Imagen del producto
                </label>

                <label className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary block">
                  <ImagePlus
                    size={36}
                    className="mx-auto mb-3 text-text-muted"
                  />

                  <p className="text-sm text-text-muted mb-3">
                    Cambiar imagen
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const archivo = e.target.files?.[0];
                      if (archivo) {
                        const base64 = await comprimirImagen(archivo);
                        setProductoEditando({ ...productoEditando, imagen: base64 });
                      }
                    }}
                  />

                  {productoEditando.imagen && (
                    <img
                      src={productoEditando.imagen}
                      alt="Preview"
                      className="mt-4 w-full h-56 object-cover rounded-xl"
                    />
                  )}
                </label>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Nombre
                </label>

                <input
                  type="text"
                  value={productoEditando.nombre}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Precio
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={productoEditando.precio}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      precio: Number(e.target.value),
                    })
                  }
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Categoría
                </label>

                <select
                  value={productoEditando.categoria.id}
                  onChange={(e) => {
                    const categoriaSeleccionada = categorias.find(
                      (c) => c.id === e.target.value
                    );
                    if (categoriaSeleccionada) {
                      setProductoEditando({
                        ...productoEditando,
                        categoria: categoriaSeleccionada,
                      });
                    }
                  }}
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none"
                >
                  {Array.isArray(categorias) &&
                    categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tipo
                </label>

                <div className="flex gap-5 mt-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={productoEditando.tipo === 'COCINA'}
                      onChange={() =>
                        setProductoEditando({
                          ...productoEditando,
                          tipo: 'COCINA',
                        })
                      }
                    />
                    Cocina
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={productoEditando.tipo === 'COMPLEMENTO'}
                      onChange={() =>
                        setProductoEditando({
                          ...productoEditando,
                          tipo: 'COMPLEMENTO',
                        })
                      }
                    />
                    Complemento
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">
                  Descripción breve
                </label>

                <textarea
                  rows={4}
                  value={productoEditando.descripcion || ''}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      descripcion: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setModalEditar(false);
                  setProductoEditando(null);
                }}
                className="px-4 py-2 rounded-xl border border-border"
              >
                Cancelar
              </button>

              <button
                onClick={actualizarProducto}
                className="px-4 py-2 rounded-xl bg-primary text-white"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}